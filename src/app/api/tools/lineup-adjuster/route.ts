import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
import { SPORT_CONFIG } from '@/lib/sport'
import { sportFromRequest } from '@/lib/sport/request'
import type { TierSlug } from '@/lib/picks/types'

// Use an index-signature interface so select('*') doesn't require every column to be declared.
// The _adj columns have no confirmed SQL migration — they may be absent from the result.
interface PlayerDbRow {
  player_name: string
  team: string
  opponent_team: string | null
  position: string | null
  injury_status: string | null
  per36_pts: number | null
  per36_reb: number | null
  per36_ast: number | null
  [key: string]: unknown
}

interface RefRow {
  player_name: string
  team: string
  position: string | null
  games_played: number | null
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

  // NBA-only by construction (per-36 over shared on-court minutes / 1-on-1
  // defender iso). Returns an honest empty result rather than querying NBA
  // reference columns that do not exist on the NFL side. The nav hides this
  // tool under NFL; this is the API-side half of that same rule.
  const sport = sportFromRequest(req)
  if (sport !== 'NBA') {
    return NextResponse.json(
      { players: [], sport, unsupported: true,
        message: 'This tool is NBA-only — no NFL analogue exists.' })
  }
  const supabase = createServiceClient()

  // select('*') — safer than enumerating _adj columns that may not exist yet in the table
  const { data: playersRaw, error: playersErr } = await supabase
    .from('picks_players')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('game_date', date)
    .or('injury_status.is.null,injury_status.neq.out')

  if (playersErr) return NextResponse.json({ error: playersErr.message }, { status: 500 })

  const allPlayers = (playersRaw ?? []) as unknown as PlayerDbRow[]
  // Only include players who have had their per-36 stats populated by picks_stats agent
  const players = allPlayers.filter(p => p.per36_pts != null)

  if (!players.length) return NextResponse.json({ found: false, players: [], date })

  // Enrich with games_played from nba_players_reference (team-matched for traded players)
  const playerNames = players.map(p => p.player_name)
  const { data: refRaw } = await supabase
    .from('nba_players_reference')
    .select('player_name, team, position, games_played')
    .eq('brand_id', BRAND.slug)
    .in('player_name', playerNames)

  const refRows   = (refRaw ?? []) as unknown as RefRow[]
  const currentTeam = new Map(players.map(p => [p.player_name, p.team]))
  const refMap    = new Map<string, RefRow>()
  for (const r of refRows) {
    if (!refMap.has(r.player_name)) refMap.set(r.player_name, r)
  }
  for (const r of refRows) {
    if (r.team === currentTeam.get(r.player_name)) refMap.set(r.player_name, r)
  }

  const out = players.map(p => {
    const ref = refMap.get(p.player_name)
    return {
      player_name:       p.player_name,
      team:              p.team,
      opponent_team:     p.opponent_team ?? null,
      position:          (p.position && p.position !== 'UNK' ? p.position : null)
                           ?? ref?.position ?? null,
      games_played:      ref?.games_played ?? null,
      per36_pts:         p.per36_pts,
      per36_reb:         p.per36_reb,
      per36_ast:         p.per36_ast,
      per36_pts_adj:     (p['per36_pts_adj'] as number | null) ?? null,
      per36_reb_adj:     (p['per36_reb_adj'] as number | null) ?? null,
      per36_ast_adj:     (p['per36_ast_adj'] as number | null) ?? null,
      lineup_adj_applied: (p['lineup_adj_applied'] as boolean | null) ?? false,
    }
  })

  return NextResponse.json({ found: true, date, players: out })
}

// ---- POST: live ladder compute for a user-selected combo ----
// Was a hardcoded '2024-25'. NBA seasons span two calendar years, NFL one
// ('2026'); the mismatch returns zero rows silently rather than erroring, so
// it reads as "no data" instead of "wrong key". Sourced from sport config.
const BASELINE_SEASON = SPORT_CONFIG.NBA.baselineSeason
const MIN_GAMES = 20            // mirrors engine LINEUP_COMBO_MIN_GAMES
const MIN_MINUTES = 48          // guards per-36 from tiny samples

interface LineupRow {
  nba_game_id: string
  lineup_names: string[]
  seconds_played: number
  pts: number
  reb: number
  ast: number
}

function per36(totalSeconds: number, stat: number): number | null {
  if (totalSeconds <= 0) return null
  return (stat * 36) / (totalSeconds / 60)
}

// Pool every row whose lineup_names is a superset of the combo members.
function aggregateCombo(rows: LineupRow[], members: Set<string>) {
  const games = new Set<string>()
  let sec = 0, pts = 0, reb = 0, ast = 0
  for (const r of rows) {
    const names = new Set(r.lineup_names)
    let subset = true
    for (const m of members) { if (!names.has(m)) { subset = false; break } }
    if (subset) {
      games.add(r.nba_game_id)
      sec += r.seconds_played; pts += r.pts; reb += r.reb; ast += r.ast
    }
  }
  return { games: games.size, sec, pts, reb, ast }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? null) as TierSlug | null
  if (!canAccess(tier, 'vector')) {
    return NextResponse.json({ error: 'Vector tier or higher required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const player: string = body.player ?? ''
  const teammates: string[] = Array.isArray(body.teammates) ? body.teammates.slice(0, 4) : []
  if (!player) return NextResponse.json({ error: 'player required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: rowsRaw, error } = await supabase
    .from('picks_lineup_stats')
    .select('nba_game_id, lineup_names, seconds_played, pts, reb, ast')
    .eq('brand_id', BRAND.slug)
    .eq('season', BASELINE_SEASON)
    .eq('player_name', player)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (rowsRaw ?? []) as unknown as LineupRow[]
  if (!rows.length) {
    return NextResponse.json({ found: false, reason: 'no_baseline', player })
  }

  // Walk the ladder over the SELECTED teammates: full set -> drop one -> ... -> player+top1.
  // Teammates are tried in the order the user selected them (already priority-ordered client-side).
  for (let k = teammates.length; k >= 1; k--) {
    const members = new Set<string>([player, ...teammates.slice(0, k)])
    const { games, sec, pts, reb, ast } = aggregateCombo(rows, members)
    if (games >= MIN_GAMES && sec / 60 >= MIN_MINUTES) {
      return NextResponse.json({
        found: true,
        player,
        tier: members.size,
        combo: [...members].sort(),
        games_shared: games,
        minutes: Math.round((sec / 60) * 10) / 10,
        per36_pts: Math.round((per36(sec, pts) ?? 0) * 10) / 10,
        per36_reb: Math.round((per36(sec, reb) ?? 0) * 10) / 10,
        per36_ast: Math.round((per36(sec, ast) ?? 0) * 10) / 10,
      })
    }
  }
  // No selected combo clears the threshold -> honest miss (page shows base per-36)
  return NextResponse.json({ found: false, reason: 'under_min_games', player })
}
