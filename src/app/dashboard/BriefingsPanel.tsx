'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BRAND } from '@/config/brand'
import type { Sport } from '@/lib/sport'
import { editionLabel, formatBriefingRange, formatBriefingTimestamp, type Briefing } from '@/lib/briefings'
import { type FilterDef, dateRangeFilter, rankBy } from '@/lib/picks/filters'
import { useTableFilters } from '@/components/filters/useTableFilters'
import FilterBar, { EmptyFiltered } from '@/components/filters/FilterBar'

const C = BRAND.colors
const F = BRAND.fonts

const EDITION_ORDER = ['daily', 'weekly', 'alert'] as const
const STATUS_ORDER = ['published', 'unpublished', 'draft'] as const

export default function BriefingsPanel({ rows, sport }: { rows: Briefing[]; sport: Sport }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ title: string; subtitle: string; body_md: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const filters = useMemo<FilterDef<Briefing>[]>(() => [
    { key: 'edition_type', label: 'EDITION TYPE', kind: 'select', get: row => row.edition_type, order: rankBy(EDITION_ORDER), format: value => editionLabel(value as Briefing['edition_type']) },
    { key: 'status', label: 'STATUS', kind: 'select', get: row => row.status, order: rankBy(STATUS_ORDER), format: value => value.toUpperCase() },
    dateRangeFilter(row => row.generated_at?.slice(0, 10), 'GENERATED DATE'),
  ], [])
  const table = useTableFilters({ rows, filters, resetKey: sport })

  function beginEdit(row: Briefing) {
    setEditing(row.id)
    setDraft({ title: row.title, subtitle: row.subtitle ?? '', body_md: row.body_md })
    setError(null)
  }

  async function mutate(payload: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey)
    setError(null)
    try {
      const response = await fetch('/api/operator/briefings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sport }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`)
      router.refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save briefing')
      return false
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit(row: Briefing) {
    if (!draft) return
    const saved = await mutate({ action: 'edit', id: row.id, ...draft }, `edit-${row.id}`)
    if (saved) { setEditing(null); setDraft(null) }
  }

  return (
    <section style={{ background: C.panel, border: `1px solid ${C.border}`, marginTop: '24px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ color: C.signalCyan, fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.12em' }}>// BRIEFING EDITIONS</div>
        <div style={{ color: C.dim, fontFamily: F.mono, fontSize: '10px', letterSpacing: '0.06em', marginTop: '5px' }}>AUTOMATICALLY PUBLISHED · OPERATOR EDITABLE</div>
      </div>
      <div style={{ padding: '14px 20px 4px' }}>
        <FilterBar filters={table.visibleFilters} options={table.options} state={table.state} setFilter={table.setFilter} shown={table.shown} total={table.total} activeCount={table.activeCount} onClear={table.clearAll} unit="editions" />
      </div>
      {error && <div style={{ color: C.flagAmber, fontFamily: F.mono, fontSize: '11px', padding: '0 20px 12px' }}>⚠ {error}</div>}
      {table.shown === 0 ? <EmptyFiltered summary={table.summary} unit="editions" /> : (
        <div style={{ padding: '0 20px 14px' }}>
          {table.filtered.map((briefing, index) => {
            const isEditing = editing === briefing.id
            const isBusy = busy != null
            return (
              <div key={briefing.id} style={{ borderTop: index === 0 ? 'none' : `1px solid ${C.border}`, padding: '15px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <a href={`/insights/${briefing.slug}`} style={{ color: C.platinum, fontFamily: F.sans, fontSize: '16px', fontWeight: 500, textDecoration: 'none' }}>{briefing.title}</a>
                    <div style={{ color: C.dim, fontFamily: F.mono, fontSize: '10px', letterSpacing: '0.05em', marginTop: '5px' }}>
                      {editionLabel(briefing.edition_type)} · {briefing.status.toUpperCase()} · GENERATED {formatBriefingTimestamp(briefing.generated_at)}
                    </div>
                    <div style={{ color: C.faint, fontFamily: F.mono, fontSize: '10px', marginTop: '4px' }}>{formatBriefingRange(briefing.game_date_start, briefing.game_date_end)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '7px' }}>
                    <button onClick={() => mutate({ action: 'status', id: briefing.id, status: briefing.status === 'published' ? 'unpublished' : 'published' }, `status-${briefing.id}`)} disabled={isBusy} style={actionButton(briefing.status === 'published' ? C.flagAmber : C.signalCyan)}>
                      {briefing.status === 'published' ? 'UNPUBLISH' : 'REPUBLISH'}
                    </button>
                    <button onClick={() => isEditing ? (setEditing(null), setDraft(null)) : beginEdit(briefing)} disabled={isBusy} style={actionButton(C.signalCyan)}>{isEditing ? 'CANCEL' : 'EDIT'}</button>
                  </div>
                </div>
                {isEditing && draft && (
                  <div style={{ display: 'grid', gap: '9px', marginTop: '15px', padding: '14px', background: C.void, border: `1px solid ${C.border}` }}>
                    <label style={labelStyle}>TITLE<input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} style={inputStyle} /></label>
                    <label style={labelStyle}>SUBTITLE<input value={draft.subtitle} onChange={event => setDraft({ ...draft, subtitle: event.target.value })} style={inputStyle} /></label>
                    <label style={labelStyle}>BODY MARKDOWN<textarea value={draft.body_md} onChange={event => setDraft({ ...draft, body_md: event.target.value })} rows={14} style={{ ...inputStyle, resize: 'vertical' }} /></label>
                    <div><button onClick={() => saveEdit(briefing)} disabled={isBusy} style={actionButton(C.signalCyan)}>{busy === `edit-${briefing.id}` ? 'SAVING…' : 'SAVE EDIT'}</button></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

const labelStyle: React.CSSProperties = { color: C.dim, display: 'grid', fontFamily: F.mono, fontSize: '10px', gap: '5px', letterSpacing: '0.07em' }
const inputStyle: React.CSSProperties = { background: C.panel, border: `1px solid ${C.border}`, boxSizing: 'border-box', color: C.platinum, fontFamily: F.mono, fontSize: '12px', padding: '8px', width: '100%' }
function actionButton(color: string): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${color}`, color, cursor: 'pointer', fontFamily: F.mono, fontSize: '10px', letterSpacing: '0.07em', padding: '6px 8px' }
}
