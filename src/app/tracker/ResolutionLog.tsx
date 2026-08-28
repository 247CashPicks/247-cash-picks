'use client'

import { useMemo } from 'react'
import { BRAND } from '@/config/brand'
import type { Sport } from '@/lib/sport'
import { statLabel } from '@/lib/picks/stats'
import {
  type FilterDef, type SortDef,
  statTypeFilter, resultFilter, confidenceFilter, directionFilter, teamFilter, dateRangeFilter,
} from '@/lib/picks/filters'
import { useTableFilters } from '@/components/filters/useTableFilters'
import FilterBar, { EmptyFiltered } from '@/components/filters/FilterBar'
import SortableHeader from '@/components/filters/SortableHeader'

const C = BRAND.colors
const F = BRAND.fonts

export interface ResultRow {
  player_name: string
  team: string | null
  stat_type: string | null
  line: number | null
  direction: string | null
  result: string | null
  actual_value: number | null
  game_date: string | null
  our_projection: number | null
  confidence: string | null
}

const GRID = '2fr 80px 80px 80px 80px 80px'

export default function ResolutionLog(
  { rows, sport }: { rows: ResultRow[]; sport: Sport },
) {
  const filters = useMemo<FilterDef<ResultRow>[]>(() => [
    statTypeFilter(sport, r => r.stat_type),
    resultFilter(r => r.result),
    confidenceFilter(r => r.confidence),
    directionFilter(r => r.direction),
    teamFilter(r => r.team),
    dateRangeFilter(r => r.game_date, 'GAME DATE'),
  ], [sport])

  const sorts = useMemo<SortDef<ResultRow>[]>(() => [
    { key: 'line', label: 'LINE', get: r => r.line,           type: 'number' as const },
    { key: 'proj', label: 'PROJ', get: r => r.our_projection, type: 'number' as const },
  ], [])

  const t = useTableFilters<ResultRow>({ rows, filters, sorts, resetKey: sport })

  return (
    <div style={{ padding: '14px 24px' }}>
      <FilterBar
        filters={t.visibleFilters} options={t.options} state={t.state}
        setFilter={t.setFilter} shown={t.shown} total={t.total}
        activeCount={t.activeCount} onClear={t.clearAll} unit="results"
      />

      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID,
        padding: '4px 0 10px', borderBottom: `1px solid ${C.border}`, alignItems: 'center',
      }}>
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim }}>PLAYER</div>
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim }}>STAT</div>
        <SortableHeader label="LINE" sortKey="line" sort={t.sort} onToggle={t.toggleSort} />
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim }}>SIGNAL</div>
        <SortableHeader label="PROJ" sortKey="proj" sort={t.sort} onToggle={t.toggleSort} />
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim }}>RESULT</div>
      </div>

      {t.shown === 0 ? (
        <EmptyFiltered summary={t.summary} unit="results" />
      ) : t.filtered.map((r, i) => (
        <div key={`${r.player_name}-${r.game_date}-${r.stat_type}-${i}`} style={{
          display: 'grid', gridTemplateColumns: GRID,
          padding: '12px 0',
          borderBottom: i < t.filtered.length - 1 ? `1px solid ${C.border}` : 'none',
          background: r.result === 'hit'
            ? 'rgba(47,212,232,0.03)'
            : r.result === 'miss' ? 'rgba(232,163,61,0.03)' : 'transparent',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '14px', color: C.platinum }}>
              {r.player_name}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, marginTop: '2px' }}>
              {r.team} · {r.game_date}
            </div>
          </div>
          <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px', letterSpacing: '0.06em' }}>
            {statLabel(r.stat_type ?? '')}
          </div>
          <div style={{ fontFamily: F.mono, fontWeight: 500, color: C.platinum, fontSize: '14px' }}>
            {r.line}
          </div>
          <div style={{
            fontFamily: F.mono, fontWeight: 500, fontSize: '12px', letterSpacing: '0.06em',
            color: r.direction === 'over' ? C.signalCyan : C.platinum,
          }}>
            {r.direction?.toUpperCase()}
          </div>
          <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px' }}>
            {r.our_projection}
          </div>
          <div style={{
            fontFamily: F.mono, fontWeight: 500, fontSize: '12px', letterSpacing: '0.06em',
            color: r.result === 'hit' ? C.signalCyan
              : r.result === 'miss' ? C.flagAmber : C.muted,
          }}>
            {r.result === 'hit'     ? '✓ HIT'
              : r.result === 'miss' ? '✗ MISS'
              : r.result === 'pending' ? '–'
              : r.result?.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  )
}
