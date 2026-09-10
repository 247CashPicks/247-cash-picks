'use client'

import { useEffect, useMemo, useState } from 'react'
import { BRAND } from '@/config/brand'
import type { Sport } from '@/lib/sport'
import type { ProjectionColumn } from '@/lib/picks/stats'
import {
  type FilterDef, type SortDef,
  positionFilter, teamFilter, edgeFilter, statTypeFilter, confidenceFilter, gameDateFilter,
} from '@/lib/picks/filters'
import { useTableFilters } from '@/components/filters/useTableFilters'
import FilterBar, { EmptyFiltered } from '@/components/filters/FilterBar'
import SortableHeader from '@/components/filters/SortableHeader'

const C = BRAND.colors
const F = BRAND.fonts

// Projection row enriched server-side with the headline line's edge + stat
// (the projection table itself carries no single stat_type).
export type ProjRow = Record<string, unknown> & {
  id: string
  player_name: string
  team: string | null
  position: string | null
  is_starter: boolean
  game_date: string
  confidence_band: string | null
  _edgePct: number | null
  _headlineStat: string | null
  /** null means the registry could not be read; do not present the values as
   * endorsed in that state either. */
  _excludedByGuard: boolean | null
}

export default function ProjectionsPanel(
  { rows, cols, sport }: { rows: ProjRow[]; cols: readonly ProjectionColumn[]; sport: Sport },
) {
  const filters = useMemo<FilterDef<ProjRow>[]>(() => [
    positionFilter(sport, r => r.position),
    teamFilter(r => r.team),
    statTypeFilter(sport, r => r._headlineStat),
    confidenceFilter(r => r.confidence_band),
    gameDateFilter(r => r.game_date),
    edgeFilter(r => r._edgePct),
  ], [sport])

  const sorts = useMemo<SortDef<ProjRow>[]>(() => [
    ...cols.map(c => ({ key: c.key, label: c.label, get: (r: ProjRow) => r[c.key] as number, type: 'number' as const })),
    { key: 'edge', label: 'EDGE', get: (r: ProjRow) => r._edgePct, type: 'number' as const },
  ], [cols])

  const t = useTableFilters<ProjRow>({ rows, filters, sorts, resetKey: sport })

  // 616 rows under NFL is too many for one DOM render — paginate the filtered,
  // sorted set at 100/page. Page resets to the top whenever the filter or sort
  // changes, so page 1 always shows the top of what the operator narrowed to.
  const PAGE_SIZE = 100
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [t.state, t.sort])

  const pageCount = Math.max(1, Math.ceil(t.shown / PAGE_SIZE))
  const safePage  = Math.min(page, pageCount - 1)
  const start     = safePage * PAGE_SIZE
  const pageRows  = t.filtered.slice(start, start + PAGE_SIZE)
  const from      = t.shown === 0 ? 0 : start + 1
  const to        = Math.min(start + PAGE_SIZE, t.shown)

  // Header + body share one template so they cannot drift as the column count
  // changes between sports (4 for NBA, 5 for NFL).
  const grid = `2fr 60px ${cols.map(() => '80px').join(' ')} 160px 90px`

  const navBtn: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${C.border}`, color: C.platinum,
    fontFamily: F.mono, fontSize: '11px', padding: '4px 10px', cursor: 'pointer',
  }

  return (
    <div>
      <FilterBar
        filters={t.visibleFilters} options={t.options} state={t.state}
        setFilter={t.setFilter} shown={t.shown} total={t.total}
        activeCount={t.activeCount} onClear={t.clearAll} unit="players" showCount={false}
      />

      {/* Count + pagination */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        marginBottom: '10px',
      }}>
        <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
          showing {from}–{to} of {t.shown}
          {t.shown !== t.total && <span style={{ color: C.faint }}> ({t.total} total)</span>}
        </span>
        {pageCount > 1 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
              style={{ ...navBtn, opacity: safePage === 0 ? 0.4 : 1, cursor: safePage === 0 ? 'not-allowed' : 'pointer' }}>
              ‹ PREV
            </button>
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, letterSpacing: '0.06em' }}>
              PAGE {safePage + 1} / {pageCount}
            </span>
            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}
              style={{ ...navBtn, opacity: safePage >= pageCount - 1 ? 0.4 : 1, cursor: safePage >= pageCount - 1 ? 'not-allowed' : 'pointer' }}>
              NEXT ›
            </button>
          </div>
        )}
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: grid,
        padding: '9px 20px', borderBottom: `1px solid ${C.border}`,
        fontFamily: F.mono, fontSize: '10px', fontWeight: 500,
        color: C.dim, letterSpacing: '0.1em',
      }}>
        <div>PLAYER</div>
        <div>POS</div>
        {cols.map(c => (
          <SortableHeader key={c.key} label={c.label} sortKey={c.key} sort={t.sort} onToggle={t.toggleSort} />
        ))}
        <SortableHeader label="EDGE" sortKey="edge" sort={t.sort} onToggle={t.toggleSort} />
        <div>ACTION</div>
      </div>

      {t.shown === 0 ? (
        <EmptyFiltered summary={t.summary} unit="players" />
      ) : (
        pageRows.map((p, i) => {
          const edgePct = p._edgePct
          const excluded = p._excludedByGuard
          const edgeColor = edgePct != null
            ? edgePct >= 10 ? C.signalCyan
            : edgePct >= 5  ? C.platinum
            : edgePct < 0   ? C.flagAmber
            : C.muted
            : C.muted

          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: grid,
              padding: '11px 20px',
              borderBottom: i < pageRows.length - 1 ? `1px solid ${C.border}` : 'none',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '13px', color: C.platinum }}>
                  {p.player_name}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim }}>
                  {p.team} · {p.is_starter ? 'Starter' : 'Bench'}
                </div>
              </div>
              <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px' }}>{p.position || '—'}</div>
              {cols.map((c, ci) => {
                const v = p[c.key]
                return (
                  <div key={c.key} style={{
                    fontFamily: F.mono, fontWeight: 500, fontSize: '13px',
                    color: ci === 0 ? C.platinum
                      : ci === 1 ? C.signalCyan
                      : ci === 2 ? C.platinum : C.muted,
                  }}>
                    {excluded === false && typeof v === 'number'
                      ? v.toFixed(c.digits) : '—'}
                  </div>
                )
              })}
              <div style={{ fontFamily: F.mono, color: edgeColor, fontWeight: 500, fontSize: '12px' }}>
                {excluded === true
                  ? 'EXCLUDED BY GUARD'
                  : excluded === null
                    ? 'GUARD UNAVAILABLE'
                    : edgePct != null
                      ? `${edgePct > 0 ? '+' : ''}${edgePct.toFixed(1)}%`
                      : '—'}
              </div>
              <div>
                <form action="/api/picks" method="POST">
                  <input type="hidden" name="player_name"   value={p.player_name} />
                  <input type="hidden" name="projection_id" value={p.id} />
                  <button
                    type="submit"
                    disabled={excluded !== false}
                    style={{
                      background: 'transparent', border: `1px solid ${C.borderEmphasis}`,
                      padding: '5px 10px', color: C.signalCyan,
                      fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                      letterSpacing: '0.08em',
                      cursor: excluded === false ? 'pointer' : 'not-allowed',
                      opacity: excluded === false ? 1 : 0.45,
                    }}
                  >
                    + ADD
                  </button>
                </form>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
