import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { guardRoute, sessionTier } from '@/lib/auth/guards'
import { TOOL_MIN_TIERS } from '@/lib/picks/tiers'
import { statsFor } from '@/lib/picks/stats'
import { BRAND } from '@/config/brand'
import { sportFromRequest } from '@/lib/sport/request'

export async function POST(req: NextRequest) {
  // Checked login but never the tier. TOOL_MIN_TIERS.backtester is 'nexus',
  // and the tools page renders it as locked below that — so the UI claimed a
  // gate the API did not enforce.
  const denied = await guardRoute(
    TOOL_MIN_TIERS.backtester, 'Nexus tier required')
  if (denied) return denied

  // Re-read for the session log below. guardRoute has already established that
  // userId is non-null and the tier clears nexus.
  const { userId, tier } = await sessionTier()

  const supabase = createServiceClient()

  const sport = sportFromRequest(req)
  const { dateFrom, dateTo, statFilter, confFilter } = await req.json()

  let query = supabase
    .from('picks_published')
    .select('player_name, stat_type, line, direction, our_projection, result, actual_value, confidence, game_date')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .neq('result', 'pending')
    .neq('result', 'void')

  if (dateFrom)                         query = query.gte('game_date', dateFrom)
  if (dateTo)                           query = query.lte('game_date', dateTo)
  if (statFilter && statFilter !== 'all') query = query.eq('stat_type', statFilter)
  if (confFilter && confFilter !== 'all') query = query.eq('confidence', confFilter)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const picks = data || []
  const resolved = picks.filter(p => p.result === 'hit' || p.result === 'miss')
  const hits = resolved.filter(p => p.result === 'hit')

  const hitRate = resolved.length > 0
    ? Math.round((hits.length / resolved.length) * 1000) / 10
    : 0

  const edgeValues = picks
    .filter(p => p.our_projection != null && p.line != null)
    .map(p => Math.abs((p.our_projection - p.line) / p.line * 100))
  const avgEdge = edgeValues.length > 0
    ? Math.round(edgeValues.reduce((a, b) => a + b, 0) / edgeValues.length * 10) / 10
    : 0

  const errorValues = picks
    .filter(p => p.actual_value != null && p.our_projection != null)
    .map(p => Math.abs(p.actual_value - p.our_projection))
  const avgError = errorValues.length > 0
    ? Math.round(errorValues.reduce((a, b) => a + b, 0) / errorValues.length * 10) / 10
    : 0

  const byConfidence: Record<string, { hits: number; total: number; rate: number }> = {}
  for (const conf of ['high', 'medium', 'low']) {
    const group = resolved.filter(p => p.confidence === conf)
    const groupHits = group.filter(p => p.result === 'hit')
    byConfidence[conf] = {
      hits: groupHits.length,
      total: group.length,
      rate: group.length > 0
        ? Math.round((groupHits.length / group.length) * 1000) / 10
        : 0,
    }
  }

  const byStat: Record<string, { hits: number; total: number; rate: number }> = {}
  // Was hardcoded ['pts','reb','ast'] — three of the NBA's seven, and none of
  // the NFL's five. Driven by the sport's vocabulary now, so an NFL backtest
  // reports rec_yds/receptions/rush_yds/... instead of three empty buckets.
  for (const stat of statsFor(sport)) {
    const group = resolved.filter(p => p.stat_type === stat)
    const groupHits = group.filter(p => p.result === 'hit')
    byStat[stat] = {
      hits: groupHits.length,
      total: group.length,
      rate: group.length > 0
        ? Math.round((groupHits.length / group.length) * 1000) / 10
        : 0,
    }
  }

  const byPlayer: Record<string, { hits: number; total: number }> = {}
  resolved.forEach(p => {
    if (!byPlayer[p.player_name]) byPlayer[p.player_name] = { hits: 0, total: 0 }
    byPlayer[p.player_name].total++
    if (p.result === 'hit') byPlayer[p.player_name].hits++
  })

  const playerStats = Object.entries(byPlayer)
    .filter(([, v]) => v.total >= 3)
    .map(([name, v]) => ({
      name,
      hits: v.hits,
      total: v.total,
      rate: Math.round((v.hits / v.total) * 1000) / 10,
    }))
    .sort((a, b) => b.rate - a.rate)

  await supabase.from('picks_tool_sessions').insert({
    brand_id: BRAND.slug,
    clerk_user_id: userId,
    tier_slug: tier,
    tool_used: 'backtester',
    game_date: dateFrom || new Date().toISOString().split('T')[0],
    session_saved: false,
    input_source: 'agent_prefill',
  })

  return NextResponse.json({
    totalPicks: picks.length,
    resolved: resolved.length,
    hits: hits.length,
    misses: resolved.length - hits.length,
    hitRate,
    avgEdge,
    avgProjectionError: avgError,
    byConfidence,
    byStat,
    topPlayers: playerStats.slice(0, 5),
    weakPlayers: playerStats.slice(-3).reverse(),
  })
}
