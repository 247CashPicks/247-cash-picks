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

/** One column in the dashboard's projection table. */
export interface ProjectionColumn {
  /** picks_projections column name. */
  key: string
  label: string
  digits: number
}

/**
 * Which projection columns to show per sport.
 *
 * The NFL set is exactly the backend's PROJECTION_SELECT_COLS['NFL']
 * (agents/picks_lines.py) — proj_targets, proj_receptions, proj_rec_yds,
 * proj_carries, proj_rush_yds — so the table shows the columns the projector
 * actually writes and nothing that would render as a column of dashes.
 *
 * MIN is NBA-only and absent from the NFL list: projected_minutes is a
 * basketball concept, and sql/010's NFL columns carry no minutes analogue.
 */
export const PROJECTION_COLUMNS: Record<Sport, readonly ProjectionColumn[]> = {
  NBA: [
    { key: 'projected_minutes', label: 'MIN', digits: 0 },
    { key: 'proj_pts',          label: 'PTS', digits: 1 },
    { key: 'proj_reb',          label: 'REB', digits: 1 },
    { key: 'proj_ast',          label: 'AST', digits: 1 },
  ],
  NFL: [
    { key: 'proj_targets',    label: 'TGT',      digits: 1 },
    { key: 'proj_receptions', label: 'REC',      digits: 1 },
    { key: 'proj_rec_yds',    label: 'REC YDS',  digits: 1 },
    { key: 'proj_carries',    label: 'CAR',      digits: 1 },
    { key: 'proj_rush_yds',   label: 'RUSH YDS', digits: 1 },
  ],
}

/**
 * stat_type -> the picks_projections columns that make it up.
 *
 * Mirrors the backend's STAT_TO_PROJECTION_COLS (agents/picks_lines.py) so the
 * frontend derives our_projection the same way the lines agent does. A
 * combined stat sums its components and — following the backend rule — every
 * component must be present, because an edge computed against half a number
 * is worse than no edge.
 *
 * pass_yds maps to [] deliberately: the NFL engine projects pass attempts, not
 * passing yards. It has no projection and never will.
 */
export const STAT_PROJECTION_COLUMNS: Record<StatType, readonly string[]> = {
  pts: ['proj_pts'],
  reb: ['proj_reb'],
  ast: ['proj_ast'],
  stl: ['proj_stl'],
  blk: ['proj_blk'],
  '3pm': ['proj_3pm'],
  pts_reb_ast: ['proj_pts', 'proj_reb', 'proj_ast'],
  rec_yds: ['proj_rec_yds'],
  receptions: ['proj_receptions'],
  rush_yds: ['proj_rush_yds'],
  rush_rec_yds: ['proj_rush_yds', 'proj_rec_yds'],
  pass_yds: [],
}

/**
 * The projected value for a stat, or null when it cannot be formed.
 *
 * Null means "do not stage this" — picks_selections.our_projection is NOT
 * NULL, so writing a null here is a 23502 that fails the whole insert.
 */
export function projectionForStat(
  projection: Record<string, unknown>,
  stat: string,
): number | null {
  const cols = STAT_PROJECTION_COLUMNS[stat as StatType]
  if (!cols || cols.length === 0) return null
  let sum = 0
  for (const c of cols) {
    const v = projection[c]
    if (typeof v !== 'number') return null   // partial combined stat -> none
    sum += v
  }
  return Math.round(sum * 10) / 10
}
