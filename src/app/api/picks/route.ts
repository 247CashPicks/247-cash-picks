import { NextRequest, NextResponse } from 'next/server'
import { guardOperatorRoute } from '@/lib/auth/guards'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
import { sportFromRequest } from '@/lib/sport/request'
import { projectionForStat, isProjectedStat } from '@/lib/picks/stats'
import type { TierSlug } from '@/lib/picks/types'

// GET /api/picks?date=2026-05-12
// Returns published picks for the date, filtered to subscriber tier
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? 'core') as TierSlug

  const date = req.nextUrl.searchParams.get('date')
    || new Date().toISOString().split('T')[0]

  const sport = sportFromRequest(req)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('picks_published')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('game_date', date)
    .order('display_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const filtered = (data || []).filter(pick =>
    canAccess(tier, pick.tier_required as TierSlug)
  )

  // Core cap: 3 picks max
  const picks = tier === 'core' ? filtered.slice(0, 3) : filtered

  return NextResponse.json({ picks, tier, total: data?.length || 0 })
}

// POST /api/picks — operator actions (add to selections, publish all)
export async function POST(req: NextRequest) {
  // This endpoint had NO auth of any kind. `publish_all` promotes confirmed
  // selections into picks_published and is what subscribers pay to read, so
  // an anonymous caller could publish the slate. Operator tier, same gate as
  // the dashboard pages that post to it.
  const denied = await guardOperatorRoute()
  if (denied) return denied

  const body = await req.formData().catch(() => null)
  const jsonBody = body ? null : await req.json().catch(() => null)

  const action = (body?.get('action') as string | null) || jsonBody?.action
  const sport = sportFromRequest(req)
  const supabase = createServiceClient()

  // Stage a selection for release: pending -> confirmed. The backend's
  // picks_publisher promotes confirmed -> published; this is the operator's
  // half of that handshake and the only step a human makes.
  if (action === 'confirm' || action === 'unconfirm') {
    const selectionId =
      (body?.get('selection_id') as string | null) || jsonBody?.selection_id
    if (!selectionId) {
      return NextResponse.json({ error: 'selection_id required' }, { status: 400 })
    }

    const next = action === 'confirm' ? 'confirmed' : 'pending'
    const from = action === 'confirm' ? 'pending' : 'confirmed'

    const { data: updated, error: confirmErr } = await supabase
      .from('picks_selections')
      .update({
        status: next,
        confirmed_at: action === 'confirm' ? new Date().toISOString() : null,
      })
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .eq('id', selectionId)
      // Only move a row that is in the expected state. Without this, a double
      // submit could walk an already-published row back to confirmed and
      // republish it.
      .eq('status', from)
      .select('id')

    if (confirmErr) {
      return NextResponse.json({ error: confirmErr.message }, { status: 500 })
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: `No ${from} selection with that id — it may already have been `
               + `actioned.` }, { status: 409 })
    }

    // Server-rendered form post: send the operator back to the page, which
    // re-queries and shows the row in its new state.
    return NextResponse.redirect(new URL('/dashboard/publish', req.url), 303)
  }

  // Publish all confirmed picks
  if (action === 'publish_all') {
    const { data: confirmed } = await supabase
      .from('picks_selections')
      .select('*')
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      // No game_date filter. NFL selections span a whole week (a Week 1 run
      // stages 09-09 through 09-14), so a `= today` sweep published nothing
      // for NFL on five days out of six. This also matches the backend
      // publisher's own semantics: omit the date and it sweeps whatever is
      // ready. For NBA, confirmed rows are same-day anyway, so nothing about
      // the existing flow changes.
      .eq('status', 'confirmed')

    if (!confirmed || confirmed.length === 0) {
      return NextResponse.json({ error: 'No confirmed picks to publish' }, { status: 400 })
    }

    const publishedRows = confirmed.map((s) => ({
      brand_id: BRAND.slug,
      // NOT NULL on picks_published. Carried from the selection rather than
      // from `sport`, so a row can never be published under a league other
      // than the one it was selected for.
      league: s.league ?? sport,
      selection_id: s.id,
      game_date: s.game_date,
      game_id: s.game_id,
      player_name: s.player_name,
      team: s.team,
      stat_type: s.stat_type,
      line: s.line,
      our_projection: s.our_projection,
      direction: s.direction,
      confidence: s.confidence,
      tier_required: s.tier_required,
      platform: s.platform,
      operator_notes: s.operator_notes,
      display_order: s.display_order,
      result: 'pending',
    }))

    const { error: insertError } = await supabase
      .from('picks_published')
      .insert(publishedRows)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await supabase
      .from('picks_selections')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .eq('status', 'confirmed')

    // Trigger the backend publisher.
    //
    // This called ${BACKEND_URL}/publisher/fire, which does not exist. The real
    // route is POST /agents/picks-publisher/run, it takes date and league as
    // QUERY parameters rather than a JSON body, and it is Bearer-gated on
    // CRON_SECRET. Because the call sits in a try/catch marked non-fatal, it
    // has been 404ing silently on every publish — the rows went out, the
    // backend sweep never ran.
    //
    // The date is deliberately omitted: the publisher sweeps every confirmed
    // selection when given none, which is what a multi-date NFL slate needs,
    // and it is idempotent so a re-run never double-publishes.
    const backendUrl = process.env.BACKEND_URL
    if (backendUrl) {
      try {
        const url = new URL(`${backendUrl}/agents/picks-publisher/run`)
        url.searchParams.set('league', sport)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'X-Brand-Id': BRAND.slug,
          },
        })
        if (!res.ok) {
          // Log the status. The previous silent catch is how a 404 survived.
          console.error('Publisher returned', res.status, await res.text())
        }
      } catch (e) {
        console.error('Publisher trigger failed:', e)
        // Non-fatal — rows are published; the sweep can be re-run by hand.
      }
    }

    return NextResponse.json({
      published: confirmed.length,
      message: `${confirmed.length} picks published successfully`,
    })
  }

  // Add projection to selections queue
  const projectionId = (body?.get('projection_id') as string | null) || jsonBody?.projection_id
  const playerName   = (body?.get('player_name')   as string | null) || jsonBody?.player_name

  if (!projectionId || !playerName) {
    return NextResponse.json({ error: 'projection_id and player_name required' }, { status: 400 })
  }

  const { data: proj } = await supabase
    .from('picks_projections')
    .select('*')
    .eq('id', projectionId)
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .single()

  if (!proj) {
    return NextResponse.json({ error: 'Projection not found' }, { status: 404 })
  }

  const { data: line } = await supabase
    .from('picks_lines')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('player_name', playerName)
    // The PROJECTION's date, not today's. An NFL projection staged on a
    // Wednesday is for a game on Sunday, so a `= today` match found no line
    // and the whole add failed. Same defect the backend selector carried.
    .eq('game_date', proj.game_date)
    .order('edge_pct', { ascending: false })
    .limit(1)
    .single()

  // Was: stat_type 'pts', line/our_projection from proj.proj_pts. All three
  // are NBA-only. Under NFL proj_pts is NULL, and picks_selections
  // .our_projection is NOT NULL, so staging an NFL projection did not degrade
  // — it failed the insert outright with a 23502.
  //
  // The stat now comes from the market line, and the projection is derived
  // from whichever picks_projections columns that stat is made of, the same
  // mapping the backend's lines agent uses.
  if (!line?.stat_type) {
    return NextResponse.json(
      { error: 'No market line for this player, so there is no stat to stage '
             + 'against. Run the lines agent first.' }, { status: 409 })
  }

  const ourProjection = projectionForStat(proj, line.stat_type)
  if (ourProjection == null) {
    return NextResponse.json(
      { error: `No projection exists for ${line.stat_type}`
             + (isProjectedStat(line.stat_type) ? '.'
               : ' — the engine does not project this stat, so it carries no '
               + 'edge and cannot be staged.') }, { status: 409 })
  }

  const { error: selError } = await supabase
    .from('picks_selections')
    .insert({
      brand_id: BRAND.slug,
      league: sport,          // NOT NULL on picks_selections
      // The GAME's date. One NFL slate spans several, and a selection written
      // under the run date would never match the game it belongs to.
      game_date: proj.game_date,
      game_id: proj.game_id,
      player_name: proj.player_name,
      team: proj.team,
      stat_type: line.stat_type,
      line: line.line,
      our_projection: ourProjection,
      direction: line.recommended_side || 'over',
      edge_pct: line.edge_pct ?? null,
      confidence: proj.confidence_score >= 80 ? 'high'
        : proj.confidence_score >= 60 ? 'medium' : 'low',
      tier_required: 'core',
      platform: line.platform || 'market',
      status: 'pending',
      display_order: 0,
    })

  if (selError) {
    return NextResponse.json({ error: selError.message }, { status: 500 })
  }

  return NextResponse.json({ added: true, player: playerName })
}
