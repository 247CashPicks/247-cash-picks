import { NextRequest, NextResponse } from 'next/server'
import { guardRoute } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'
import { sportFromRequest } from '@/lib/sport/request'
import { latestLiveProjections } from '@/lib/picks/projections'
import { easternToday } from '@/lib/time/eastern'

// GET /api/projections?date=2026-05-12&player=luka
export async function GET(req: NextRequest) {
  // Was fully public: the whole projection slate, the core paid product,
  // readable by anyone who knew the path. Gated at 'signal', the tier whose
  // TIER_FEATURES entry actually grants projection_viewer. No in-app caller
  // exists (verified by grep), so this closes an open door rather than
  // changing a working flow.
  const denied = await guardRoute('signal', 'Signal tier or higher required')
  if (denied) return denied

  const sport = sportFromRequest(req)
  const supabase = createServiceClient()

  const date = req.nextUrl.searchParams.get('date')
    || easternToday()
  const playerQuery = req.nextUrl.searchParams.get('player')

  let query = supabase
    .from('picks_projections')
    .select(`
      id, created_at, player_name, team, position, is_starter,
      projected_minutes, proj_pts, proj_reb, proj_ast,
      proj_stl, proj_blk, proj_3pm,
      proj_targets, proj_receptions, proj_rec_yds,
      proj_carries, proj_rush_yds, proj_pass_yds,
      confidence_score, data_quality_flags,
      game_id, game_date
    `)
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('run_label', 'live')
    .eq('game_date', date)
    .order('confidence_score', { ascending: false })

  if (playerQuery) {
    query = query.ilike('player_name', `%${playerQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projections = latestLiveProjections(data || [])
  const playerNames = projections.map(p => p.player_name)

  const { data: matchups } = await supabase
    .from('picks_matchups')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('game_date', date)
    .in('player_name', playerNames)

  const matchupMap = new Map(
    (matchups || []).map(m => [m.player_name, m])
  )

  const enriched = projections.map(proj => ({
    ...proj,
    matchup: matchupMap.get(proj.player_name) || null,
  }))

  return NextResponse.json({ projections: enriched, date })
}
