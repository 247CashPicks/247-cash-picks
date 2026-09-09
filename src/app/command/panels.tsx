'use client'

import { useState } from 'react'
import type {
  AuditEntry, CompareResponse, Indicator, IndicatorConfig,
  IndicatorsResponse, OperatorMe, StagedSelection,
} from '@/lib/operator/client'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const num: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
}
const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
  padding: '5px 10px', cursor: 'pointer', background: 'transparent',
  color: 'var(--blue)', border: '1px solid var(--steel-line)', borderRadius: '3px',
}
const th: React.CSSProperties = {
  ...mono, fontSize: '10px', letterSpacing: '0.1em', color: 'var(--steel)',
  textAlign: 'left', padding: '6px 10px',
  borderBottom: '1px solid var(--steel-line)', fontWeight: 500,
}
const td: React.CSSProperties = {
  padding: '6px 10px', borderBottom: '1px solid var(--steel-line)',
  fontSize: '13px',
}

/** A panel renders its own error. A panel that fails must never render blank. */
export function Panel({ title, error, children }: {
  title: string; error: string | null; children?: React.ReactNode
}) {
  return (
    <section className="dn-panel" aria-label={title}>
      <div style={{ padding: '10px var(--pad)',
                    borderBottom: '1px solid var(--steel-line)',
                    ...mono, fontSize: '11px', letterSpacing: '0.12em',
                    color: 'var(--blue)' }}>
        {title.toUpperCase()}
      </div>
      {error ? (
        <p role="alert" style={{ padding: 'var(--pad)', margin: 0,
                                 color: 'var(--alert)', fontSize: '13px' }}>
          {error}
        </p>
      ) : (children ?? (
        <p style={{ padding: 'var(--pad)', margin: 0, color: 'var(--steel)',
                    fontSize: '13px' }}>Loading…</p>
      ))}
    </section>
  )
}

// ── 1. Indicators ───────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['projection_factor', 'confidence', 'selection', 'guard',
                        'diagnostic'] as const

/** A verdict that measured a factor WORSE, while the factor is on. That
 *  contradiction is the whole reason the number sits beside the switch. */
export function contradictsVerdict(i: Indicator): boolean {
  if (!i.backtest_verdict) return false
  const on = i.value_type === 'boolean' ? i.value === true : true
  if (!on) return false
  const v = i.backtest_verdict.toUpperCase()
  return v.startsWith('FAILED') || v.startsWith('WORSE')
    || v.includes('PREMISE UNSUPPORTED')
}

export function VerdictChip({ i }: { i: Indicator }) {
  if (!i.backtest_verdict) return null
  const bad = contradictsVerdict(i)
  return (
    <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--steel)' }}>
      <span style={{ ...mono, fontSize: '10px', letterSpacing: '0.06em',
                     color: bad ? 'var(--amber)' : 'var(--steel)' }}>
        {i.backtest_verdict}
      </span>
      {i.backtest_effect && (
        <span style={{ display: 'block', marginTop: '2px' }}>
          {Object.entries(i.backtest_effect).map(([stat, e]) => {
            const d = e.mae_delta ?? e.delta
            if (d === undefined) return null
            return (
              <span key={stat} style={{ ...mono, fontSize: '10px',
                                        marginRight: '10px' }}>
                {stat} {d > 0 ? '+' : ''}{d}
                {e.ci && ` [${e.ci[0]}, ${e.ci[1]}]`}
              </span>
            )
          })}
        </span>
      )}
      {i.backtest_report_path && (
        <a href={`https://github.com/247CashPicks/datanexus-backend/blob/main/${i.backtest_report_path}`}
           target="_blank" rel="noreferrer"
           style={{ ...mono, fontSize: '10px', color: 'var(--blue)' }}>
          {i.backtest_report_path}
        </a>
      )}
    </div>
  )
}

export function IndicatorsPanel({ data, editing, onChanged }: {
  data: IndicatorsResponse
  editing: IndicatorConfig | null
  onChanged: () => void
}) {
  const [pending, setPending] = useState<string | null>(null)
  const [rejection, setRejection] = useState<{ key: string; message: string } | null>(null)

  async function setValue(i: Indicator, value: boolean | number) {
    if (!editing) return
    setPending(i.key)
    setRejection(null)
    const res = await fetch(
      `/api/operator/indicator-configs/${editing.id}/values`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: { [i.key]: value } }) })
    setPending(null)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const d = body?.detail
      // Surfaced VERBATIM. A bounds or constraint rejection is the most useful
      // sentence on this screen; rewording it makes it unactionable.
      setRejection({ key: i.key,
                     message: (typeof d === 'string' ? d : d?.error)
                              ?? `Rejected (${res.status})` })
      return
    }
    onChanged()
  }

  const grouped = CATEGORY_ORDER.map((c) => ({
    category: c,
    rows: data.indicators.filter((i) => i.category === c),
  })).filter((g) => g.rows.length > 0)

  return (
    <div>
      <p style={{ padding: '8px var(--pad)', margin: 0, fontSize: '12px',
                  color: 'var(--steel)' }}>
        {editing
          ? <>Editing <strong style={mono}>{editing.name}</strong> — changes save immediately.</>
          : <>Showing the live configuration. Select a preview to edit.</>}
      </p>
      {grouped.map(({ category, rows }) => (
        <div key={category}>
          <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em',
                        color: 'var(--steel)', padding: '8px var(--pad) 4px',
                        background: 'var(--navy-raised)' }}>
            {category.replace('_', ' ').toUpperCase()} · {rows.length}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((i) => (
                <tr key={i.key}>
                  <td style={{ ...td, width: '46%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{i.display_name}</span>
                      {contradictsVerdict(i) && (
                        <span title="Live state contradicts its own measurement"
                              style={{ ...mono, fontSize: '9px',
                                       color: 'var(--navy-void)',
                                       background: 'var(--amber)',
                                       padding: '1px 5px', borderRadius: '2px' }}>
                          CONTRADICTS MEASUREMENT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--steel)',
                                  marginTop: '2px' }}>{i.description}</div>
                    <VerdictChip i={i} />
                  </td>
                  <td style={{ ...td, ...num, width: '14%' }}>
                    <span style={{ color: 'var(--steel-bright)' }}>
                      {typeof i.value === 'boolean'
                        ? (i.value ? 'ON' : 'OFF') : i.value}
                    </span>
                    {i.min_value !== null && (
                      <div style={{ fontSize: '10px', color: 'var(--steel)' }}>
                        {i.min_value}–{i.max_value}
                        {i.bounds_source && ` · ${i.bounds_source}`}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, width: '40%' }}>
                    <IndicatorControl
                      i={i} editable={!!editing} busy={pending === i.key}
                      onSet={(v) => setValue(i, v)} />
                    {rejection?.key === i.key && (
                      <p role="alert" style={{ margin: '4px 0 0', fontSize: '11px',
                                               color: 'var(--alert)' }}>
                        {rejection.message}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function IndicatorControl({ i, editable, busy, onSet }: {
  i: Indicator; editable: boolean; busy: boolean
  onSet: (v: boolean | number) => void
}) {
  const [draft, setDraft] = useState<string>(String(i.value))

  if (!i.toggleable) {
    return (
      <span style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
        correctness — not switchable
      </span>
    )
  }
  // A numeric whose bounds collapse to one value is fixed by definition
  // (DOME_WEATHER_MULT is exactly 1.0, never 0.999).
  if (i.value_type === 'numeric' && i.min_value === i.max_value) {
    return (
      <span style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
        fixed at {i.min_value}
      </span>
    )
  }
  if (i.value_type === 'boolean') {
    return (
      <button type="button" disabled={!editable || busy}
        aria-pressed={i.value === true}
        onClick={() => onSet(!(i.value as boolean))}
        style={{ ...btn, opacity: editable ? 1 : 0.45,
                 cursor: editable ? 'pointer' : 'not-allowed',
                 color: i.value ? 'var(--lime)' : 'var(--steel)' }}>
        {i.value ? 'ON' : 'OFF'}
      </button>
    )
  }
  return (
    <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
      <input type="number" value={draft} disabled={!editable || busy}
        min={i.min_value ?? undefined} max={i.max_value ?? undefined}
        step="any" aria-label={`${i.display_name} value`}
        onChange={(e) => setDraft(e.target.value)}
        style={{ ...num, width: '110px', padding: '4px 6px',
                 background: 'var(--navy-raised)', color: 'var(--steel-bright)',
                 border: '1px solid var(--steel-line)', borderRadius: '3px' }} />
      <button type="button" disabled={!editable || busy || draft === String(i.value)}
        onClick={() => onSet(Number(draft))} style={btn}>
        SET
      </button>
    </span>
  )
}

// ── 2. Configs ──────────────────────────────────────────────────────────────

export function ConfigsPanel({ league, configs, selected, onSelect, onChanged }: {
  league: string
  configs: IndicatorConfig[]
  selected: IndicatorConfig | null
  onSelect: (c: IndicatorConfig | null) => void
  onChanged: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const live = configs.find((c) => c.status === 'live') ?? null
  const previews = configs.filter((c) => c.status === 'preview')

  async function create(cloneFrom: string | null) {
    if (!name.trim()) { setError('Name the configuration first.'); return }
    setBusy(true); setError(null)
    const res = await fetch('/api/operator/indicator-configs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ league, name, clone_from: cloneFrom }) })
    setBusy(false)
    if (!res.ok) {
      const b = await res.json().catch(() => null)
      setError(typeof b?.detail === 'string' ? b.detail
               : b?.detail?.error ?? `Failed (${res.status})`)
      return
    }
    setName(''); onChanged()
  }

  return (
    <div style={{ padding: 'var(--pad)' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em',
                      color: 'var(--steel)' }}>LIVE</div>
        {live ? (
          <div style={{ fontSize: '13px' }}>
            <strong style={{ color: 'var(--lime)' }}>{live.name}</strong>
            <div style={{ ...mono, fontSize: '11px', color: 'var(--steel)' }}>
              promoted {live.promoted_at?.slice(0, 16).replace('T', ' ') ?? '—'}
              {live.promoted_by && ` by ${live.promoted_by}`}
              {live.parent_config_id && ` · from ${live.parent_config_id.slice(0, 8)}`}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--steel)' }}>
            No live configuration seeded for {league} yet.
          </p>
        )}
      </div>

      <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em',
                    color: 'var(--steel)' }}>PREVIEWS</div>
      {previews.length === 0 && (
        <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--steel)' }}>
          None yet.
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 12px' }}>
        {previews.map((c) => (
          <li key={c.id} style={{ display: 'flex', alignItems: 'center',
                                  gap: '8px', padding: '4px 0' }}>
            <button type="button" onClick={() => onSelect(
              selected?.id === c.id ? null : c)}
              aria-pressed={selected?.id === c.id}
              style={{ ...btn, color: selected?.id === c.id
                       ? 'var(--lime)' : 'var(--blue)' }}>
              {selected?.id === c.id ? 'EDITING' : 'EDIT'}
            </button>
            <span style={{ fontSize: '13px' }}>{c.name}</span>
            <span style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
              {c.created_by} · {c.created_at.slice(0, 10)}
            </span>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="new preview name" aria-label="New preview name"
          style={{ ...mono, fontSize: '12px', padding: '5px 8px', flex: '1 1 160px',
                   background: 'var(--navy-raised)', color: 'var(--steel-bright)',
                   border: '1px solid var(--steel-line)', borderRadius: '3px' }} />
        <button type="button" disabled={busy} onClick={() => create(null)}
          style={btn}>CLONE LIVE</button>
        {selected && (
          <button type="button" disabled={busy}
            onClick={() => create(selected.id)} style={btn}>
            CLONE SELECTED
          </button>
        )}
      </div>
      {error && <p role="alert" style={{ marginTop: '6px', fontSize: '12px',
                                         color: 'var(--alert)' }}>{error}</p>}
    </div>
  )
}

// ── 3. Preview → Compare ────────────────────────────────────────────────────

export function ComparePanel({ league, config, compare, error, onCompare, onError }: {
  league: string
  config: IndicatorConfig | null
  compare: CompareResponse | null
  error: string | null
  onCompare: (c: CompareResponse | null) => void
  onError: (e: string | null) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [busy, setBusy] = useState<'run' | 'compare' | null>(null)

  if (!config) {
    return <p style={{ padding: 'var(--pad)', margin: 0, fontSize: '13px',
                       color: 'var(--steel)' }}>
      Select a preview configuration to run and compare it.
    </p>
  }

  async function call(kind: 'run' | 'compare') {
    setBusy(kind); onError(null)
    const url = kind === 'run'
      ? `/api/operator/indicator-configs/${config!.id}/preview-run`
      : `/api/operator/indicator-configs/${config!.id}/compare?start_date=${start}&end_date=${end}`
    const res = await fetch(url, kind === 'run'
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_date: start, end_date: end }) }
      : { cache: 'no-store' })
    setBusy(null)
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      // Includes the 409 "run a preview first" — shown as the API's own
      // message, never as an empty table.
      onError(typeof body?.detail === 'string' ? body.detail
              : body?.detail?.error ?? `Failed (${res.status})`)
      return
    }
    if (kind === 'compare') onCompare(body as CompareResponse)
  }

  return (
    <div style={{ padding: 'var(--pad)' }}>
      <div className="dn-progress" style={{ marginBottom: '10px' }} />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap',
                    alignItems: 'center', marginBottom: '10px' }}>
        <label style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
          FROM <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
            style={dateInput} />
        </label>
        <label style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
          TO <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
            style={dateInput} />
        </label>
        <button type="button" disabled={busy !== null} onClick={() => call('run')}
          style={btn}>{busy === 'run' ? 'RUNNING…' : 'RUN PREVIEW'}</button>
        <button type="button" disabled={busy !== null} onClick={() => call('compare')}
          style={btn}>{busy === 'compare' ? 'COMPARING…' : 'COMPARE'}</button>
      </div>

      {error && <p role="alert" style={{ fontSize: '12px', color: 'var(--alert)' }}>
        {error}</p>}

      {compare && (
        <>
          <dl style={{ display: 'grid', gap: '4px 16px', margin: '0 0 10px',
                       gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))',
                       fontSize: '12px' }}>
            <Stat label="Rows changed"
                  value={`${compare.summary.rows_changed} / ${compare.summary.rows_compared}`} />
            <Stat label="Would stage (live)" value={compare.summary.would_stage.live} />
            <Stat label="Would stage (preview)" value={compare.summary.would_stage.preview} />
            <Stat label="Difference"
                  value={`${compare.summary.would_stage_delta > 0 ? '+' : ''}${compare.summary.would_stage_delta}`}
                  tone={compare.summary.would_stage_delta === 0 ? undefined : 'var(--blue)'} />
            <Stat label="Staged affected"
                  value={compare.summary.staged_selections_affected}
                  tone={compare.summary.staged_selections_affected > 0 ? 'var(--amber)' : undefined} />
          </dl>

          {compare.staged_selection_changes.length > 0 && (
            <div style={{ border: '1px solid var(--amber)', padding: '8px',
                          marginBottom: '10px' }}>
              <div style={{ ...mono, fontSize: '10px', color: 'var(--amber)',
                            letterSpacing: '0.1em', marginBottom: '4px' }}>
                STAGED SELECTIONS THIS CONFIGURATION DISAGREES WITH
              </div>
              {compare.staged_selection_changes.map((c, idx) => (
                <div key={idx} style={{ fontSize: '12px' }}>
                  <span>{c.player_name} {c.stat} ({c.game_date}, {c.status})</span>
                  <span style={{ ...mono, fontSize: '11px', color: 'var(--steel)',
                                 marginLeft: '8px' }}>
                    {c.staged_edge_pct}% → {c.preview_edge_pct}%
                    {c.direction_change &&
                      ` · ${c.direction_change.from} → ${c.direction_change.to}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ maxHeight: '360px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Player', 'Team', 'Stat', 'Live', 'Preview', 'Δ', 'Line',
                  'Live edge', 'Preview edge'].map((h, idx) => (
                  <th key={h} style={{ ...th, textAlign: idx >= 3 ? 'right' : 'left' }}>
                    {h}</th>))}
              </tr></thead>
              <tbody>
                {compare.rows.map((r, idx) => (
                  <tr key={idx}>
                    <td style={td}>{r.player_name}</td>
                    <td style={{ ...td, ...mono, fontSize: '11px' }}>{r.team}</td>
                    <td style={{ ...td, ...mono, fontSize: '11px' }}>{r.stat}</td>
                    <td style={{ ...td, ...num }}>{r.live_projection ?? '—'}</td>
                    <td style={{ ...td, ...num }}>{r.preview_projection ?? '—'}</td>
                    <td style={{ ...td, ...num,
                                 color: r.delta === 0 ? 'var(--steel)' : 'var(--blue)' }}>
                      {r.delta > 0 ? '+' : ''}{r.delta}</td>
                    <td style={{ ...td, ...num }}>{r.line ?? '—'}</td>
                    <td style={{ ...td, ...num }}>{r.live_edge_pct ?? '—'}</td>
                    <td style={{ ...td, ...num }}>{r.preview_edge_pct ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const dateInput: React.CSSProperties = {
  ...mono, fontSize: '11px', padding: '4px 6px', marginLeft: '4px',
  background: 'var(--navy-raised)', color: 'var(--steel-bright)',
  border: '1px solid var(--steel-line)', borderRadius: '3px',
}

function Stat({ label, value, tone }: {
  label: string; value: React.ReactNode; tone?: string
}) {
  return (
    <div>
      <dt style={{ ...mono, fontSize: '10px', letterSpacing: '0.08em',
                   color: 'var(--steel)' }}>{label.toUpperCase()}</dt>
      <dd style={{ ...num, textAlign: 'left', margin: 0, fontSize: '15px',
                   color: tone ?? 'var(--steel-bright)' }}>{value}</dd>
    </div>
  )
}

// ── 4. Promote ──────────────────────────────────────────────────────────────

export function PromotePanel({ me, config, indicators, compare, onPromoted }: {
  me: OperatorMe
  config: IndicatorConfig | null
  indicators: IndicatorsResponse | null
  compare: CompareResponse | null
  onPromoted: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (!config) {
    return <p style={{ padding: 'var(--pad)', margin: 0, fontSize: '13px',
                       color: 'var(--steel)' }}>
      Select a preview configuration to promote it.
    </p>
  }

  async function promote() {
    setBusy(true); setError(null)
    const res = await fetch(`/api/operator/indicator-configs/${config!.id}/promote`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) })
    setBusy(false); setConfirming(false)
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      setError(typeof body?.detail === 'string' ? body.detail
               : body?.detail?.error ?? `Failed (${res.status})`)
      return
    }
    setDone(body?.message ?? 'Promoted.')
    onPromoted()
  }

  return (
    <div style={{ padding: 'var(--pad)' }}>
      {!me.can_promote && (
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--steel)' }}>
          Promoting a configuration requires the owner role. You can create
          previews, edit values, run previews and compare.
        </p>
      )}
      <button type="button" disabled={!me.can_promote || busy}
        onClick={() => setConfirming(true)}
        style={{ ...btn, borderColor: me.can_promote ? 'var(--lime)' : 'var(--steel-line)',
                 color: me.can_promote ? 'var(--lime)' : 'var(--steel)',
                 cursor: me.can_promote ? 'pointer' : 'not-allowed' }}>
        PROMOTE {config.name.toUpperCase()}
      </button>

      {done && <p style={{ marginTop: '8px', fontSize: '12px',
                           color: 'var(--lime)' }}>{done}</p>}
      {error && <p role="alert" style={{ marginTop: '8px', fontSize: '12px',
                                         color: 'var(--alert)' }}>{error}</p>}

      {confirming && (
        <div role="dialog" aria-modal="true" aria-label="Confirm promote"
             style={{ position: 'fixed', inset: 0, background: 'rgba(7,12,20,0.85)',
                      display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <div className="dn-panel" style={{ maxWidth: '620px', width: '92%',
                                             padding: 'var(--pad)' }}>
            <h2 style={{ ...mono, fontSize: '12px', letterSpacing: '0.12em',
                         color: 'var(--blue)', margin: '0 0 10px' }}>
              PROMOTE {config.name.toUpperCase()}
            </h2>

            <ChangedKeys indicators={indicators} />

            {compare && (
              <p style={{ fontSize: '12px', margin: '10px 0' }}>
                Would stage {compare.summary.would_stage.preview} versus{' '}
                {compare.summary.would_stage.live} live
                {' '}({compare.summary.would_stage_delta > 0 ? '+' : ''}
                {compare.summary.would_stage_delta}).
              </p>
            )}

            <p style={{ fontSize: '12px', color: 'var(--steel)' }}>
              This does not re-project anything. The next scheduled live run
              picks up the new configuration. Staged and published selections
              are untouched.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={promote} disabled={busy}
                style={{ ...btn, color: 'var(--lime)', borderColor: 'var(--lime)' }}>
                {busy ? 'PROMOTING…' : 'CONFIRM'}
              </button>
              <button type="button" onClick={() => setConfirming(false)} style={btn}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Only the keys that differ from their live value. A diff that lists every
 *  key is a diff nobody reads. */
function ChangedKeys({ indicators }: { indicators: IndicatorsResponse | null }) {
  const changed = (indicators?.indicators ?? [])
    .filter((i) => i.value !== i.default_value)
  if (changed.length === 0) {
    return <p style={{ fontSize: '12px', color: 'var(--steel)', margin: 0 }}>
      No values differ from the registry defaults.
    </p>
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {changed.map((i) => (
          <tr key={i.key}>
            <td style={{ ...td, fontSize: '12px' }}>{i.display_name}</td>
            <td style={{ ...td, ...num, fontSize: '12px', color: 'var(--steel)' }}>
              {String(i.default_value)}</td>
            <td style={{ ...td, ...num, fontSize: '12px', color: 'var(--lime)' }}>
              → {String(i.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── 5. Run health ───────────────────────────────────────────────────────────

export function RunHealthPanel({ data }: { data: Record<string, unknown> }) {
  const agents = (data.agents ?? data.rows ?? []) as Record<string, unknown>[]
  if (!Array.isArray(agents) || agents.length === 0) {
    return <p style={{ padding: 'var(--pad)', margin: 0, fontSize: '13px',
                       color: 'var(--steel)' }}>No runs recorded.</p>
  }
  const bad = agents.filter((a) => a.status === 'error' || a.stale)
  const ok = agents.filter((a) => !(a.status === 'error' || a.stale))
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        {['Agent', 'Last run', 'Trigger', 'Status'].map((h) => (
          <th key={h} style={th}>{h}</th>))}
      </tr></thead>
      <tbody>
        {[...bad, ...ok].map((a, idx) => {
          const failing = a.status === 'error' || a.stale
          return (
            <tr key={idx}>
              <td style={{ ...td, ...mono, fontSize: '12px' }}>
                {String(a.agent_name ?? a.agent ?? '—')}</td>
              <td style={{ ...td, ...mono, fontSize: '11px', textAlign: 'left',
                           color: 'var(--steel)' }}>
                {String(a.last_run ?? a.finished_at ?? a.started_at ?? '—').slice(0, 16).replace('T', ' ')}</td>
              <td style={{ ...td, ...mono, fontSize: '11px' }}>
                {String(a.triggered_by ?? '—')}</td>
              <td style={{ ...td, ...mono, fontSize: '11px',
                           color: failing ? 'var(--alert)' : 'var(--lime)' }}>
                {a.stale ? 'STALE' : String(a.status ?? '—').toUpperCase()}
                {failing && a.error_summary ? (
                  <div style={{ color: 'var(--alert)', fontSize: '11px' }}>
                    {String(a.error_summary)}
                  </div>
                ) : null}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── 6. Staged slate ─────────────────────────────────────────────────────────

export function SlatePanel({ selections }: { selections: StagedSelection[] }) {
  if (selections.length === 0) {
    return <p style={{ padding: 'var(--pad)', margin: 0, fontSize: '13px',
                       color: 'var(--steel)' }}>Nothing staged.</p>
  }
  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          {['Player', 'Stat', 'Line', 'Proj', 'Edge', 'Conf', 'Tier', 'Pulled']
            .map((h, i) => (
            <th key={h} style={{ ...th, textAlign: i >= 2 && i <= 4 ? 'right' : 'left' }}>
              {h}</th>))}
        </tr></thead>
        <tbody>
          {selections.map((s) => (
            <tr key={s.id}>
              <td style={td}>
                {s.player_name}
                <div style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
                  {s.provenance.config_name ?? 'no config'}
                  {s.provenance.agent_run_short && ` · run ${s.provenance.agent_run_short}`}
                </div>
              </td>
              <td style={{ ...td, ...mono, fontSize: '11px' }}>{s.stat_type}</td>
              <td style={{ ...td, ...num }}>{s.line}</td>
              <td style={{ ...td, ...num }}>{s.our_projection}</td>
              <td style={{ ...td, ...num }}>{s.edge_pct ?? '—'}</td>
              <td style={{ ...td, ...mono, fontSize: '11px' }}>{s.confidence}</td>
              <td style={{ ...td, ...mono, fontSize: '11px' }}>{s.tier_required}</td>
              <td style={{ ...td, ...mono, fontSize: '11px',
                           color: s.line_pulled ? 'var(--alert)' : 'var(--steel)' }}>
                {s.line_pulled ? 'PULLED' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ padding: '8px var(--pad)', margin: 0, fontSize: '12px' }}>
        {/* Confirmation stays where it lives. Duplicating the one human step
            across two screens is how it gets done twice. */}
        <a href="/dashboard/publish" style={{ color: 'var(--blue)' }}>
          Confirm selections on the publish page →
        </a>
      </p>
    </div>
  )
}

// ── Audit drawer ────────────────────────────────────────────────────────────

export function AuditDrawer({ entries, error, onClose }: {
  entries: AuditEntry[]; error: string | null; onClose: () => void
}) {
  const [indicator, setIndicator] = useState('')
  const [actor, setActor] = useState('')

  const filtered = entries.filter((e) =>
    (!indicator || (e.indicator_key ?? '').includes(indicator))
    && (!actor || e.actor.toLowerCase().includes(actor.toLowerCase())))

  return (
    <aside role="dialog" aria-modal="true" aria-label="Audit log"
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 96vw)',
               background: 'var(--navy-base)', borderLeft: '1px solid var(--steel-line)',
               overflow: 'auto', zIndex: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px var(--pad)',
                    borderBottom: '1px solid var(--steel-line)' }}>
        <strong style={{ ...mono, fontSize: '11px', letterSpacing: '0.12em',
                         color: 'var(--blue)' }}>AUDIT LOG</strong>
        <button type="button" onClick={onClose} style={{ ...btn, marginLeft: 'auto' }}>
          CLOSE
        </button>
      </div>
      <div style={{ display: 'flex', gap: '6px', padding: 'var(--pad)' }}>
        <input value={indicator} onChange={(e) => setIndicator(e.target.value)}
          placeholder="indicator" aria-label="Filter by indicator"
          style={{ ...dateInput, marginLeft: 0, flex: 1 }} />
        <input value={actor} onChange={(e) => setActor(e.target.value)}
          placeholder="actor" aria-label="Filter by actor"
          style={{ ...dateInput, marginLeft: 0, flex: 1 }} />
      </div>
      {error && <p role="alert" style={{ padding: 'var(--pad)',
                                         color: 'var(--alert)' }}>{error}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {filtered.map((e) => (
          <li key={e.id} style={{ padding: '8px var(--pad)',
                                  borderBottom: '1px solid var(--steel-line)' }}>
            <div style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
              {e.at.slice(0, 16).replace('T', ' ')} · {e.actor}
              {e.actor_user_id && ` (${e.actor_user_id.slice(0, 12)})`}
            </div>
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: 'var(--blue)' }}>{e.event}</span>
              {e.indicator_key && <span style={{ ...mono }}> {e.indicator_key}</span>}
              {e.old_value !== null && e.new_value !== null && (
                <span style={{ ...mono, color: 'var(--steel)' }}>
                  {' '}{String(e.old_value)} → {String(e.new_value)}
                </span>
              )}
            </div>
            {e.note && <div style={{ fontSize: '11px', color: 'var(--steel)' }}>
              {e.note}</div>}
          </li>
        ))}
      </ul>
    </aside>
  )
}
