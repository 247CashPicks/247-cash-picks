/**
 * The sport dimension — a second scalar scope riding the exact rail brand_id
 * already rides.
 *
 * Backend Phase 1 gave every SHARED picks_* table a NOT NULL `league` column
 * ('NBA' | 'NFL', CHECK-constrained). Reference tables deliberately have none:
 * a league column on a table named nfl_players_reference could only ever hold
 * one value, so there the TABLE NAME is the league. Both cases are expressed
 * here — LEAGUE_SCOPED_TABLES for the filter, SPORT_CONFIG.playersReference
 * for the swap.
 *
 * TRANSPORT: a cookie, not a URL searchParam. Reasons, since the choice is
 * load-bearing:
 *
 *   1. Sport is ambient user state, not a property of a resource. /picks means
 *      "the picks for the sport I'm looking at", the way brand_id is ambient
 *      rather than a path segment.
 *   2. Server components read it with cookies() — no prop drilling. A
 *      searchParam would have to be appended to every internal href, which is
 *      precisely the per-page duplication Task 3 exists to delete; miss one
 *      link and the app silently falls back to NBA with no error.
 *   3. It survives navigation and sessions for free.
 *   4. The data pages are already force-dynamic, so the dynamic-render cost of
 *      reading a cookie is already paid.
 *
 * The cost, stated plainly: a URL is no longer shareable per-sport. Mitigated
 * where it matters — route handlers accept an explicit ?sport= override
 * (see request.ts), so an API call can name its sport without the cookie.
 */

export const SPORTS = ['NBA', 'NFL'] as const
export type Sport = (typeof SPORTS)[number]

export const DEFAULT_SPORT: Sport = 'NBA'

/** Cookie name. Read by server components, written by the nav switcher. */
export const SPORT_COOKIE = 'tac_sport'

/** Shared picks_* tables carrying a league column (backend sql/008 + 009). */
export const LEAGUE_SCOPED_TABLES = [
  'picks_games',
  'picks_players',
  'picks_matchups',
  'picks_projections',
  'picks_lines',
  'picks_selections',
  'picks_published',
  'picks_projection_accuracy_runs',
  'picks_player_overrides',
] as const

export function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as readonly string[]).includes(value)
}

/** Never throws: anything unrecognised falls back to the default sport. */
export function parseSport(value: string | null | undefined): Sport {
  return isSport(value) ? value : DEFAULT_SPORT
}

export interface SportConfig {
  label: string
  /** Long-form name for headings and empty states. */
  fullName: string
  /**
   * Per-sport reference table. These are separate TABLES rather than a league
   * column, so this is a table swap, not a filter.
   */
  playersReference: string
  /**
   * Season key format differs by sport: the NBA spans two calendar years
   * ('2024-25'), the NFL one ('2026'). Passing an NBA-shaped season to an NFL
   * query returns zero rows silently — no error, just an empty slate.
   */
  baselineSeason: string
  /**
   * Column to rank autocomplete by. The two reference tables share only
   * player_name/team/position/season — nba has per36_*, nfl has share/rate
   * columns — so the ordering column cannot be hardcoded across a table swap.
   */
  playerRankColumn: string
  /** Whether per-36 / minutes concepts apply. Basketball-only. */
  hasMinutes: boolean
  /** Tools with no analogue in this sport, hidden from the nav. */
  hiddenTools: readonly string[]
}

export const SPORT_CONFIG: Record<Sport, SportConfig> = {
  NBA: {
    label: 'NBA',
    fullName: 'Basketball',
    playersReference: 'nba_players_reference',
    baselineSeason: '2024-25',
    playerRankColumn: 'per36_pts',
    hasMinutes: true,
    hiddenTools: [],
  },
  NFL: {
    label: 'NFL',
    fullName: 'Football',
    playersReference: 'nfl_players_reference',
    baselineSeason: '2026',
    playerRankColumn: 'snap_pct',
    hasMinutes: false,
    // Shared-floor combos over on-court minutes and 1-on-1 defender iso
    // matchups are basketball concepts. Gated here rather than ported.
    //
    // projection_runner is here for a different reason: lib/picks/model.ts is
    // a basketball engine to the constant (pace 99.3, def rating 115.5,
    // rebound suppression), and the NFL engine lives BACKEND-side in
    // engine/projection_nfl.py. Running the NBA formula over NFL inputs would
    // not fail — it would return a confident, meaningless number, which is
    // worse. Hidden rather than ported.
    hiddenTools: ['lineup_adjuster', 'matchup_builder', 'projection_runner'],
  },
}

export function sportConfig(sport: Sport): SportConfig {
  return SPORT_CONFIG[sport]
}
