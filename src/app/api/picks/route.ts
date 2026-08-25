import { NextRequest, NextResponse } from 'next/server'
import { guardOperatorRoute } from '@/lib/auth/guards'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
import { sportFromRequest } from '@/lib/sport/request'
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
  const today = new Date().toISOString().split('T')[0]

  // Publish all confirmed picks
  if (action === 'publish_all') {
    const { data: confirmed } = await supabase
      .from('picks_selections')
      .select('*')
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .eq('game_date', today)
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
      .eq('game_date', today)
      .eq('status', 'confirmed')

    // Trigger Herald + Messenger via Railway backend
    const backendUrl = process.env.BACKEND_URL
    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/publisher/fire`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'X-Brand-Id': BRAND.slug,
          },
          body: JSON.stringify({
            brand_id: BRAND.slug,
            league: sport,
            game_date: today,
            pick_count: confirmed.length,
          }),
        })
      } catch (e) {
        console.error('Publisher trigger failed:', e)
        // Non-fatal — picks are published, delivery will retry
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
    .eq('game_date', today)
    .order('edge_pct', { ascending: false })
    .limit(1)
    .single()

  const { error: selError } = await supabase
    .from('picks_selections')
    .insert({
      brand_id: BRAND.slug,
      league: sport,          // NOT NULL on picks_selections
      game_date: today,
      game_id: proj.game_id,
      player_name: proj.player_name,
      team: proj.team,
      stat_type: line?.stat_type || 'pts',
      line: line?.line || proj.proj_pts,
      our_projection: proj.proj_pts,
      direction: line?.recommended_side || 'over',
      edge_pct: line?.edge_pct || null,
      confidence: proj.confidence_score >= 80 ? 'high'
        : proj.confidence_score >= 60 ? 'medium' : 'low',
      tier_required: 'core',
      platform: line?.platform || 'prizepicks',
      status: 'pending',
      display_order: 0,
    })

  if (selError) {
    return NextResponse.json({ error: selError.message }, { status: 500 })
  }

  return NextResponse.json({ added: true, player: playerName })
}
