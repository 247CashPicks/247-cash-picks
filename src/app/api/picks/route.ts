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
import { visible_selections } from '@/lib/picks/visible_selections'
import { easternToday } from '@/lib/time/eastern'
import { marketSourcePolicy } from '@/lib/market-source-policy'

// GET /api/picks?date=2026-05-12
// Returns the league-native published window, filtered to subscriber tier.
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? 'core') as TierSlug

  const anchor = req.nextUrl.searchParams.get('date')
    || easternToday()

  const sport = sportFromRequest(req)
  const supabase = createServiceClient()
  let data
  try {
    data = await visible_selections(supabase, sport, anchor)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Signal read failed' },
      { status: 500 },
    )
  }

  const filtered = (data || []).filter(pick =>
    canAccess(tier, pick.tier_required as TierSlug)
  )
  const eligible = filtered.filter(pick =>
    marketSourcePolicy(pick.platform).executionEligible
  )

  // Core cap: 3 picks max
  const picks = tier === 'core' ? eligible.slice(0, 3) : eligible

  return NextResponse.json({ picks, tier, total: eligible.length })
}

// POST /api/picks — operator actions (add to selections, publish all)
export async function POST(req: NextRequest) {
  // Manual staging is operator-only. Confirmation/publication is not exposed
  // here; the owner-only /command flow owns that decision end to end.
  const denied = await guardOperatorRoute()
  if (denied) return denied
  const { userId: operatorUserId } = await auth()

  const body = await req.formData().catch(() => null)
  const jsonBody = body ? null : await req.json().catch(() => null)

  const action = (body?.get('action') as string | null) || jsonBody?.action
  const sport = sportFromRequest(req)
  const supabase = createServiceClient()

  // Confirmation and publication intentionally do not live here. /command
  // calls the owner-only backend operation that performs both in one request.
  if (action === 'confirm' || action === 'unconfirm' || action === 'publish_all') {
    return NextResponse.json(
      { error: 'Selection confirmation has moved to /command.' },
      { status: 410 },
    )
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

  const { data: candidateLines } = await supabase
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
    .limit(100)

  const blockedLines = (candidateLines || []).filter(candidate =>
    !marketSourcePolicy(candidate.platform).executionEligible
  )
  const line = (candidateLines || []).find(candidate =>
    marketSourcePolicy(candidate.platform).executionEligible
  )

  if (blockedLines.length > 0) {
    await supabase.from('picks_indicator_audit').insert({
      brand_id: BRAND.slug,
      config_id: null,
      indicator_key: 'wagering_source_policy',
      event: 'preview_run',
      old_value: null,
      new_value: {
        diagnostic: 'wagering_source_execution_blocked',
        source: marketSourcePolicy(blockedLines[0].platform).source,
        classification: marketSourcePolicy(blockedLines[0].platform).classification,
        operation: 'manual_ranking_excluded',
        context: {
          projection_id: projectionId,
          player_name: playerName,
          rows_blocked: blockedLines.length,
        },
        policy_version: marketSourcePolicy(blockedLines[0].platform).policyVersion,
      },
      actor: operatorUserId || 'operator_route',
      note: marketSourcePolicy(blockedLines[0].platform).label,
    })
  }

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
      { error: 'No eligible market line for this player, so there is no stat '
             + 'to stage against. Run the lines agent first.' }, { status: 409 })
  }

  const sourcePolicy = marketSourcePolicy(line.platform)
  if (!sourcePolicy.executionEligible) {
    await supabase.from('picks_indicator_audit').insert({
      brand_id: BRAND.slug,
      config_id: null,
      indicator_key: 'wagering_source_policy',
      event: 'preview_run',
      old_value: null,
      new_value: {
        diagnostic: 'wagering_source_execution_blocked',
        source: sourcePolicy.source,
        classification: sourcePolicy.classification,
        operation: 'manual_stage_blocked',
        context: { projection_id: projectionId, player_name: playerName },
        policy_version: sourcePolicy.policyVersion,
      },
      actor: operatorUserId || 'operator_route',
      note: sourcePolicy.label,
    })
    return NextResponse.json({
      error: `${line.platform || 'This source'} is not an approved execution venue.`,
      source_policy: sourcePolicy,
    }, { status: 409 })
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
