'use client'

import { useId, useState } from 'react'
import type { NationalTvContext, SaveBroadcastResponse } from '@/lib/operator/client'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const control: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px',
  color: 'var(--steel-bright)', background: 'var(--navy-void)',
  border: '1px solid var(--steel-line)', borderRadius: '3px', ...mono,
}
const tone = { gray: 'var(--steel)', yellow: 'var(--amber)', red: 'var(--alert)' }

/** Presents the backend decision without deriving broadcast status or severity. */
export function NationalTvBadge({ value, playerName }: {
  value?: NationalTvContext
  playerName?: string
}) {
  const label = value?.label ?? 'NATIONAL TV — UNKNOWN'
  const reasons = value?.reasons ?? ['No verified broadcast context is available.']
  return <details style={{ marginTop: '6px', maxWidth: '440px', fontSize: '11px' }}>
    <summary aria-label={`${label}${playerName ? ` for ${playerName}` : ''}`}
      style={{ ...mono, cursor: 'pointer', color: tone[value?.color ?? 'gray'] }}>
      <span aria-hidden="true">{value?.icon ?? '?'}</span>{' '}{label}
    </summary>
    <div style={{ color: 'var(--steel-bright)', padding: '6px 0 0 14px', lineHeight: 1.55 }}>
      {value?.level === 'greater_caution' && <div>NATIONAL TV — CAUTION</div>}
      <ul style={{ margin: '0 0 6px', paddingLeft: '18px' }}>
        {reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}
      </ul>
      {value?.game_id && <div>
        Game {value.game_id} · {value.game_date} · scheduled start {value.tip_time}
      </div>}
      {value?.slate_game_count != null && <div>
        Full NBA day: {value.slate_game_count} games · {value.distinct_start_windows} distinct starts
      </div>}
      {value?.source && <div>
        <a href={value.source.url} target="_blank" rel="noreferrer"
          style={{ color: 'var(--blue)' }}>{value.source.label}</a>
        <div>Observed <time dateTime={value.source.observed_at}>{value.source.observed_at}</time></div>
        <div>Retrieved <time dateTime={value.source.retrieved_at}>{value.source.retrieved_at}</time>
          {' '}· maximum age {value.source.max_age_hours} hours</div>
        <div>Written rights reference: {value.source.rights_reference}</div>
      </div>}
      {value?.snapshot_id && <div style={{ overflowWrap: 'anywhere' }}>
        Audit {value.snapshot_id} · SHA-256 {value.snapshot_sha256}
      </div>}
      <div>Review advisory only. Broadcasting does not establish player performance.</div>
    </div>
  </details>
}

export default function NationalTvPanel({ onChanged }: {
  onChanged: () => void | Promise<void>
}) {
  const id = useId()
  const [text, setText] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SaveBroadcastResponse | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError(null)
    let snapshot: unknown
    try {
      snapshot = JSON.parse(text)
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        throw new Error('Enter one full-day broadcast snapshot object.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Snapshot JSON is invalid.')
      return
    }
    if (!reason.trim()) { setError('An audit reason is required.'); return }
    setBusy(true)
    setSaved(null)
    try {
      const response = await fetch('/api/operator/nba-national-tv/snapshots', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot, reason: reason.trim() }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const detail = body?.detail
        setError(typeof detail === 'string' ? detail
          : typeof detail?.error === 'string' ? detail.error : `Snapshot was not saved (${response.status}).`)
        return
      }
      const result = body as SaveBroadcastResponse | null
      if (!result?.audit_saved || !result.result || !Array.isArray(result.result.games)) {
        setError('The server did not confirm a saved broadcast audit.'); return
      }
      setSaved(result)
      try { await onChanged() } catch {
        setError('Broadcast audit saved; the staged slate could not refresh. Refresh the page to review it.')
      }
    } catch {
      setError('Broadcast snapshot could not be saved. Existing slate review remains available.')
    } finally { setBusy(false) }
  }

  return <section aria-label="National TV broadcast evidence"
    style={{ padding: 'var(--pad)', color: 'var(--steel-bright)', fontSize: '12px', lineHeight: 1.55 }}>
    <p style={{ marginTop: 0 }}>
      National games show NATIONAL TV — CAUTION. An NBA day with four or fewer games,
      each at a distinct scheduled start, shows SMALL NATIONAL-TV SLATE — GREATER CAUTION.
      These are review cautions; projections and selection order stay unchanged.
    </p>
    <p>No approved broadcast feed is configured. Player rows remain Unknown until a permitted,
      fresh full-day snapshot matches the NBA schedule. Import is restricted to protected Preview.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor={`${id}-snapshot`}>Full NBA day broadcast snapshot JSON</label>
      <textarea id={`${id}-snapshot`} value={text} onChange={event => setText(event.target.value)}
        required rows={9} spellCheck={false} style={control} aria-describedby={`${id}-help`} />
      <p id={`${id}-help`}>
        Include slate_date, source_label, source_url, provider_terms_url, rights_reference,
        commercial_use_authorized, terms_reviewed, coverage_complete, identity_matched,
        observed_at, retrieved_at, and games. Each game needs game_id, game_date, tip_time,
        home_team, away_team, national, and networks. Use exact canonical game IDs and
        timezone-aware timestamps. Source observations expire after 24 hours. Supply a written
        commercial display/retention rights reference; include no credentials or customer information.
      </p>
      <label htmlFor={`${id}-reason`}>Audit reason</label>
      <input id={`${id}-reason`} value={reason} onChange={event => setReason(event.target.value)}
        required maxLength={500} style={control} />
      <button type="submit" disabled={busy} style={{ ...mono, marginTop: '8px',
        padding: '8px 12px', border: '1px solid var(--steel-line)', borderRadius: '3px',
        background: 'transparent', color: 'var(--blue)', cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? 'Saving broadcast audit…' : 'Save broadcast snapshot'}
      </button>
    </form>
    {error && <p role="alert" style={{ color: 'var(--alert)' }}>{error}</p>}
    {saved && <div>
      <p role="status">Immutable broadcast audit saved · {saved.result.slate_date}
        {' '}· {saved.result.status === 'ready' ? 'verified context' : 'Unknown context'}</p>
      {saved.result.reasons.map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}
      {saved.result.games.map(game => <NationalTvBadge key={game.game_id} value={game} />)}
    </div>}
  </section>
}
