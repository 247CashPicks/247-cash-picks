'use client'

import { useMemo } from 'react'
import { BRAND } from '@/config/brand'
import type { Sport } from '@/lib/sport'
import { statLabel } from '@/lib/picks/stats'
import {
  type FilterDef, type SortDef,
  teamFilter, statTypeFilter, confidenceFilter, gameDateFilter, tierFilter,
} from '@/lib/picks/filters'
import { useTableFilters } from '@/components/filters/useTableFilters'
import FilterBar, { EmptyFiltered } from '@/components/filters/FilterBar'
import SortableHeader from '@/components/filters/SortableHeader'

const C = BRAND.colors
const F = BRAND.fonts

export interface ConfirmedPick {
  id: string
  player_name: string
  team: string | null
  platform: string | null
  game_date: string | null
  stat_type: string | null
  direction: string | null
  line: number | null
  our_projection: number | null
  edge_pct: number | null
  confidence: string | null
  tier_required: string | null
}

const GRID = '2fr 90px 80px 100px 80px 90px 100px 80px'

export default function ConfirmedQueuePanel(
  { rows, sport }: { rows: ConfirmedPick[]; sport: Sport },
) {
  const filters = useMemo<FilterDef<ConfirmedPick>[]>(() => [
    teamFilter(r => r.team),
    statTypeFilter(sport, r => r.stat_type),
    confidenceFilter(r => r.confidence),
    gameDateFilter(r => r.game_date),
    tierFilter(r => r.tier_required),
  ], [sport])

  const sorts = useMemo<SortDef<ConfirmedPick>[]>(() => [
    { key: 'game_date', label: 'DATE', get: r => r.game_date,      type: 'date' as const },
    { key: 'line',      label: 'LINE', get: r => r.line,           type: 'number' as const },
    { key: 'proj',      label: 'PROJ', get: r => r.our_projection, type: 'number' as const },
    { key: 'edge',      label: 'EDGE', get: r => r.edge_pct,       type: 'number' as const },
  ], [])

  const t = useTableFilters<ConfirmedPick>({ rows, filters, sorts, resetKey: sport })

  return (
    <div style={{ padding: '14px 24px' }}>
      <FilterBar
        filters={t.visibleFilters} options={t.options} state={t.state}
        setFilter={t.setFilter} shown={t.shown} total={t.total}
        activeCount={t.activeCount} onClear={t.clearAll} unit="signals"
      />

      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID, gap: '12px',
        padding: '4px 0 10px', borderBottom: `1px solid ${C.border}`, alignItems: 'center',
      }}>
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim }}>PLAYER</div>
        <SortableHeader label="DATE"   sortKey="game_date" sort={t.sort} onToggle={t.toggleSort} />
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim }}>STAT</div>
        <SortableHeader label="SIGNAL" sortKey="line" sort={t.sort} onToggle={t.toggleSort} align="center" />
        <SortableHeader label="PROJ"   sortKey="proj" sort={t.sort} onToggle={t.toggleSort} align="center" />
        <SortableHeader label="EDGE"   sortKey="edge" sort={t.sort} onToggle={t.toggleSort} align="center" />
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim, textAlign: 'center' }}>CONF</div>
        <div style={{ fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: C.dim, textAlign: 'right' }}>TIER</div>
      </div>

      {t.shown === 0 ? (
        <EmptyFiltered summary={t.summary} unit="signals" />
      ) : t.filtered.map((pick, i) => (
        <div key={pick.id} style={{
          padding: '16px 0',
          borderBottom: i < t.filtered.length - 1 ? `1px solid ${C.border}` : 'none',
          display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', gap: '12px',
        }}>
          <div>
            <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
              {pick.player_name}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, marginTop: '2px' }}>
              {pick.team} · {pick.platform}
            </div>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, letterSpacing: '0.04em' }}>
            {pick.game_date}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '15px', fontWeight: 500, color: C.platinum, letterSpacing: '0.06em' }}>
            {statLabel(pick.stat_type ?? '')}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: F.mono, fontSize: '20px', fontWeight: 500,
              color: pick.direction === 'over' ? C.signalCyan : C.platinum, letterSpacing: '0.04em',
            }}>
              {pick.direction?.toUpperCase()}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>
              LINE: {pick.line}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
              {pick.our_projection}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>PROJ</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: F.mono, fontWeight: 500, fontSize: '15px',
              color: pick.edge_pct == null ? C.muted
                : pick.edge_pct >= 10 ? C.signalCyan
                : pick.edge_pct > 0 ? C.platinum : C.flagAmber,
            }}>
              {pick.edge_pct == null
                ? '—'
                : `${pick.edge_pct > 0 ? '+' : ''}${Number(pick.edge_pct).toFixed(1)}%`}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>EDGE</div>
          </div>
          <div style={{
            textAlign: 'center', padding: '5px 8px',
            border: `1px solid ${pick.confidence === 'high' ? C.borderEmphasis : C.border}`,
            fontFamily: F.mono, fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em',
            color: pick.confidence === 'high' ? C.signalCyan : C.platinum,
            textTransform: 'uppercase' as const,
          }}>
            {pick.confidence}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, textAlign: 'right', letterSpacing: '0.06em' }}>
            {pick.tier_required}+
          </div>
        </div>
      ))}
    </div>
  )
}
