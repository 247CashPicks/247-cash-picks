import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { guardRoute, sessionTier } from '@/lib/auth/guards'
import { TOOL_MIN_TIERS } from '@/lib/picks/tiers'
import { runProjection } from '@/lib/picks/model'
import { BRAND } from '@/config/brand'
import { sportFromRequest } from '@/lib/sport/request'
import type { ProjectionInputs } from '@/lib/picks/types'
import { easternToday } from '@/lib/time/eastern'

export async function POST(req: NextRequest) {
  // NOT in the recon's list of four holes, but the same class: this route had
  // login only. TOOL_MIN_TIERS.projection_runner is 'analyst' and the tools
  // page renders the runner locked below that, so any signed-in free-tier
  // account could still POST here and get a projection. The bare
  // `tier !== 'nexus'` check further down guards only the league-average
  // OVERRIDE, never entry to the route.
  const denied = await guardRoute(
    TOOL_MIN_TIERS.projection_runner, 'Analyst tier or higher required')
  if (denied) return denied

  const { userId, tier } = await sessionTier()

  const sport = sportFromRequest(req)
  const supabase = createServiceClient()

  const body = await req.json()
  const {
    inputs,
    playerName,
    gameDate,
    gameId,
    agentValues,
    fieldsOverridden = [],
  }: {
    inputs: ProjectionInputs
    playerName?: string
    gameDate?: string
    gameId?: string
    agentValues?: Record<string, number>
    fieldsOverridden?: string[]
  } = body

  if (!inputs) {
    return NextResponse.json({ error: 'inputs required' }, { status: 400 })
  }

  // Nexus-only: league average overrides
  if (
    (inputs.leagueAvgPace || inputs.leagueAvgDef ||
     inputs.leagueAvgRebsAllowed || inputs.leagueAvgAstAllowed) &&
    tier !== 'nexus'
  ) {
    return NextResponse.json({
      error: 'Custom league average overrides require Nexus tier',
      requiredTier: 'nexus',
    }, { status: 403 })
  }

  const output = runProjection(inputs)

  const inputSource = fieldsOverridden.length === 0
    ? 'agent_prefill'
    : agentValues ? 'mixed' : 'subscriber_override'

  const today = gameDate || easternToday()

  const { data: session } = await supabase
    .from('picks_tool_sessions')
    .insert({
      brand_id: BRAND.slug,
      clerk_user_id: userId,
      tier_slug: tier,
      tool_used: 'projection_runner',
      game_date: today,
      player_name: playerName || null,
      game_id: gameId || null,
      input_source: inputSource,
      fields_overridden: fieldsOverridden,
      proj_pts: output.projPts,
      proj_reb: output.projReb,
      proj_ast: output.projAst,
      fpace: output.fpace,
      fdef: output.fdef,
      reb_suppression: output.rebSuppression,
      session_saved: false,
    })
    .select('id')
    .single()

  const sessionId = session?.id

  if (sessionId) {
    await supabase.from('picks_custom_inputs').insert({
      brand_id: BRAND.slug,
      clerk_user_id: userId,
      session_id: sessionId,
      game_date: today,
      player_name: playerName || 'Unknown',
      agent_minutes: agentValues?.projectedMinutes || null,
      subscriber_minutes: fieldsOverridden.includes('projectedMinutes')
        ? inputs.projectedMinutes : null,
      agent_per36_pts: agentValues?.per36_pts || null,
      subscriber_per36_pts: fieldsOverridden.includes('per36_pts')
        ? inputs.per36.pts : null,
      agent_per36_reb: agentValues?.per36_reb || null,
      subscriber_per36_reb: fieldsOverridden.includes('per36_reb')
        ? inputs.per36.reb : null,
      agent_per36_ast: agentValues?.per36_ast || null,
      subscriber_per36_ast: fieldsOverridden.includes('per36_ast')
        ? inputs.per36.ast : null,
      agent_opp_pace: agentValues?.opponentPace || null,
      subscriber_opp_pace: fieldsOverridden.includes('opponentPace')
        ? inputs.opponentPace : null,
      agent_opp_def_rating: agentValues?.opponentDefRating || null,
      subscriber_opp_def_rating: fieldsOverridden.includes('opponentDefRating')
        ? inputs.opponentDefRating : null,
      agent_opp_rebs_allowed: agentValues?.oppRebsAllowed || null,
      subscriber_opp_rebs_allowed: fieldsOverridden.includes('oppRebsAllowed')
        ? inputs.oppRebsAllowed : null,
      agent_indiv_rebs_per36: agentValues?.indivRebsPer36 || null,
      subscriber_indiv_rebs_per36: fieldsOverridden.includes('indivRebsPer36')
        ? inputs.indivRebsPer36 : null,
      agent_opp_ast_allowed: agentValues?.oppAstAllowed || null,
      subscriber_opp_ast_allowed: fieldsOverridden.includes('oppAstAllowed')
        ? inputs.oppAstAllowed : null,
      computed_fpace: output.fpace,
      computed_fdef: output.fdef,
      computed_reb_suppression: output.rebSuppression,
      output_proj_pts: output.projPts,
      output_proj_reb: output.projReb,
      output_proj_ast: output.projAst,
    })
  }

  // Fetch live lines for edge comparison
  const { data: lines } = await supabase
    .from('picks_lines')
    .select('stat_type, line, platform')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('player_name', playerName || '')
    .eq('game_date', today)

  const edges: Record<string, {
    line: number; edge: number; edgePct: number; side: string; platform: string
  }> = {}

  if (lines) {
    const projMap: Record<string, number> = {
      pts: output.projPts,
      reb: output.projReb,
      ast: output.projAst,
    }
    lines.forEach(l => {
      const proj = projMap[l.stat_type]
      if (proj !== undefined) {
        const edge = proj - l.line
        edges[l.stat_type] = {
          line: l.line,
          edge: Math.round(edge * 10) / 10,
          edgePct: Math.round((edge / l.line) * 1000) / 10,
          side: edge > 0 ? 'over' : 'under',
          platform: l.platform,
        }
      }
    })
  }

  return NextResponse.json({
    sessionId,
    output,
    edges,
    inputSource,
    fieldsOverridden,
  })
}
