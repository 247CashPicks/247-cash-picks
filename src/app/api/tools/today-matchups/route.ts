import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
import type { TierSlug } from '@/lib/picks/types'

interface MatchupDbRow {
  player_name: string
  player_team: string
  defender_name: string | null
  defender_team: string | null
  game_id: string | null
  player_height_in: number | null
  player_weight_lbs: number | null
  defender_height_in: number | null
  defender_weight_lbs: number | null
  weight_mismatch_lbs: number | null
  weight_boost_pct: number | null
  weight_boost_applied: boolean | null
  defender_percentile: number | null
  opponent_pace: number | null
  opponent_def_rating: number | null
  opp_rebs_allowed: number | null
  opp_ast_allowed: number | null
}

interface StatsRow {
  player_name: string
  team: string
  position: string | null
  per36_pts: number | null
  per36_reb: number | null
  per36_ast: number | null
  per36_stl: number | null
  per36_blk: number | null
  per36_tpm: number | null
  avg_minutes: number | null
}

interface GameRow {
  id: string
  home_team: string
  away_team: string
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wallet = await getWalletForUser(userId)
  const tier   = (wallet?.tier_slug ?? null) as TierSlug | null

  if (!canAccess(tier, 'vector')) {
    return NextResponse.json({ error: 'Vector tier or higher required' }, { status: 403 })
  }

  const dateParam = req.nextUrl.searchParams.get('date') ?? ''
  const date      = dateParam || new Date().toISOString().split('T')[0]

  const supabase = createServiceClient()

  // 1. All matchups for the date
  const { data: matchupsRaw, error: matchupErr } = await supabase
    .from('picks_matchups')
    .select(
      'player_name, player_team, defender_name, defender_team, game_id, ' +
      'player_height_in, player_weight_lbs, defender_height_in, defender_weight_lbs, ' +
      'weight_mismatch_lbs, weight_boost_pct, weight_boost_applied, defender_percentile, ' +
      'opponent_pace, opponent_def_rating, opp_rebs_allowed, opp_ast_allowed'
    )
    .eq('brand_id', BRAND.slug)
    .eq('game_date', date)

  if (matchupErr) return NextResponse.json({ error: matchupErr.message }, { status: 500 })

  const matchups = (matchupsRaw ?? []) as unknown as MatchupDbRow[]
  if (!matchups.length) return NextResponse.json({ found: false, games: [], date })

  // 2. Per-36 season stats for offensive players
  const playerNames = [...new Set(matchups.map(m => m.player_name))]
  const { data: statsRaw } = await supabase
    .from('nba_players_reference')
    .select(
      'player_name, team, position, per36_pts, per36_reb, per36_ast, ' +
      'per36_stl, per36_blk, per36_tpm, avg_minutes'
    )
    .eq('brand_id', BRAND.slug)
    .in('player_name', playerNames)

  const statsRows = (statsRaw ?? []) as unknown as StatsRow[]
  // Build lookup: first row wins, then overwrite with the team-matched row for traded players
  const currentTeam = new Map(matchups.map(m => [m.player_name, m.player_team]))
  const statsMap    = new Map<string, StatsRow>()
  for (const row of statsRows) {
    if (!statsMap.has(row.player_name)) statsMap.set(row.player_name, row)
  }
  for (const row of statsRows) {
    if (row.team === currentTeam.get(row.player_name)) statsMap.set(row.player_name, row)
  }

  // 3. Game info for home/away labels
  const gameIds = [...new Set(
    matchups.map(m => m.game_id).filter((id): id is string => id != null)
  )]
  let gameInfoMap = new Map<string, GameRow>()
  if (gameIds.length) {
    const { data: gamesRaw } = await supabase
      .from('picks_games')
      .select('id, home_team, away_team')
      .eq('brand_id', BRAND.slug)
      .in('id', gameIds)
    for (const g of (gamesRaw ?? []) as GameRow[]) {
      gameInfoMap.set(g.id, g)
    }
  }

  // 4. Enrich and group by game
  type OutMatchup = MatchupDbRow & {
    position: string | null
    per36_pts: number | null; per36_reb: number | null; per36_ast: number | null
    per36_stl: number | null; per36_blk: number | null; per36_tpm: number | null
    avg_minutes: number | null
  }
  interface OutGame {
    game_id: string; home_team: string; away_team: string; matchups: OutMatchup[]
  }

  const grouped = new Map<string, OutGame>()

  for (const m of matchups) {
    const key  = m.game_id ?? `${m.player_team}_${m.defender_team}`
    const info = m.game_id ? (gameInfoMap.get(m.game_id) ?? null) : null

    if (!grouped.has(key)) {
      grouped.set(key, {
        game_id:   key,
        home_team: info?.home_team ?? m.player_team  ?? '',
        away_team: info?.away_team ?? m.defender_team ?? '',
        matchups:  [],
      })
    }

    const s = statsMap.get(m.player_name) ?? null
    grouped.get(key)!.matchups.push({
      ...m,
      position:    s?.position    ?? null,
      per36_pts:   s?.per36_pts   ?? null,
      per36_reb:   s?.per36_reb   ?? null,
      per36_ast:   s?.per36_ast   ?? null,
      per36_stl:   s?.per36_stl   ?? null,
      per36_blk:   s?.per36_blk   ?? null,
      per36_tpm:   s?.per36_tpm   ?? null,
      avg_minutes: s?.avg_minutes ?? null,
    })
  }

  return NextResponse.json({
    found: true,
    date,
    games: [...grouped.values()],
  })
}
