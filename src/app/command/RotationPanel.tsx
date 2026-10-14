'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  NbaRotation, NbaRotationAuditEvent, NbaRotationListResponse,
  NbaRotationMatchup, NbaRotationPlayer, NbaRotationProvenance,
  NbaPaceDriverEvidence,
} from '@/lib/operator/client'

const SOURCE_URL = 'https://github.com/sportsdataverse/sportsdataverse-data/releases/download/nba_stats_leaguedash/player_stats_advanced_2026.parquet'
const PACE_DEFINITION = 'NBA Advanced Players PACE: estimated possessions per 48 minutes while the player was on the floor; 2025-26 Regular Season.'
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const control: React.CSSProperties = {
  minHeight: '30px', padding: '4px 7px', borderRadius: '3px', width: '100%',
  border: '1px solid var(--steel-line)', color: 'var(--steel-bright)',
  background: 'var(--navy-void)', fontFamily: 'var(--font-mono)',
}
const button: React.CSSProperties = {
  ...mono, fontSize: '10px', letterSpacing: '.06em', padding: '7px 10px',
  cursor: 'pointer', color: 'var(--blue)', background: 'transparent',
  border: '1px solid var(--steel-line)', borderRadius: '3px',
}

type DraftSlot = {
  slot: number
  playerId: string
  playerName: string
  pace: string
  usage: string
  sampleGames: string
  sampleMinutes: string
  sampleConfidence: string
  sourceName: string
  sourceUrl: string
  retrievedAt: string
  sourceTeam: string
  currentTeam: string
  rosterSourceUrl: string
  rosterVerifiedAt: string
  teamPaceOn: string
  teamPaceOff: string
  opponentPaceOn: string
  opponentPaceOff: string
  driverMinutes: string
  driverGames: string
  driverConfidence: string
}

function blankSlot(slot: number): DraftSlot {
  return {
    slot, playerId: '', playerName: '', pace: '', usage: '',
    sampleGames: '', sampleMinutes: '', sampleConfidence: '',
    sourceName: 'SportsDataverse NBA Stats league-dash',
    sourceUrl: SOURCE_URL, retrievedAt: '2026-10-14T00:00:00Z',
    sourceTeam: '', currentTeam: '', rosterSourceUrl: '', rosterVerifiedAt: '',
    teamPaceOn: '', teamPaceOff: '',
    opponentPaceOn: '', opponentPaceOff: '', driverMinutes: '',
    driverGames: '', driverConfidence: '',
  }
}

function apiError(body: unknown, status: number) {
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

function provenance(row: DraftSlot): NbaRotationProvenance {
  return {
    source_name: row.sourceName.trim(), source_url: row.sourceUrl.trim(),
    license: row.sourceName.includes('SportsDataverse') ? 'CC BY 4.0' : undefined,
    retrieved_at: row.retrievedAt.trim(), season: '2025-26',
    season_type: 'Regular Season', per_mode: 'Totals',
    definition: PACE_DEFINITION,
    ...(row.sourceTeam.trim() ? { source_team: row.sourceTeam.trim().toUpperCase() } : {}),
  }
}

function maybeNumber(value: string) {
  return value.trim() === '' ? null : Number(value)
}

function toPlayer(row: DraftSlot): NbaRotationPlayer {
  if (!row.playerName.trim()) {
    return {
      slot: row.slot, player_id: null, player_name: '', pace: null,
      usage_pct: null, sample_games: null, sample_minutes: null,
      sample_confidence: null, pace_driver: null, provenance: null,
      current_team: null, roster_source_url: null,
      roster_verified_at: null, provisional_baseline: true,
    }
  }
  const prov = provenance(row)
  const driverStarted = row.teamPaceOn !== '' || row.teamPaceOff !== ''
  const paceDriver = driverStarted ? {
    verified: true as const,
    team_pace_on: Number(row.teamPaceOn),
    team_pace_off: Number(row.teamPaceOff),
    team_pace_delta: Number(row.teamPaceOn) - Number(row.teamPaceOff),
    opponent_pace_on: maybeNumber(row.opponentPaceOn),
    opponent_pace_off: maybeNumber(row.opponentPaceOff),
    opponent_pace_delta: (row.opponentPaceOn !== '' && row.opponentPaceOff !== '')
      ? Number(row.opponentPaceOn) - Number(row.opponentPaceOff) : null,
    minutes_on: Number(row.driverMinutes), sample_games: Number(row.driverGames),
    confidence: row.driverConfidence as 'low' | 'medium' | 'high',
    provenance: prov,
    causality_note: 'Measured on/off association; it does not by itself prove individual causality.',
  } satisfies NbaPaceDriverEvidence : null
  return {
    slot: row.slot, player_id: row.playerId.trim() || null,
    player_name: row.playerName.trim(), pace: maybeNumber(row.pace),
    usage_pct: maybeNumber(row.usage), sample_games: maybeNumber(row.sampleGames),
    sample_minutes: maybeNumber(row.sampleMinutes),
    sample_confidence: (row.sampleConfidence || null) as NbaRotationPlayer['sample_confidence'],
    current_team: row.currentTeam.trim().toUpperCase() || null,
    roster_source_url: row.rosterSourceUrl.trim() || null,
    roster_verified_at: row.rosterVerifiedAt.trim() || null,
    provisional_baseline: true,
    pace_driver: paceDriver, provenance: prov,
  }
}

function fromPlayer(player: NbaRotationPlayer): DraftSlot {
  const driver = player.pace_driver
  return {
    ...blankSlot(player.slot), playerId: player.player_id ?? '',
    playerName: player.player_name, pace: player.pace == null ? '' : String(player.pace),
    usage: player.usage_pct == null ? '' : String(player.usage_pct),
    sampleGames: player.sample_games == null ? '' : String(player.sample_games),
    sampleMinutes: player.sample_minutes == null ? '' : String(player.sample_minutes),
    sampleConfidence: player.sample_confidence ?? '',
    sourceName: player.provenance?.source_name ?? '',
    sourceUrl: player.provenance?.source_url ?? '',
    retrievedAt: player.provenance?.retrieved_at ?? '',
    sourceTeam: player.provenance?.source_team ?? '',
    currentTeam: player.current_team ?? '',
    rosterSourceUrl: player.roster_source_url ?? '',
    rosterVerifiedAt: player.roster_verified_at ?? '',
    teamPaceOn: driver ? String(driver.team_pace_on) : '',
    teamPaceOff: driver ? String(driver.team_pace_off) : '',
    opponentPaceOn: driver?.opponent_pace_on == null ? '' : String(driver.opponent_pace_on),
    opponentPaceOff: driver?.opponent_pace_off == null ? '' : String(driver.opponent_pace_off),
    driverMinutes: driver ? String(driver.minutes_on) : '',
    driverGames: driver ? String(driver.sample_games) : '',
    driverConfidence: driver?.confidence ?? '',
  }
}

function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function openPdfSaveDialog(report: 'nba-unit-pace') {
  document.body.dataset.printReport = report
  const cleanup = () => {
    delete document.body.dataset.printReport
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  try {
    window.print()
  } catch (error) {
    cleanup()
    throw error
  }
}

export default function RotationPanel() {
  const [list, setList] = useState<NbaRotationListResponse | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [team, setTeam] = useState('')
  const [opponent, setOpponent] = useState('')
  const [rows, setRows] = useState<DraftSlot[]>(
    Array.from({ length: 10 }, (_, index) => blankSlot(index + 1)))
  const [reason, setReason] = useState('')
  const [audit, setAudit] = useState<NbaRotationAuditEvent[]>([])
  const [matchup, setMatchup] = useState<NbaRotationMatchup | null>(null)
  const [sort, setSort] = useState<'team' | 'starters' | 'bench'>('team')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = list?.rotations.find((rotation) => rotation.id === selectedId) ?? null
  const ordered = useMemo(() => [...(list?.rotations ?? [])].sort((a, b) => {
    if (sort === 'team') return a.team.localeCompare(b.team)
    const av = sort === 'starters' ? a.evaluation.starters.average_pace
      : a.evaluation.bench.average_pace
    const bv = sort === 'starters' ? b.evaluation.starters.average_pace
      : b.evaluation.bench.average_pace
    return (bv ?? -Infinity) - (av ?? -Infinity)
  }), [list, sort])

  const load = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      setList(await request<NbaRotationListResponse>(
        '/api/operator/nba-rotations?season=2026-27'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load NBA rotations.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const choose = useCallback(async (id: string) => {
    setSelectedId(id); setMatchup(null); setError(null)
    const rotation = list?.rotations.find((item) => item.id === id)
    if (!rotation) {
      setTeam(''); setRows(Array.from({ length: 10 }, (_, i) => blankSlot(i + 1)))
      setAudit([]); return
    }
    setTeam(rotation.team)
    setRows(rotation.evaluation.slots.map((slot) => fromPlayer(slot.effective)))
    try {
      const history = await request<{ events: NbaRotationAuditEvent[] }>(
        `/api/operator/nba-rotations/${rotation.id}/audit`)
      setAudit(history.events)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rotation audit.')
    }
  }, [list])

  const patchRow = (slot: number, values: Partial<DraftSlot>) => {
    setRows((current) => current.map((row) => row.slot === slot
      ? { ...row, ...values } : row))
  }

  const changes = useMemo(() => {
    if (!selected) return {}
    const result: Record<string, NbaRotationPlayer> = {}
    for (const row of rows) {
      const original = selected.evaluation.slots.find((slot) => slot.slot === row.slot)?.effective
      const next = toPlayer(row)
      if (!jsonEqual(next, original)) result[String(row.slot)] = next
    }
    return result
  }, [rows, selected])

  async function save() {
    if (!team.trim() || !reason.trim()) {
      setError('Team and audit reason are required.'); return
    }
    setBusy(true); setError(null)
    try {
      const saved = selected
        ? await request<NbaRotation>(`/api/operator/nba-rotations/${selected.id}`, {
            method: 'PATCH', body: JSON.stringify({
              slot_overrides: changes, reason: reason.trim(),
            }),
          })
        : await request<NbaRotation>('/api/operator/nba-rotations', {
            method: 'POST', body: JSON.stringify({
              season: '2026-27', team: team.trim().toUpperCase(),
              source_slots: rows.map(toPlayer), reason: reason.trim(),
            }),
          })
      setReason(''); await load(); setSelectedId(saved.id)
      setRows(saved.evaluation.slots.map((slot) => fromPlayer(slot.effective)))
      const history = await request<{ events: NbaRotationAuditEvent[] }>(
        `/api/operator/nba-rotations/${saved.id}/audit`)
      setAudit(history.events)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save rotation.')
    } finally { setBusy(false) }
  }

  async function reset() {
    if (!selected || !reason.trim()) {
      setError('Select a rotation and enter an audit reason before reset.'); return
    }
    setBusy(true); setError(null)
    try {
      const saved = await request<NbaRotation>(
        `/api/operator/nba-rotations/${selected.id}/reset`, {
          method: 'POST', body: JSON.stringify({ slots: null, reset_blend: true,
                                                reason: reason.trim() }),
        })
      setReason(''); setRows(saved.evaluation.slots.map((slot) => fromPlayer(slot.effective)))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset rotation.')
    } finally { setBusy(false) }
  }

  async function compare() {
    if (!team.trim() || !opponent.trim()) {
      setError('Team and opponent are required for matchup comparison.'); return
    }
    setBusy(true); setError(null)
    try {
      setMatchup(await request<NbaRotationMatchup>(
        `/api/operator/nba-rotations/matchup?season=2026-27`
        + `&team=${encodeURIComponent(team.trim().toUpperCase())}`
        + `&opponent_team=${encodeURIComponent(opponent.trim().toUpperCase())}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compare matchup.')
    } finally { setBusy(false) }
  }

  const evaluation = selected?.evaluation ?? null

  return <div style={{ padding: 'var(--pad)', display: 'grid', gap: '14px' }}>
    <style>{`
      .nba-print-only { display: none; }
      @media print {
        @page { size: landscape; margin: 0.35in; }
        body[data-print-report="nba-unit-pace"] * { visibility: hidden !important; }
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report,
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report * {
          visibility: visible !important;
        }
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report {
          position: absolute !important; inset: 0 auto auto 0 !important;
          width: 100% !important; display: block !important;
          background: white !important; color: black !important;
          font-size: 8pt !important;
        }
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report .nba-print-only {
          display: block !important;
        }
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report table {
          width: 100% !important; min-width: 0 !important;
          table-layout: fixed !important; border-collapse: collapse !important;
          font-size: 7pt !important;
        }
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report th,
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report td {
          overflow-wrap: anywhere !important; padding: 3px !important;
          border-bottom: 1px solid #bbb !important;
        }
        body[data-print-report="nba-unit-pace"] #nba-unit-pace-report tr {
          break-inside: avoid !important;
        }
      }
    `}</style>
    <p style={{ margin: 0, color: 'var(--steel)', fontSize: '12px' }}>
      Preseason projected-unit pace heuristic; not an exact possession pace claim.
      Ten unique players are required. Missing PACE or provenance fails closed.
    </p>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button type="button" style={button} onClick={() => setSort('team')}>SORT TEAM</button>
      <button type="button" style={button} onClick={() => setSort('starters')}>SORT STARTERS</button>
      <button type="button" style={button} onClick={() => setSort('bench')}>SORT BENCH</button>
      <button type="button" style={{ ...button, marginLeft: 'auto' }}
        onClick={() => openPdfSaveDialog('nba-unit-pace')}>SAVE PACE REPORT AS PDF</button>
    </div>
    <small style={{ color: 'var(--steel)', textAlign: 'right' }}>
      In the browser dialog choose Destination → Save as PDF. Do not select a printer.
    </small>
    <div id="nba-unit-pace-report">
      <div className="nba-print-only">
        <h1>247 Sports Intel · NBA Projected Unit Pace</h1>
        <p>2026-27 preseason projection using final 2025-26 verified player baselines.
          Starters (slots 1-5) and bench (slots 6-10) remain separate arithmetic means.</p>
      </div>
      <UnitPaceReport rotations={ordered} />
      <RotationPrintDetail rotation={selected} matchup={matchup} />
    </div>
    <div style={{ display: 'grid', gap: '10px',
                  gridTemplateColumns: '1.2fr .6fr .6fr auto' }}>
      <label>ROTATION
        <select aria-label="Rotation" value={selectedId} style={control}
          onChange={(event) => void choose(event.target.value)}>
          <option value="">New 2026-27 rotation</option>
          {list?.rotations.map((rotation) => <option key={rotation.id} value={rotation.id}>
            {rotation.team} · {rotation.evaluation.ready ? 'ready' : 'incomplete'}
          </option>)}
        </select>
      </label>
      <label>TEAM
        <input aria-label="Rotation team" value={team} style={control}
          disabled={!!selected}
          onChange={(event) => {
            const value = event.target.value.toUpperCase()
            setTeam(value)
            setRows((current) => current.map((row) => ({
              ...row, currentTeam: row.currentTeam || value,
            })))
          }} />
      </label>
      <label>OPPONENT
        <input aria-label="Opponent team" value={opponent} style={control}
          onChange={(event) => setOpponent(event.target.value.toUpperCase())} />
      </label>
      <button type="button" style={button} onClick={() => void compare()}
        disabled={busy}>COMPARE UNITS</button>
    </div>

    {error && <p role="alert" style={{ color: 'var(--alert)' }}>{error}</p>}
    {busy && <p style={{ color: 'var(--steel)' }}>Working…</p>}

    {evaluation && <UnitSummary rotation={selected!} matchup={matchup} />}

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: '1600px', borderCollapse: 'collapse' }}>
        <thead><tr>{[
          'SLOT / UNIT', 'PLAYER ID', 'PLAYER', 'PACE', 'USAGE %',
          'SAMPLE G / MIN / CONF', 'PACE SOURCE', 'CURRENT TEAM / ROSTER VERIFY',
          'PACE DRIVER ON / OFF',
        ].map((label) => <th key={label} style={{ ...mono, textAlign: 'left',
          padding: '6px', fontSize: '10px', color: 'var(--steel)',
          borderBottom: '1px solid var(--steel-line)' }}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <RotationRow key={row.slot} row={row}
          original={selected?.evaluation.slots.find((slot) => slot.slot === row.slot)?.original}
          overridden={!!selected?.evaluation.slots.find((slot) => slot.slot === row.slot)?.override}
          onChange={(values) => patchRow(row.slot, values)} />)}</tbody>
      </table>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px' }}>
      <label>AUDIT REASON
        <input aria-label="Rotation audit reason" value={reason} style={control}
          placeholder="Source verification or lineup change"
          onChange={(event) => setReason(event.target.value)} />
      </label>
      <button type="button" style={button} disabled={busy || (!!selected && !Object.keys(changes).length)}
        onClick={() => void save()}>{selected ? 'SAVE OVERRIDES' : 'CREATE DRAFT'}</button>
      <button type="button" style={button} disabled={busy || !selected}
        onClick={() => void reset()}>RESET OVERRIDES</button>
    </div>

    <div style={{ display: 'grid', gap: '12px',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
      <div><strong style={{ ...mono, fontSize: '10px', color: 'var(--blue)' }}>
        SOURCE CONTRACT</strong>
        <p style={{ fontSize: '11px', color: 'var(--steel)' }}>
          Final 2025-26 Regular Season PACE follows player identity across team
          changes. Usage is descriptive. Influence stays OFF unless measured
          on/off evidence is separately backtested.
        </p>
      </div>
      <div><strong style={{ ...mono, fontSize: '10px', color: 'var(--blue)' }}>
        IMMUTABLE AUDIT · {audit.length}</strong>
        {audit.slice(-8).reverse().map((event) => <div key={event.id}
          style={{ fontSize: '11px', borderBottom: '1px solid var(--steel-line)', padding: '4px' }}>
          {event.action.toUpperCase()} · {event.field} · {event.actor_display_name}
          <div style={{ color: 'var(--steel)' }}>{event.reason} · {event.created_at}</div>
        </div>)}
      </div>
    </div>
  </div>
}

function RotationPrintDetail({ rotation, matchup }: {
  rotation: NbaRotation | null; matchup: NbaRotationMatchup | null
}) {
  if (!rotation) return <div className="nba-print-only">
    <h2>Selected-team detail</h2>
    <p>No selected verified team detail. Select a team before saving its detail.</p>
  </div>
  const evaluation = rotation.evaluation
  return <div className="nba-print-only">
    <h2>{rotation.team} selected-team detail</h2>
    <p>
      Status: {evaluation.ready ? 'verified' : 'incomplete'} · Starter pace:{' '}
      {evaluation.starters.average_pace ?? 'unknown'} · Bench pace:{' '}
      {evaluation.bench.average_pace ?? 'unknown'} · Weighting: {evaluation.weighting_mode}
    </p>
    <p>
      Matchup: {!matchup ? 'not selected'
        : !matchup.comparison.ready ? `incomplete · ${matchup.comparison.errors.join(' · ')}`
        : `starters ${matchup.comparison.starters?.label} ${matchup.comparison.starters?.delta}; bench ${matchup.comparison.bench?.label} ${matchup.comparison.bench?.delta}`}
      {' '}· Influence adjustment: OFF · {evaluation.influence_adjustment.reason}
    </p>
    {evaluation.errors.length > 0 && <p>Unknown / incomplete: {evaluation.errors.join(' · ')}</p>}
    <table aria-label="Selected NBA rotation PDF detail">
      <thead><tr>{['SLOT / UNIT', 'PLAYER / TEAM', 'PACE / USG', 'SAMPLE / CONFIDENCE',
        'PACE DRIVER', 'PACE PROVENANCE', 'ROSTER VERIFICATION'].map((label) =>
        <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{evaluation.slots.map((slot) => {
        const player = slot.effective
        const source = player.provenance
        const driver = player.pace_driver
        return <tr key={slot.slot}>
          <td>{slot.slot} · {slot.unit}</td>
          <td>{player.player_name || 'unknown'} · {player.current_team ?? 'unknown'}</td>
          <td>{player.pace ?? 'unknown'} · {player.usage_pct ?? 'unknown'}%</td>
          <td>{player.sample_games ?? 'unknown'}g · {player.sample_minutes ?? 'unknown'}min ·{' '}
            {player.sample_confidence ?? 'unknown confidence'}</td>
          <td>{driver ? `${driver.team_pace_on} on / ${driver.team_pace_off} off · ${driver.confidence}`
            : 'not verified; descriptive only'}</td>
          <td>{source ? <>{source.source_name} · {source.season} {source.season_type} ·{' '}
            {source.license ?? 'license unknown'} · retrieved {source.retrieved_at}<br />
            {source.source_url}</> : 'unknown provenance'}</td>
          <td>{player.roster_source_url && player.roster_verified_at
            ? <>{player.roster_verified_at}<br />{player.roster_source_url}</>
            : 'unknown roster source or verification time'}</td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

function UnitPaceReport({ rotations }: { rotations: NbaRotation[] }) {
  const verified = rotations.filter((rotation) => rotation.evaluation.ready)
  return <div style={{ display: 'grid', gap: '8px' }}>
    {verified.length === 0 ? <p style={{ color: 'var(--steel)' }}>
      No verified team rotations yet. Incomplete teams remain visible below but
      are excluded from pace rankings.</p> : <div aria-label="NBA projected unit pace chart">
      {verified.map((rotation) => <div key={rotation.id} style={{ display: 'grid',
        gridTemplateColumns: '42px 1fr 1fr', gap: '6px', alignItems: 'center',
        fontSize: '10px', marginBottom: '3px' }}>
        <span style={mono}>{rotation.team}</span>
        <span style={{ background: 'var(--navy-raised)', position: 'relative', height: '13px' }}>
          <span style={{ display: 'block', height: '100%', background: 'var(--lime)',
            width: `${rotation.evaluation.starters.average_pace! / 130 * 100}%` }} />
          <small style={{ position: 'absolute', left: '4px', top: 0 }}>S {rotation.evaluation.starters.average_pace}</small>
        </span>
        <span style={{ background: 'var(--navy-raised)', position: 'relative', height: '13px' }}>
          <span style={{ display: 'block', height: '100%', background: 'var(--blue)',
            width: `${rotation.evaluation.bench.average_pace! / 130 * 100}%` }} />
          <small style={{ position: 'absolute', left: '4px', top: 0 }}>B {rotation.evaluation.bench.average_pace}</small>
        </span>
      </div>)}
    </div>}
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['TEAM', 'STARTERS 1-5', 'BENCH 6-10', 'VS LEAGUE',
        'COMPLETENESS / CONFIDENCE'].map((label) => <th key={label}
        style={{ ...mono, fontSize: '10px', textAlign: 'left', padding: '5px' }}>{label}</th>)}</tr></thead>
      <tbody>{rotations.map((rotation) => <tr key={rotation.id}>
        <td style={{ padding: '5px' }}>{rotation.team}</td>
        <td>{rotation.evaluation.starters.average_pace ?? 'unknown'}</td>
        <td>{rotation.evaluation.bench.average_pace ?? 'unknown'}</td>
        <td>S {rotation.evaluation.starters.vs_league_delta ?? '—'} · B {rotation.evaluation.bench.vs_league_delta ?? '—'}</td>
        <td style={{ color: rotation.evaluation.ready ? 'var(--lime)' : 'var(--alert)' }}>
          {rotation.evaluation.ready ? '10 unique verified players' : rotation.evaluation.errors.join(' · ')}</td>
      </tr>)}</tbody>
    </table></div>
  </div>
}

function RotationRow({ row, original, overridden, onChange }: {
  row: DraftSlot; original?: NbaRotationPlayer; overridden: boolean
  onChange: (values: Partial<DraftSlot>) => void
}) {
  const cell: React.CSSProperties = { padding: '6px', verticalAlign: 'top',
    borderBottom: '1px solid var(--steel-line)' }
  return <tr>
    <td style={cell}><strong style={mono}>{row.slot}</strong><br />
      <small style={{ color: row.slot <= 5 ? 'var(--lime)' : 'var(--blue)' }}>
        {row.slot <= 5 ? 'STARTER' : 'BENCH'}{overridden ? ' · OVERRIDE' : ''}
      </small></td>
    <td style={cell}><input aria-label={`Slot ${row.slot} player ID`} value={row.playerId}
      style={control} onChange={(e) => onChange({ playerId: e.target.value })} /></td>
    <td style={cell}><input aria-label={`Slot ${row.slot} player`} value={row.playerName}
      style={control} onChange={(e) => onChange({ playerName: e.target.value })} />
      <Original value={original?.player_name} /></td>
    <td style={cell}><input aria-label={`Slot ${row.slot} pace`} type="number" step=".01"
      value={row.pace} style={control} onChange={(e) => onChange({ pace: e.target.value })} />
      <Original value={original?.pace} /></td>
    <td style={cell}><input aria-label={`Slot ${row.slot} usage`} type="number" step=".1"
      value={row.usage} style={control} onChange={(e) => onChange({ usage: e.target.value })} />
      <Original value={original?.usage_pct} /></td>
    <td style={cell}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
      <input aria-label={`Slot ${row.slot} sample games`} placeholder="games" type="number"
        value={row.sampleGames} style={control} onChange={(e) => onChange({ sampleGames: e.target.value })} />
      <input aria-label={`Slot ${row.slot} sample minutes`} placeholder="minutes" type="number"
        value={row.sampleMinutes} style={control} onChange={(e) => onChange({ sampleMinutes: e.target.value })} />
      <select aria-label={`Slot ${row.slot} sample confidence`} value={row.sampleConfidence}
        style={{ ...control, gridColumn: '1 / -1' }}
        onChange={(e) => onChange({ sampleConfidence: e.target.value })}>
        <option value="">confidence</option><option value="low">low</option>
        <option value="medium">medium</option><option value="high">high</option>
      </select></div></td>
    <td style={cell}><input aria-label={`Slot ${row.slot} source`} value={row.sourceName}
      style={control} onChange={(e) => onChange({ sourceName: e.target.value })} />
      <input aria-label={`Slot ${row.slot} source URL`} value={row.sourceUrl}
        style={{ ...control, marginTop: '4px' }} onChange={(e) => onChange({ sourceUrl: e.target.value })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr .5fr', gap: '4px' }}>
        <input aria-label={`Slot ${row.slot} retrieval time`} value={row.retrievedAt}
          style={{ ...control, marginTop: '4px' }} onChange={(e) => onChange({ retrievedAt: e.target.value })} />
        <input aria-label={`Slot ${row.slot} source team`} placeholder="2025-26 team"
          value={row.sourceTeam} style={{ ...control, marginTop: '4px' }}
          onChange={(e) => onChange({ sourceTeam: e.target.value })} />
      </div></td>
    <td style={cell}><input aria-label={`Slot ${row.slot} current team`}
      placeholder="current team" value={row.currentTeam} style={control}
      onChange={(e) => onChange({ currentTeam: e.target.value.toUpperCase() })} />
      <input aria-label={`Slot ${row.slot} roster source URL`}
        placeholder="authoritative roster URL" value={row.rosterSourceUrl}
        style={{ ...control, marginTop: '4px' }}
        onChange={(e) => onChange({ rosterSourceUrl: e.target.value })} />
      <input aria-label={`Slot ${row.slot} roster verified at`}
        placeholder="verification timestamp" value={row.rosterVerifiedAt}
        style={{ ...control, marginTop: '4px' }}
        onChange={(e) => onChange({ rosterVerifiedAt: e.target.value })} />
      <small style={{ color: 'var(--amber)' }}>provisional 2025-26 carry-forward</small>
    </td>
    <td style={cell}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
      <input aria-label={`Slot ${row.slot} team pace on`} placeholder="team on" type="number"
        value={row.teamPaceOn} style={control} onChange={(e) => onChange({ teamPaceOn: e.target.value })} />
      <input aria-label={`Slot ${row.slot} team pace off`} placeholder="team off" type="number"
        value={row.teamPaceOff} style={control} onChange={(e) => onChange({ teamPaceOff: e.target.value })} />
      <input aria-label={`Slot ${row.slot} opponent pace on`} placeholder="opp on" type="number"
        value={row.opponentPaceOn} style={control} onChange={(e) => onChange({ opponentPaceOn: e.target.value })} />
      <input aria-label={`Slot ${row.slot} opponent pace off`} placeholder="opp off" type="number"
        value={row.opponentPaceOff} style={control} onChange={(e) => onChange({ opponentPaceOff: e.target.value })} />
      <input aria-label={`Slot ${row.slot} driver minutes`} placeholder="on minutes" type="number"
        value={row.driverMinutes} style={control} onChange={(e) => onChange({ driverMinutes: e.target.value })} />
      <input aria-label={`Slot ${row.slot} driver games`} placeholder="games" type="number"
        value={row.driverGames} style={control} onChange={(e) => onChange({ driverGames: e.target.value })} />
      <select aria-label={`Slot ${row.slot} driver confidence`} value={row.driverConfidence}
        style={{ ...control, gridColumn: '1 / -1' }}
        onChange={(e) => onChange({ driverConfidence: e.target.value })}>
        <option value="">not verified</option><option value="low">low</option>
        <option value="medium">medium</option><option value="high">high</option>
      </select></div></td>
  </tr>
}

function Original({ value }: { value: unknown }) {
  if (value == null || value === '') return null
  return <small style={{ color: 'var(--steel)', display: 'block', marginTop: '3px' }}>
    original: {String(value)}
  </small>
}

function UnitSummary({ rotation, matchup }: { rotation: NbaRotation; matchup: NbaRotationMatchup | null }) {
  const evaluation = rotation.evaluation
  return <div style={{ display: 'grid', gap: '8px',
    gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
    {[evaluation.starters, evaluation.bench].map((unit) => <div key={unit.unit}
      style={{ background: 'var(--navy-raised)', padding: '10px' }}>
      <div style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>
        {unit.unit.toUpperCase()} UNIT PACE</div>
      <strong style={{ ...mono, fontSize: '20px' }}>{unit.average_pace ?? 'NOT READY'}</strong>
      <div style={{ fontSize: '11px', color: unit.ready ? 'var(--lime)' : 'var(--alert)' }}>
        {unit.ready ? `${unit.label_vs_league} ${unit.vs_league_delta! >= 0 ? '+' : ''}${unit.vs_league_delta} vs 100.2 league`
          : unit.errors.join(' · ')}</div>
    </div>)}
    <div style={{ background: 'var(--navy-raised)', padding: '10px' }}>
      <div style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>MATCHUP</div>
      {!matchup ? <span style={{ color: 'var(--steel)' }}>Enter opponent and compare.</span>
        : !matchup.comparison.ready ? <span style={{ color: 'var(--alert)' }}>
          {matchup.comparison.errors.join(' · ')}</span>
        : <div style={{ fontSize: '11px' }}>
          starters: {matchup.comparison.starters?.label} {matchup.comparison.starters?.delta}<br />
          bench: {matchup.comparison.bench?.label} {matchup.comparison.bench?.delta}
        </div>}
    </div>
    <div style={{ background: 'var(--navy-raised)', padding: '10px' }}>
      <div style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>PACE DRIVERS</div>
      {evaluation.pace_driver_rankings.length === 0 ? <span style={{ color: 'var(--steel)' }}>
        not verified</span> : evaluation.pace_driver_rankings.map((driver) => <div key={driver.slot}>
          {driver.player_name}: {driver.direction} {driver.team_pace_delta >= 0 ? '+' : ''}{driver.team_pace_delta}
          {' '}· {driver.sample_games}g · {driver.confidence}
        </div>)}
      <div style={{ color: 'var(--steel)', fontSize: '10px' }}>Influence adjustment OFF.</div>
    </div>
  </div>
}
