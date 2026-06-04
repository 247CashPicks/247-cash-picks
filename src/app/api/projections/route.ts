import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

// GET /api/projections?date=2026-05-12&player=luka
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()

  const date = req.nextUrl.searchParams.get('date')
    || new Date().toISOString().split('T')[0]
  const playerQuery = req.nextUrl.searchParams.get('player')

  let query = supabase
    .from('picks_projections')
    .select(`
      id, player_name, team, position, is_starter,
      projected_minutes, proj_pts, proj_reb, proj_ast,
      proj_stl, proj_blk, proj_3pm,
      confidence_score, data_quality_flags,
      game_id, game_date
    `)
    .eq('brand_id', BRAND.slug)
    .eq('game_date', date)
    .order('confidence_score', { ascending: false })

  if (playerQuery) {
    query = query.ilike('player_name', `%${playerQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const playerNames = (data || []).map(p => p.player_name)

  const { data: matchups } = await supabase
    .from('picks_matchups')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('game_date', date)
    .in('player_name', playerNames)

  const matchupMap = new Map(
    (matchups || []).map(m => [m.player_name, m])
  )

  const enriched = (data || []).map(proj => ({
    ...proj,
    matchup: matchupMap.get(proj.player_name) || null,
  }))

  return NextResponse.json({ projections: enriched, date })
}
