'use client'

import { BRAND } from '@/config/brand'
import type { SortState } from '@/lib/picks/filters'

const C = BRAND.colors
const F = BRAND.fonts

/**
 * A clickable column header for numeric/date columns. Click to sort ascending,
 * click the active column again to reverse. Shares the hook's sort state, so
 * only one column sorts at a time. Non-sortable headers stay plain <div>s.
 */
export default function SortableHeader({
  label, sortKey, sort, onToggle, align = 'left',
}: {
  label: string
  sortKey: string
  sort: SortState | null
  onToggle: (key: string) => void
  align?: 'left' | 'right' | 'center'
}) {
  const active = sort?.key === sortKey
  const arrow = active ? (sort!.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'
  return (
    <button
      onClick={() => onToggle(sortKey)}
      style={{
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em',
        color: active ? C.signalCyan : C.dim,
        textAlign: align, width: '100%',
        display: 'block',
      }}
      title="Sort"
    >
      {label}<span style={{ opacity: active ? 1 : 0.4 }}>{arrow}</span>
    </button>
  )
}
