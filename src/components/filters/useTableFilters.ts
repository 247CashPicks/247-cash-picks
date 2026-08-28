import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type FilterDef, type SortDef, type SortState, type FilterState, type Option,
  deriveOptions, distinctCount, matchesFilters, sortRows, activeCount, activeSummary,
} from '@/lib/picks/filters'

export interface UseTableFiltersArgs<R> {
  rows: readonly R[]
  filters: readonly FilterDef<R>[]
  sorts?: readonly SortDef<R>[]
  /** When this changes (e.g. the active sport), filters and sort reset. */
  resetKey?: unknown
  initialSort?: SortState
}

/**
 * One hook behind every filterable table. Holds filter + sort state, derives
 * option lists and control visibility from the data present, and returns the
 * filtered+sorted rows. Rendering stays with each surface; only the state and
 * the maths are shared.
 */
export function useTableFilters<R>({
  rows, filters, sorts = [], resetKey, initialSort,
}: UseTableFiltersArgs<R>) {
  const [state, setState] = useState<FilterState>({})
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)

  // Reset on sport switch — a filter meaningful under one sport (STAT=rec_yds)
  // is nonsense under the other, and would silently show zero rows.
  const prev = useRef(resetKey)
  useEffect(() => {
    if (prev.current !== resetKey) {
      prev.current = resetKey
      setState({})
      setSort(initialSort ?? null)
    }
  }, [resetKey, initialSort])

  // Hide any control with 0 or 1 distinct value (e.g. game date under NBA's
  // single-date slate) — a filter that can't partition anything is noise.
  const visibleFilters = useMemo(
    () => filters.filter(f => distinctCount(rows, f) > 1),
    [rows, filters],
  )

  const options = useMemo(() => {
    const o: Record<string, Option[]> = {}
    for (const f of visibleFilters) if (f.kind === 'select') o[f.key] = deriveOptions(rows, f)
    return o
  }, [rows, visibleFilters])

  const filtered = useMemo(() => {
    const kept = rows.filter(r => matchesFilters(r, visibleFilters, state))
    if (!sort) return kept
    const def = sorts.find(s => s.key === sort.key)
    return def ? sortRows(kept, def, sort.dir) : kept
  }, [rows, visibleFilters, state, sort, sorts])

  const setFilter = (key: string, patch: Partial<{ value: string; min: string; max: string }>) =>
    setState(s => ({ ...s, [key]: { ...s[key], ...patch } }))

  const clearAll = () => { setState({}); setSort(initialSort ?? null) }

  // First click sorts ascending; clicking the active column reverses it.
  const toggleSort = (key: string) =>
    setSort(s => (s && s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }))

  return {
    filtered,
    total: rows.length,
    shown: filtered.length,
    visibleFilters,
    options,
    state,
    setFilter,
    clearAll,
    activeCount: activeCount(visibleFilters, state),
    summary: activeSummary(visibleFilters, state),
    sort,
    toggleSort,
  }
}
