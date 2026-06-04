import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { TierSlug } from '@/lib/picks/types'

const BRAND_ID = '247cashpicks'

export async function POST(req: NextRequest) {
  const userId = 'preview-user'
  const tier = 'vector' as TierSlug
  void tier

  const supabase = createServiceClient()

  const { dateFrom, dateTo, statFilter, confFilter } = await req.json()

  let query = supabase
    .from('picks_published')
    .select('player_name, stat_type, line, direction, our_projection, result, actual_value, confidence, game_date')
    .eq('brand_id', BRAND_ID)
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
  for (const stat of ['pts', 'reb', 'ast']) {
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
    brand_id: BRAND_ID,
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
