'use client'

import { useMemo } from 'react'
import type { Sport } from '@/lib/sport'
import type { PickPublished } from '@/lib/picks/types'
import {
  type FilterDef,
  statTypeFilter, teamFilter, confidenceFilter, gameDateFilter, resultFilter,
} from '@/lib/picks/filters'
import { useTableFilters } from '@/components/filters/useTableFilters'
import FilterBar, { EmptyFiltered } from '@/components/filters/FilterBar'
import PickCard from './PickCard'

/**
 * The subscriber-facing pick grid, filterable.
 *
 * TIER GATING: this only ever receives the picks the viewer is entitled to
 * see. Locked picks are never passed in, so neither the rows nor the derived
 * option lists can reveal a pick the viewer hasn't paid for — the filter works
 * strictly over what is already on screen.
 */
export default function PicksBrowser(
  { rows, sport }: { rows: PickPublished[]; sport: Sport },
) {
  const filters = useMemo<FilterDef<PickPublished>[]>(() => [
    statTypeFilter(sport, r => r.stat_type),
    teamFilter(r => r.team),
    confidenceFilter(r => r.confidence),
    gameDateFilter(r => r.game_date),
    resultFilter(r => r.result),
  ], [sport])

  const t = useTableFilters<PickPublished>({ rows, filters, resetKey: sport })

  return (
    <div>
      <FilterBar
        filters={t.visibleFilters} options={t.options} state={t.state}
        setFilter={t.setFilter} shown={t.shown} total={t.total}
        activeCount={t.activeCount} onClear={t.clearAll} unit="signals"
      />

      {t.shown === 0 ? (
        <EmptyFiltered summary={t.summary} unit="signals" />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {t.filtered.map(pick => <PickCard key={pick.id} pick={pick} />)}
        </div>
      )}
    </div>
  )
}
