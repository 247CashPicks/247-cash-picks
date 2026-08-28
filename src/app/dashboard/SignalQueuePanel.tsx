'use client'

import { useMemo } from 'react'
import { BRAND } from '@/config/brand'
import type { Sport } from '@/lib/sport'
import { statLabel } from '@/lib/picks/stats'
import {
  type FilterDef,
  statusFilter, teamFilter, statTypeFilter, confidenceFilter, gameDateFilter, edgeFilter,
} from '@/lib/picks/filters'
import { useTableFilters } from '@/components/filters/useTableFilters'
import FilterBar, { EmptyFiltered } from '@/components/filters/FilterBar'

const C = BRAND.colors
const F = BRAND.fonts

export interface Selection {
  id: string
  player_name: string
  status: string
  stat_type: string | null
  direction: string | null
  line: number | null
  platform: string | null
  edge_pct: number | null
  confidence: string | null
  tier_required: string | null
  team: string | null
  game_date: string | null
}

export default function SignalQueuePanel(
  { rows, sport }: { rows: Selection[]; sport: Sport },
) {
  const filters = useMemo<FilterDef<Selection>[]>(() => [
    statusFilter(r => r.status),
    teamFilter(r => r.team),
    statTypeFilter(sport, r => r.stat_type),
    confidenceFilter(r => r.confidence),
    gameDateFilter(r => r.game_date),
    edgeFilter(r => r.edge_pct),
  ], [sport])

  const t = useTableFilters<Selection>({ rows, filters, resetKey: sport })

  return (
    <div style={{ padding: '14px 20px 0' }}>
      <FilterBar
        filters={t.visibleFilters} options={t.options} state={t.state}
        setFilter={t.setFilter} shown={t.shown} total={t.total}
        activeCount={t.activeCount} onClear={t.clearAll} unit="signals"
      />

      {t.shown === 0 ? (
        <EmptyFiltered summary={t.summary} unit="signals" />
      ) : t.filtered.map((s, i) => (
        <div key={s.id} style={{
          padding: '14px 0',
          borderBottom: i < t.filtered.length - 1 ? `1px solid ${C.border}` : 'none',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '14px', color: C.platinum }}>
              {s.player_name}
            </div>
            <span style={{
              fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em',
              color: s.status === 'confirmed' ? C.signalCyan : C.flagAmber,
              border: `1px solid ${s.status === 'confirmed' ? C.borderEmphasis : 'rgba(232,163,61,0.3)'}`,
              padding: '2px 8px',
              textTransform: 'uppercase' as const,
            }}>
              {s.status}
            </span>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, marginBottom: '8px', letterSpacing: '0.04em' }}>
            {statLabel(s.stat_type ?? '')} {s.direction?.toUpperCase()} {s.line}
            {' · '}{s.platform}
            {s.edge_pct != null && (
              <span style={{ color: C.signalCyan, fontWeight: 500 }}>
                {' '}({s.edge_pct > 0 ? '+' : ''}{s.edge_pct.toFixed(1)}% edge)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{
              fontFamily: F.mono, fontSize: '10px', color: C.dim,
              border: `1px solid ${C.border}`, padding: '2px 8px',
              textTransform: 'capitalize' as const, letterSpacing: '0.06em',
            }}>
              {s.confidence}
            </span>
            <span style={{
              fontFamily: F.mono, fontSize: '10px', color: C.dim,
              border: `1px solid ${C.border}`, padding: '2px 8px',
              letterSpacing: '0.06em',
            }}>
              {s.tier_required}+
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
