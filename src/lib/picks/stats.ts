import type { Sport } from '@/lib/sport'

/**
 * The stat vocabulary, keyed by sport.
 *
 * StatType was a pure NBA union, so every consumer either broke or silently
 * dropped NFL rows. The NFL side is NOT invented here — it is exactly the set
 * the backend's Underdog map produces (agents/picks_lines.py
 * STAT_TO_PROJECTION_COLS['NFL']), verified against that file rather than
 * assumed. Adding a sixth NFL stat here without the backend producing it would
 * put a filter in the UI that can only ever return nothing.
 */

export const NBA_STATS = [
  'pts', 'reb', 'ast', 'stl', 'blk', '3pm', 'pts_reb_ast',
] as const

export const NFL_STATS = [
  'rec_yds', 'receptions', 'rush_yds', 'pass_yds', 'rush_rec_yds',
] as const

export type NbaStat = (typeof NBA_STATS)[number]
export type NflStat = (typeof NFL_STATS)[number]
export type StatType = NbaStat | NflStat

export const STATS_BY_SPORT: Record<Sport, readonly StatType[]> = {
  NBA: NBA_STATS,
  NFL: NFL_STATS,
}

export function statsFor(sport: Sport): readonly StatType[] {
  return STATS_BY_SPORT[sport]
}

export function isStatOfSport(stat: string, sport: Sport): boolean {
  return (STATS_BY_SPORT[sport] as readonly string[]).includes(stat)
}

interface StatMeta {
  /** Column-header form. */
  short: string
  /** Sentence form for prose and empty states. */
  long: string
  /**
   * False when the backend cannot produce a projection for this stat, so no
   * edge exists and the selector will never stage it. Only pass_yds today:
   * the NFL engine projects pass ATTEMPTS, not passing yards, so the line is
   * ingested as real market data but carries no edge. Surfaced rather than
   * rendered as a blank cell the reader has to interpret.
   */
  projected: boolean
}

export const STAT_META: Record<StatType, StatMeta> = {
  // NBA
  pts:          { short: 'PTS',     long: 'Points',              projected: true },
  reb:          { short: 'REB',     long: 'Rebounds',            projected: true },
  ast:          { short: 'AST',     long: 'Assists',             projected: true },
  stl:          { short: 'STL',     long: 'Steals',              projected: true },
  blk:          { short: 'BLK',     long: 'Blocks',              projected: true },
  '3pm':        { short: '3PM',     long: 'Three-pointers made', projected: true },
  pts_reb_ast:  { short: 'PRA',     long: 'Pts + Reb + Ast',     projected: true },
  // NFL
  rec_yds:      { short: 'REC YDS', long: 'Receiving yards',     projected: true },
  receptions:   { short: 'REC',     long: 'Receptions',          projected: true },
  rush_yds:     { short: 'RUSH YDS', long: 'Rushing yards',      projected: true },
  rush_rec_yds: { short: 'R+R YDS', long: 'Rush + Rec yards',    projected: true },
  pass_yds:     { short: 'PASS YDS', long: 'Passing yards',      projected: false },
}

/** Column-header label. Unknown strings pass through uppercased, never blank. */
export function statLabel(stat: string): string {
  return STAT_META[stat as StatType]?.short ?? stat.toUpperCase()
}

export function statLongLabel(stat: string): string {
  return STAT_META[stat as StatType]?.long ?? stat
}

export function isProjectedStat(stat: string): boolean {
  return STAT_META[stat as StatType]?.projected ?? true
}
