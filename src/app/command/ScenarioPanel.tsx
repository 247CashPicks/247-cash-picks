'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ProjectionScenario, ProjectionScenarioAuditEvent, ProjectionScenarioField,
  ProjectionScenarioGameOption, ProjectionScenarioOptions,
  ProjectionScenarioSourceResponse,
} from '@/lib/operator/client'
import { easternToday } from '@/lib/time/eastern'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const control: React.CSSProperties = {
  width: '100%', minHeight: '32px', padding: '5px 8px', borderRadius: '3px',
  border: '1px solid var(--steel-line)', color: 'var(--steel-bright)',
  background: 'var(--navy-void)', fontFamily: 'var(--font-mono)',
}
const button: React.CSSProperties = {
  ...mono, fontSize: '11px', letterSpacing: '0.07em', padding: '7px 11px',
  cursor: 'pointer', color: 'var(--blue)', background: 'transparent',
  border: '1px solid var(--steel-line)', borderRadius: '3px',
}

function apiError(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    return (detail as { error?: string }).error ?? JSON.stringify(detail)
  }
  return `Request failed (${status})`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store', ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(apiError(body, response.status))
  return body as T
}

function equal(a: unknown, b: unknown) {
  return a === b || (a == null && b == null)
}

function display(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF'
  return String(value)
}

function gameLabel(game: ProjectionScenarioGameOption) {
  const matchup = `${game.away_team ?? 'Away'} @ ${game.home_team ?? 'Home'}`
  if (!game.tip_time) return matchup
  return `${matchup} · ${new Date(game.tip_time).toLocaleTimeString([], {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })}`
}

function initialValues(source: ProjectionScenarioSourceResponse | null,
                       scenario: ProjectionScenario | null) {
  if (!source) return {}
  return Object.fromEntries(source.fields.map((field) => [
    field.key,
    scenario?.overrides[field.key] ?? source.source.inputs[field.key] ?? '',
  ]))
}

/**
 * NBA-only what-if editor. The browser never calculates a projection; every
 * Apply action waits for the canonical backend engine and renders its answer.
 */
export default function ScenarioPanel() {
  const [date, setDate] = useState(easternToday())
  const [options, setOptions] = useState<ProjectionScenarioOptions | null>(null)
  const [gameId, setGameId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [source, setSource] = useState<ProjectionScenarioSourceResponse | null>(null)
  const [scenario, setScenario] = useState<ProjectionScenario | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [reason, setReason] = useState('')
  const [audit, setAudit] = useState<ProjectionScenarioAuditEvent[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOptions = useCallback(async (day: string) => {
    setBusy('options'); setError(null)
    try {
      const data = await request<ProjectionScenarioOptions>(
        `/api/operator/projection-scenarios/options?game_date=${encodeURIComponent(day)}`)
      setOptions(data); setGameId(''); setPlayerName(''); setSource(null)
      setScenario(null); setAudit([]); setValues({})
    } catch (e) {
      setOptions(null); setError(e instanceof Error ? e.message : 'Could not load slate.')
    } finally { setBusy(null) }
  }, [])

  useEffect(() => { void loadOptions(date) }, [date, loadOptions])

  const selectedGame = options?.games.find((game) => game.id === gameId) ?? null

  const loadSource = useCallback(async (nextGameId: string, nextPlayer: string) => {
    if (!nextGameId || !nextPlayer) return
    setBusy('source'); setError(null); setScenario(null); setAudit([])
    try {
      const data = await request<ProjectionScenarioSourceResponse>(
        `/api/operator/projection-scenarios/source?game_id=${encodeURIComponent(nextGameId)}`
        + `&player_name=${encodeURIComponent(nextPlayer)}`)
      setSource(data); setValues(initialValues(data, null))
    } catch (e) {
      setSource(null); setValues({})
      setError(e instanceof Error ? e.message : 'Could not load scenario source.')
    } finally { setBusy(null) }
  }, [])

  const loadAudit = useCallback(async (id: string) => {
    const data = await request<{ events: ProjectionScenarioAuditEvent[] }>(
      `/api/operator/projection-scenarios/${id}/audit`)
    setAudit(data.events)
  }, [])

  const pendingOverrides = useMemo(() => {
    if (!source) return {}
    const original = source.source.inputs
    const current = scenario?.overrides ?? {}
    const changes: Record<string, unknown> = {}
    for (const field of source.fields) {
      const next = values[field.key]
      const now = current[field.key] ?? original[field.key]
      if (equal(next, now)) continue
      changes[field.key] = equal(next, original[field.key]) ? null : next
    }
    return changes
  }, [source, scenario, values])

  async function apply() {
    if (!source || !reason.trim()) {
      setError('Enter a reason before creating or changing a scenario.')
      return
    }
    if (scenario && Object.keys(pendingOverrides).length === 0) {
      setError('No effective field changes to apply.')
      return
    }
    setBusy('apply'); setError(null)
    try {
      const next = scenario
        ? await request<ProjectionScenario>(
            `/api/operator/projection-scenarios/${scenario.id}`,
            { method: 'PATCH', body: JSON.stringify({
              overrides: pendingOverrides, reason: reason.trim(),
            }) })
        : await request<ProjectionScenario>('/api/operator/projection-scenarios', {
            method: 'POST', body: JSON.stringify({
              league: 'NBA', game_id: source.source.game_id,
              player_name: source.source.player_name,
              overrides: pendingOverrides, reason: reason.trim(),
            }),
          })
      setScenario(next); setValues(initialValues(source, next)); setReason('')
      await loadAudit(next.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scenario update failed.')
    } finally { setBusy(null) }
  }

  async function scenarioAction(action: 'reset' | 'finalize') {
    if (!scenario || !reason.trim()) {
      setError('Enter a reason before resetting or finalizing.')
      return
    }
    setBusy(action); setError(null)
    try {
      const next = await request<ProjectionScenario>(
        `/api/operator/projection-scenarios/${scenario.id}/${action}`, {
          method: 'POST', body: JSON.stringify(
            action === 'reset'
              ? { fields: null, reason: reason.trim() }
              : { reason: reason.trim() }),
        })
      setScenario(next); setValues(initialValues(source, next)); setReason('')
      await loadAudit(next.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not ${action} scenario.`)
    } finally { setBusy(null) }
  }

  const timing = scenario?.timing ?? source?.timing
  const outputs = scenario?.outputs ?? source?.original_outputs

  return (
    <div style={{ padding: 'var(--pad)', display: 'grid', gap: '14px' }}>
      <div style={{ display: 'grid', gap: '10px',
                    gridTemplateColumns: 'minmax(150px,.7fr) 1fr 1.3fr' }}>
        <label style={{ fontSize: '12px' }}>GAME DATE
          <input aria-label="Game date" type="date" value={date}
            onChange={(event) => setDate(event.target.value)} style={control} />
        </label>
        <label style={{ fontSize: '12px' }}>GAME
          <select aria-label="Game" value={gameId} style={control}
            onChange={(event) => {
              setGameId(event.target.value); setPlayerName(''); setSource(null)
              setScenario(null); setAudit([]); setValues({})
            }}>
            <option value="">Select a game</option>
            {options?.games.map((game) => (
              <option key={game.id} value={game.id}>{gameLabel(game)}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '12px' }}>PLAYER
          <select aria-label="Player" value={playerName} style={control}
            disabled={!selectedGame}
            onChange={(event) => {
              const value = event.target.value
              setPlayerName(value); void loadSource(gameId, value)
            }}>
            <option value="">Select a player</option>
            {selectedGame?.players.map((player) => (
              <option key={player.player_name} value={player.player_name}>
                {player.player_name} · {player.team ?? '—'} · {player.position ?? '—'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {busy === 'options' && <p style={{ color: 'var(--steel)' }}>Loading tracked NBA slate…</p>}
      {!busy && options && options.games.length === 0 && (
        <p style={{ color: 'var(--steel)' }}>No tracked NBA games for {date}.</p>
      )}
      {error && <p role="alert" style={{ color: 'var(--alert)' }}>{error}</p>}

      {source && (
        <>
          {timing?.inside_final_30 && (
            <div role="alert" style={{ border: '1px solid var(--amber)',
              color: 'var(--amber)', padding: '9px 12px', ...mono }}>
              FINAL 30 MINUTES · {timing.minutes_to_tip} MIN TO TIP · REVIEW CAREFULLY
            </div>
          )}
          {timing?.game_started && (
            <div role="alert" style={{ border: '1px solid var(--alert)',
              color: 'var(--alert)', padding: '9px 12px', ...mono }}>
              GAME STARTED · EDITING IS CLOSED
            </div>
          )}

          <div style={{ display: 'grid', gap: '10px',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))' }}>
            {Object.entries(outputs ?? {}).map(([key, value]) => (
              <div key={key} style={{ background: 'var(--navy-raised)', padding: '10px' }}>
                <div style={{ ...mono, color: 'var(--steel)', fontSize: '10px' }}>
                  {key.replaceAll('_', ' ').toUpperCase()}
                </div>
                <strong style={{ ...mono, fontSize: '18px' }}>{display(value)}</strong>
              </div>
            ))}
          </div>

          <ScenarioFields fields={source.fields} original={source.source.inputs}
            overrides={scenario?.overrides ?? {}} values={values}
            disabled={scenario?.status === 'finalized' || !!timing?.game_started}
            onChange={(key, value) => setValues((old) => ({ ...old, [key]: value }))} />

          <div style={{ display: 'grid', gap: '10px',
                        gridTemplateColumns: 'minmax(260px,1fr) auto auto auto' }}>
            <label style={{ fontSize: '12px' }}>AUDIT REASON
              <input aria-label="Audit reason" value={reason} style={control}
                onChange={(event) => setReason(event.target.value)}
                placeholder="What changed, and why?" />
            </label>
            <button type="button" style={button} onClick={() => void apply()}
              disabled={!!busy || scenario?.status === 'finalized' || !!timing?.game_started}>
              {scenario ? 'APPLY & RECALCULATE' : 'CREATE DRAFT & RECALCULATE'}
            </button>
            <button type="button" style={button}
              onClick={() => void scenarioAction('reset')}
              disabled={!!busy || !scenario || scenario.status === 'finalized'
                        || Object.keys(scenario.overrides).length === 0}>
              RESET ALL
            </button>
            <button type="button" style={{ ...button, color: 'var(--lime)' }}
              onClick={() => void scenarioAction('finalize')}
              disabled={!!busy || !scenario || scenario.status === 'finalized'}>
              FINALIZE NOTE
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
            <SourceTimes source={source} />
            <AuditHistory events={audit} />
          </div>
          <p style={{ color: 'var(--steel)', fontSize: '11px', margin: 0 }}>
            Isolated what-if only. Finalizing freezes this note; it never changes
            official projections, published picks, live overrides, or selections.
          </p>
        </>
      )}
    </div>
  )
}

function ScenarioFields({ fields, original, overrides, values, disabled, onChange }: {
  fields: ProjectionScenarioField[]
  original: Record<string, unknown>
  overrides: Record<string, unknown>
  values: Record<string, unknown>
  disabled: boolean
  onChange: (key: string, value: unknown) => void
}) {
  const categories = [...new Set(fields.map((field) => field.category))]
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
        <thead><tr>
          {['FIELD', 'ORIGINAL', 'OVERRIDE', 'EFFECTIVE'].map((label) => (
            <th key={label} style={{ ...mono, textAlign: 'left', color: 'var(--steel)',
              fontSize: '10px', padding: '7px', borderBottom: '1px solid var(--steel-line)' }}>
              {label}
            </th>
          ))}
        </tr></thead>
        <tbody>{categories.map((category) => (
          <CategoryRows key={category} category={category}
            fields={fields.filter((field) => field.category === category)}
            original={original} overrides={overrides} values={values}
            disabled={disabled} onChange={onChange} />
        ))}</tbody>
      </table>
    </div>
  )
}

function CategoryRows({ category, fields, original, overrides, values, disabled, onChange }: {
  category: string; fields: ProjectionScenarioField[]
  original: Record<string, unknown>; overrides: Record<string, unknown>
  values: Record<string, unknown>; disabled: boolean
  onChange: (key: string, value: unknown) => void
}) {
  return <>
    <tr><td colSpan={4} style={{ ...mono, padding: '7px', color: 'var(--blue)',
      background: 'var(--navy-raised)', fontSize: '10px' }}>
      {category.toUpperCase()}
    </td></tr>
    {fields.map((field) => (
      <tr key={field.key}>
        <td style={{ padding: '7px', borderBottom: '1px solid var(--steel-line)' }}>
          <div>{field.label}</div>
          {field.type === 'number' && <small style={{ color: 'var(--steel)' }}>
            {field.minimum}–{field.maximum}{field.nullable ? ' · optional' : ''}
          </small>}
        </td>
        <td style={{ ...mono, padding: '7px', borderBottom: '1px solid var(--steel-line)' }}>
          {display(original[field.key])}
        </td>
        <td style={{ ...mono, padding: '7px', color: 'var(--blue)',
                     borderBottom: '1px solid var(--steel-line)' }}>
          {Object.hasOwn(overrides, field.key) ? display(overrides[field.key]) : '—'}
        </td>
        <td style={{ padding: '7px', borderBottom: '1px solid var(--steel-line)' }}>
          {field.type === 'boolean' ? (
            <label style={{ ...mono, display: 'inline-flex', gap: '7px' }}>
              <input aria-label={field.label} type="checkbox"
                checked={values[field.key] === true} disabled={disabled}
                onChange={(event) => onChange(field.key, event.target.checked)} />
              {values[field.key] === true ? 'ON' : 'OFF'}
            </label>
          ) : (
            <input aria-label={field.label} type="number" value={String(values[field.key] ?? '')}
              min={field.minimum} max={field.maximum} step="any" disabled={disabled}
              style={{ ...control, maxWidth: '150px' }}
              onChange={(event) => onChange(field.key,
                event.target.value === '' ? null : Number(event.target.value))} />
          )}
        </td>
      </tr>
    ))}
  </>
}

function SourceTimes({ source }: { source: ProjectionScenarioSourceResponse }) {
  return <div>
    <div style={{ ...mono, color: 'var(--blue)', fontSize: '10px', marginBottom: '6px' }}>
      SOURCE SNAPSHOT
    </div>
    <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '4px 10px',
                 fontSize: '11px' }}>
      <dt>Game start</dt><dd style={mono}>{source.timing.game_start}</dd>
      <dt>Server time</dt><dd style={mono}>{source.timing.server_time}</dd>
      {Object.entries(source.source.source_timestamps).map(([key, value]) => <span key={key}
        style={{ display: 'contents' }}><dt>{key.replaceAll('_', ' ')}</dt>
        <dd style={mono}>{value ?? 'not supplied'}</dd></span>)}
      <dt>Config</dt><dd style={mono}>{source.source.indicator_config.name
        ?? source.source.indicator_config.id ?? source.source.indicator_config.source}</dd>
    </dl>
  </div>
}

function AuditHistory({ events }: { events: ProjectionScenarioAuditEvent[] }) {
  return <div>
    <div style={{ ...mono, color: 'var(--blue)', fontSize: '10px', marginBottom: '6px' }}>
      IMMUTABLE AUDIT · {events.length}
    </div>
    {events.length === 0 ? <p style={{ color: 'var(--steel)', fontSize: '11px' }}>
      Create a draft to begin its audit history.
    </p> : <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
      {events.map((event) => <div key={event.id} style={{ padding: '6px 0',
        borderBottom: '1px solid var(--steel-line)', fontSize: '11px' }}>
        <strong style={mono}>{event.action.toUpperCase()}</strong>
        {event.field && ` · ${event.field}`} · {event.actor_display_name}
        <div style={{ color: 'var(--steel)' }}>{event.reason}</div>
        <time style={{ ...mono, color: 'var(--steel)' }}>{event.created_at}</time>
      </div>)}
    </div>}
  </div>
}
