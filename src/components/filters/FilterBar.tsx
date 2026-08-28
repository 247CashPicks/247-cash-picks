'use client'

import { BRAND } from '@/config/brand'
import type { FilterDef, FilterState, Option } from '@/lib/picks/filters'
import { isFieldActive } from '@/lib/picks/filters'

const C = BRAND.colors
const F = BRAND.fonts

const labelStyle: React.CSSProperties = {
  fontFamily: F.mono, fontSize: '9px', color: C.dim,
  fontWeight: 500, letterSpacing: '0.1em', marginBottom: '5px',
}
const controlStyle: React.CSSProperties = {
  background: C.void, border: `1px solid ${C.border}`, color: C.platinum,
  fontFamily: F.mono, fontSize: '11px', padding: '5px 7px', width: '100%',
}

/**
 * The shared filter bar. Renders one control per visible field (dropdown,
 * numeric min/max, or date from/to), a "shown of total" count, and CLEAR ALL.
 * Purely presentational — all state lives in useTableFilters.
 */
export default function FilterBar<R>({
  filters, options, state, setFilter, shown, total, activeCount, onClear, unit = 'rows', showCount = true,
}: {
  filters: readonly FilterDef<R>[]
  options: Record<string, Option[]>
  state: FilterState
  setFilter: (key: string, patch: Partial<{ value: string; min: string; max: string }>) => void
  shown: number
  total: number
  activeCount: number
  onClear: () => void
  unit?: string
  /** Hide the "N of M" span when a surface renders its own (e.g. paginated) count. */
  showCount?: boolean
}) {
  if (filters.length === 0) return null

  return (
    <div style={{
      background: C.void, border: `1px solid ${C.border}`,
      padding: '12px 14px', marginBottom: '14px',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'flex-end' }}>
        {filters.map(def => {
          const s = state[def.key] ?? {}
          if (def.kind === 'select') {
            return (
              <div key={def.key} style={{ minWidth: '120px' }}>
                <div style={labelStyle}>{def.label}</div>
                <select
                  value={s.value ?? ''}
                  onChange={e => setFilter(def.key, { value: e.target.value })}
                  style={{ ...controlStyle, cursor: 'pointer' }}
                >
                  <option value="">ALL</option>
                  {(options[def.key] ?? []).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )
          }
          const isDate = def.kind === 'dateRange'
          const type = isDate ? 'date' : 'number'
          const width = isDate ? '130px' : '72px'
          return (
            <div key={def.key}>
              <div style={labelStyle}>{def.label}</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type={type}
                  value={s.min ?? ''}
                  placeholder={isDate ? '' : 'min'}
                  onChange={e => setFilter(def.key, { min: e.target.value })}
                  style={{ ...controlStyle, width }}
                />
                <span style={{ color: C.faint, fontFamily: F.mono, fontSize: '10px' }}>–</span>
                <input
                  type={type}
                  value={s.max ?? ''}
                  placeholder={isDate ? '' : 'max'}
                  onChange={e => setFilter(def.key, { max: e.target.value })}
                  style={{ ...controlStyle, width }}
                />
              </div>
            </div>
          )
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showCount && (
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {shown === total ? `${total} ${unit}` : `${shown} of ${total} ${unit}`}
            </span>
          )}
          {activeCount > 0 && (
            <button
              onClick={onClear}
              style={{
                background: 'transparent', border: `1px solid ${C.borderEmphasis}`,
                color: C.signalCyan, fontFamily: F.mono, fontSize: '10px',
                letterSpacing: '0.08em', padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              CLEAR ALL
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** The "0 rows, and here's why" line — names the active filters so an empty
 *  result reads as "too narrow", never "broken". */
export function EmptyFiltered({ summary, unit = 'rows' }: { summary: string; unit?: string }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', fontFamily: F.mono, fontSize: '12px', color: C.muted, lineHeight: 1.7 }}>
      No {unit} match the active filters.
      {summary && (
        <div style={{ marginTop: '8px', color: C.faint, fontSize: '11px', letterSpacing: '0.04em' }}>
          {summary}
        </div>
      )}
    </div>
  )
}

export function isActive(state: FilterState, key: string): boolean {
  return isFieldActive(state[key])
}
