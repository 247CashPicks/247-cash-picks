import type { Sport } from '@/lib/sport'
import { statLabel, statsFor } from '@/lib/picks/stats'
import { TIER_ORDER } from '@/lib/picks/tiers'

/**
 * The one source for table filtering + sorting — same pattern as the agent
 * registry (src/lib/picks/agents.ts): sport-keyed option ordering lives here,
 * not inline in six components. A surface declares which fields it filters by
 * calling the builders below; the actual option VALUES are always derived from
 * the data present (deriveOptions), never hardcoded, so an unexpected value can
 * never silently hide rows.
 *
 * Pure module — no React. The hook (components/filters/useTableFilters) and the
 * bar (components/filters/FilterBar) consume it.
 */

export type FilterKind = 'select' | 'numberRange' | 'dateRange'

export interface FilterDef<R> {
  key: string
  label: string
  kind: FilterKind
  get: (row: R) => string | number | null | undefined
  /** select: comparator over the raw string values, for dropdown order. */
  order?: (a: string, b: string) => number
  /** select: value -> display label. */
  format?: (value: string) => string
  /** numberRange: compare on absolute value (edge %: -30 and +30 both pass min 25). */
  abs?: boolean
}

/** Per-field state. select uses `value`; ranges use `min`/`max` (blank = unbounded). */
export interface FieldState { value?: string; min?: string; max?: string }
export type FilterState = Record<string, FieldState>

export interface SortDef<R> {
  key: string
  label: string
  get: (row: R) => string | number | null | undefined
  type: 'number' | 'date' | 'string'
}
export interface SortState { key: string; dir: 'asc' | 'desc' }

// ── Sport-keyed / domain orderings ────────────────────────────────────────
// A comparator that ranks known values by list position, unknowns last (then
// alphabetical). Keeps dropdowns in a sensible order without hardcoding the
// option list itself.
export function rankBy(order: readonly string[]): (a: string, b: string) => number {
  return (a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  }
}

export const CONFIDENCE_ORDER = ['high', 'medium', 'low'] as const
export const RESULT_ORDER     = ['hit', 'miss', 'push', 'void', 'pending'] as const
export const DIRECTION_ORDER  = ['over', 'under'] as const
export const STATUS_ORDER     = ['pending', 'confirmed'] as const

export const POSITION_ORDER: Record<Sport, readonly string[]> = {
  NBA: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'],
  NFL: ['QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'C', 'G', 'OT',
        'DL', 'DE', 'DT', 'NT', 'LB', 'ILB', 'MLB', 'OLB',
        'DB', 'CB', 'S', 'SAF', 'FS', 'SS', 'K', 'P', 'LS'],
}

// ── Filter-def builders (the shared option sets) ──────────────────────────
export function teamFilter<R>(get: (r: R) => string | null | undefined): FilterDef<R> {
  return { key: 'team', label: 'TEAM', kind: 'select', get, order: (a, b) => a.localeCompare(b) }
}

export function positionFilter<R>(sport: Sport, get: (r: R) => string | null | undefined): FilterDef<R> {
  return { key: 'position', label: 'POSITION', kind: 'select', get, order: rankBy(POSITION_ORDER[sport]) }
}

export function statTypeFilter<R>(sport: Sport, get: (r: R) => string | null | undefined): FilterDef<R> {
  const order = statsFor(sport) as readonly string[]
  return {
    key: 'stat', label: 'STAT TYPE', kind: 'select', get,
    order: rankBy(order), format: statLabel,
  }
}

export function confidenceFilter<R>(get: (r: R) => string | null | undefined): FilterDef<R> {
  return {
    key: 'confidence', label: 'CONFIDENCE', kind: 'select', get,
    order: rankBy(CONFIDENCE_ORDER), format: v => v.toUpperCase(),
  }
}

export function statusFilter<R>(get: (r: R) => string | null | undefined): FilterDef<R> {
  return { key: 'status', label: 'STATUS', kind: 'select', get, order: rankBy(STATUS_ORDER), format: v => v.toUpperCase() }
}

export function resultFilter<R>(get: (r: R) => string | null | undefined): FilterDef<R> {
  return { key: 'result', label: 'RESULT', kind: 'select', get, order: rankBy(RESULT_ORDER), format: v => v.toUpperCase() }
}

export function directionFilter<R>(get: (r: R) => string | null | undefined): FilterDef<R> {
  return { key: 'direction', label: 'SIGNAL', kind: 'select', get, order: rankBy(DIRECTION_ORDER), format: v => v.toUpperCase() }
}

export function tierFilter<R>(get: (r: R) => string | null | undefined): FilterDef<R> {
  return { key: 'tier', label: 'TIER REQ', kind: 'select', get, order: rankBy(TIER_ORDER), format: v => `${v.toUpperCase()}+` }
}

export function gameDateFilter<R>(get: (r: R) => string | null | undefined): FilterDef<R> {
  return { key: 'game_date', label: 'GAME DATE', kind: 'select', get, order: (a, b) => a.localeCompare(b) }
}

export function edgeFilter<R>(get: (r: R) => number | null | undefined): FilterDef<R> {
  return { key: 'edge', label: 'EDGE % (ABS)', kind: 'numberRange', get, abs: true }
}

export function dateRangeFilter<R>(get: (r: R) => string | null | undefined, label = 'DATE'): FilterDef<R> {
  return { key: 'date_range', label, kind: 'dateRange', get }
}

// ── Pure evaluation ───────────────────────────────────────────────────────
export interface Option { value: string; label: string }

const present = (v: unknown): v is string | number =>
  v !== null && v !== undefined && v !== ''

export function deriveOptions<R>(rows: readonly R[], def: FilterDef<R>): Option[] {
  const seen = new Set<string>()
  for (const row of rows) {
    const v = def.get(row)
    if (present(v)) seen.add(String(v))
  }
  const values = [...seen].sort(def.order ?? ((a, b) => a.localeCompare(b)))
  return values.map(value => ({ value, label: def.format ? def.format(value) : value }))
}

/** Distinct present values — a control with 0 or 1 of these is hidden. */
export function distinctCount<R>(rows: readonly R[], def: FilterDef<R>): number {
  const seen = new Set<string>()
  for (const row of rows) {
    const v = def.get(row)
    if (present(v)) seen.add(String(v))
  }
  return seen.size
}

const num = (s: string | undefined): number | null => {
  if (s == null || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function matchesOne<R>(row: R, def: FilterDef<R>, s: FieldState): boolean {
  if (def.kind === 'select') {
    if (!s.value) return true
    return String(def.get(row) ?? '') === s.value
  }
  if (def.kind === 'numberRange') {
    const min = num(s.min), max = num(s.max)
    if (min == null && max == null) return true
    const raw = def.get(row)
    if (raw == null || raw === '') return false            // can't satisfy a bound
    let v = Number(raw)
    if (!Number.isFinite(v)) return false
    if (def.abs) v = Math.abs(v)
    if (min != null && v < min) return false
    if (max != null && v > max) return false
    return true
  }
  // dateRange — 'YYYY-MM-DD' compares chronologically as strings.
  const from = s.min?.trim() || null
  const to   = s.max?.trim() || null
  if (!from && !to) return true
  const v = def.get(row)
  if (v == null || v === '') return false
  const d = String(v)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export function matchesFilters<R>(row: R, defs: readonly FilterDef<R>[], state: FilterState): boolean {
  for (const def of defs) {
    const s = state[def.key]
    if (s && !matchesOne(row, def, s)) return false
  }
  return true
}

export function isFieldActive(s: FieldState | undefined): boolean {
  if (!s) return false
  return !!(s.value || (s.min && s.min.trim()) || (s.max && s.max.trim()))
}

export function activeCount(defs: readonly { key: string }[], state: FilterState): number {
  return defs.reduce((n, d) => n + (isFieldActive(state[d.key]) ? 1 : 0), 0)
}

/** Human summary of the active filters, for the empty-result message. */
export function activeSummary<R>(defs: readonly FilterDef<R>[], state: FilterState): string {
  const parts: string[] = []
  for (const def of defs) {
    const s = state[def.key]
    if (!isFieldActive(s)) continue
    if (def.kind === 'select') {
      parts.push(`${def.label} = ${def.format ? def.format(s!.value!) : s!.value}`)
    } else {
      const bits: string[] = []
      if (s!.min && s!.min.trim()) bits.push(`≥ ${s!.min.trim()}`)
      if (s!.max && s!.max.trim()) bits.push(`≤ ${s!.max.trim()}`)
      parts.push(`${def.label} ${bits.join(' & ')}`)
    }
  }
  return parts.join(' · ')
}

export function sortRows<R>(rows: readonly R[], def: SortDef<R>, dir: 'asc' | 'desc'): R[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((ra, rb) => {
    const a = def.get(ra), b = def.get(rb)
    const an = a == null || a === '', bn = b == null || b === ''
    if (an && bn) return 0
    if (an) return 1          // nulls always last, regardless of direction
    if (bn) return -1
    if (def.type === 'number') return (Number(a) - Number(b)) * factor
    return String(a).localeCompare(String(b)) * factor   // date strings sort chronologically
  })
}
