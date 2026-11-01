'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  NbaUsageDifferential, NbaUsageListResponse, NbaUsagePlayer,
} from '@/lib/operator/client'

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

type SortKey = 'team' | 'outgoing_load' | 'incoming_load' | 'net_load'

function openPdfSaveDialog(report: 'nba-usage-differential') {
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

export default function UsageDifferentialPanel() {
  const [list, setList] = useState<NbaUsageListResponse | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [sort, setSort] = useState<SortKey>('net_load')
  const [view, setView] = useState<'raw' | 'role'>('raw')
  const [team, setTeam] = useState('')
  const [json, setJson] = useState('[]')
  const [drafts, setDrafts] = useState<Record<string, NbaUsagePlayer>>({})
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      setList(await request<NbaUsageListResponse>(
        '/api/operator/nba-usage-differentials?season=2026-27'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load usage analyses.')
    } finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const selected = list?.analyses.find((analysis) => analysis.id === selectedId) ?? null
  const ordered = useMemo(() => [...(list?.analyses ?? [])].sort((a, b) => {
    if (sort === 'team') return a.team.localeCompare(b.team)
    return (b.analysis[sort] ?? -Infinity) - (a.analysis[sort] ?? -Infinity)
  }), [list, sort])

  function choose(id: string) {
    setSelectedId(id); setError(null)
    const analysis = list?.analyses.find((item) => item.id === id)
    setTeam(analysis?.team ?? '')
    setDrafts(Object.fromEntries((analysis?.analysis.contributors ?? []).map(
      (row) => [row.player_id, structuredClone(row.effective)])))
  }

  async function create() {
    if (!team.trim() || !reason.trim()) {
      setError('Team and audit reason are required.'); return
    }
    let players: unknown
    try { players = JSON.parse(json) } catch {
      setError('Source players must be valid JSON.'); return
    }
    setBusy(true); setError(null)
    try {
      const saved = await request<NbaUsageDifferential>(
        '/api/operator/nba-usage-differentials', {
          method: 'POST', body: JSON.stringify({ season: '2026-27',
            team: team.trim().toUpperCase(), players, reason: reason.trim() }),
        })
      setReason(''); await load(); setSelectedId(saved.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create usage analysis.')
    } finally { setBusy(false) }
  }

  function patchPlayer(id: string, changes: Partial<NbaUsagePlayer>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...changes } }))
  }

  const overrides = useMemo(() => {
    if (!selected) return {}
    const out: Record<string, NbaUsagePlayer> = {}
    for (const row of selected.analysis.contributors) {
      const next = drafts[row.player_id]
      if (next && JSON.stringify(next) !== JSON.stringify(row.effective)) {
        out[row.player_id] = next
      }
    }
    return out
  }, [selected, drafts])

  async function save(reset = false) {
    if (!selected || !reason.trim()) {
      setError('Select an analysis and enter an audit reason.'); return
    }
    const changes = reset
      ? Object.fromEntries(Object.keys(selected.player_overrides).map((id) => [id, null]))
      : overrides
    if (!Object.keys(changes).length) {
      setError('No effective changes to save.'); return
    }
    setBusy(true); setError(null)
    try {
      const saved = await request<NbaUsageDifferential>(
        `/api/operator/nba-usage-differentials/${selected.id}`, {
          method: 'PATCH', body: JSON.stringify({ player_overrides: changes,
                                                  reason: reason.trim() }),
        })
      setReason(''); await load(); setSelectedId(saved.id)
      setDrafts(Object.fromEntries(saved.analysis.contributors.map(
        (row) => [row.player_id, structuredClone(row.effective)])))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save usage analysis.')
    } finally { setBusy(false) }
  }

  return <div style={{ padding: 'var(--pad)', display: 'grid', gap: '14px' }}>
    <style>{`
      .nba-print-only { display: none; }
      @media print {
        @page { size: landscape; margin: 0.35in; }
        body[data-print-report="nba-usage-differential"] * { visibility: hidden !important; }
        body[data-print-report="nba-usage-differential"] #nba-usage-report,
        body[data-print-report="nba-usage-differential"] #nba-usage-report * {
          visibility: visible !important;
        }
        body[data-print-report="nba-usage-differential"] #nba-usage-report {
          position: absolute !important; inset: 0 auto auto 0 !important;
          width: 100% !important; display: block !important;
          background: white !important; color: black !important;
          font-size: 8pt !important;
        }
        body[data-print-report="nba-usage-differential"] #nba-usage-report .nba-print-only {
          display: block !important;
        }
        body[data-print-report="nba-usage-differential"] #nba-usage-report table {
          width: 100% !important; min-width: 0 !important;
          table-layout: fixed !important; border-collapse: collapse !important;
          font-size: 7pt !important;
        }
        body[data-print-report="nba-usage-differential"] #nba-usage-report th,
        body[data-print-report="nba-usage-differential"] #nba-usage-report td {
          overflow-wrap: anywhere !important; padding: 3px !important;
          border-bottom: 1px solid #bbb !important;
        }
        body[data-print-report="nba-usage-differential"] #nba-usage-report tr {
          break-inside: avoid !important;
        }
      }
    `}</style>
    <p style={{ margin: 0, color: 'var(--steel)', fontSize: '12px' }}>
      Whole-roster transaction movement uses exposure-weighted final 2025-26 USG%.
      Raw percentages are never summed. Depth-chart role adjustments are separate,
      default to zero, and remain projected opportunities—not guaranteed changes.
    </p>
    {error && <p role="alert" style={{ color: 'var(--alert)' }}>{error}</p>}

    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button type="button" style={{ ...button, color: view === 'raw' ? 'var(--lime)' : 'var(--blue)' }}
        aria-pressed={view === 'raw'} onClick={() => setView('raw')}>
        WHOLE-ROSTER TRANSACTIONS</button>
      <button type="button" style={{ ...button, color: view === 'role' ? 'var(--lime)' : 'var(--blue)' }}
        aria-pressed={view === 'role'} onClick={() => setView('role')}>
        PROJECTED ROLE ADJUSTMENTS</button>
      <button type="button" style={{ ...button, marginLeft: 'auto' }}
        onClick={() => openPdfSaveDialog('nba-usage-differential')}>
        SAVE USAGE REPORT AS PDF</button>
    </div>
    <small style={{ color: 'var(--steel)', textAlign: 'right' }}>
      In the browser dialog choose Destination → Save as PDF. Do not select a printer.
    </small>

    <UsagePdfReport analyses={ordered} selected={selected} />

    {view === 'raw' && <UsageChart analyses={ordered} />}

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{[
          ['team', 'TEAM'], ['outgoing_load', 'OUTGOING'],
          ['incoming_load', 'INCOMING'], ['net_load', 'NET'],
        ].map(([key, label]) => <th key={key} style={{ padding: '6px', textAlign: 'left',
          borderBottom: '1px solid var(--steel-line)' }}>
          <button type="button" style={button} onClick={() => setSort(key as SortKey)}>
            {label}</button></th>)}<th>LARGEST OUT</th><th>LARGEST IN</th>
          <th>CONFIDENCE / COMPLETENESS</th></tr></thead>
        <tbody>{ordered.map((item) => <tr key={item.id}
          onClick={() => choose(item.id)} style={{ cursor: 'pointer',
            background: item.id === selectedId ? 'var(--navy-raised)' : 'transparent' }}>
          <td style={{ padding: '7px' }}>{item.team}</td>
          <td>{item.analysis.outgoing_load ?? '—'}</td>
          <td>{item.analysis.incoming_load ?? '—'}</td>
          <td>{item.analysis.net_load ?? '—'}</td>
          <td>{largest(item, 'outgoing')}</td>
          <td>{largest(item, 'incoming')}</td>
          <td style={{ color: item.analysis.ready ? 'var(--lime)' : 'var(--alert)' }}>
            {item.analysis.ready ? 'verified' : `incomplete · ${item.analysis.errors.length} issue(s)`}</td>
        </tr>)}</tbody>
      </table>
    </div>

    {!selected && <div style={{ display: 'grid', gap: '8px' }}>
      <label>TEAM
        <input aria-label="Usage analysis team" value={team} style={control}
          onChange={(e) => setTeam(e.target.value.toUpperCase())} />
      </label>
      <label>SOURCE PLAYERS JSON
        <textarea aria-label="Source players JSON" value={json}
          onChange={(e) => setJson(e.target.value)}
          style={{ ...control, minHeight: '120px' }} />
      </label>
      <small style={{ color: 'var(--steel)' }}>
        Import only verified roster/transaction rows with final 2025-26 USG%,
        possessions or minutes, roster source/timestamp, depth slot and role.
        Unknown newcomers must remain has_prior_nba_sample=false.
      </small>
      <Reason value={reason} onChange={setReason} />
      <button type="button" style={button} disabled={busy}
        onClick={() => void create()}>CREATE TEAM ANALYSIS</button>
    </div>}

    {selected && <>
      <Summary item={selected} />
      {view === 'role' && <RoleAdjustmentTable item={selected} />}
      {view === 'raw' && <ContributorHeadline item={selected} />}
      <div style={{ overflowX: 'auto' }}><table style={{ minWidth: '1400px', width: '100%',
        borderCollapse: 'collapse' }}><thead><tr>{[
          'PLAYER', 'MOVEMENT', 'ORIGINAL USG / EXPOSURE', 'PRIOR → CURRENT ROLE',
          'ACTIVE / SLOT / MIN', 'USG ADJUSTMENT', 'CONTEXT',
        ].map((label) => <th key={label} style={{ ...mono, fontSize: '10px',
          textAlign: 'left', padding: '6px', borderBottom: '1px solid var(--steel-line)' }}>
          {label}</th>)}</tr></thead><tbody>
        {selected.analysis.contributors.map((row) => {
          const player = drafts[row.player_id] ?? row.effective
          return <tr key={row.player_id}>
            <Cell><strong>{player.player_name}</strong><br /><small>{player.player_id}</small></Cell>
            <Cell>{row.classification}<br />{player.prior_team ?? '?'} → {player.current_team ?? '?'}</Cell>
            <Cell>{player.usg_pct ?? 'unknown'}% · {player.possessions ?? player.minutes ?? 'missing'}
              {' '}{player.possessions ? 'poss' : 'min'}<br />
              <small>load {row.usage_load_per_1000 ?? '—'}</small></Cell>
            <Cell><select aria-label={`${player.player_name} prior role`}
              value={player.prior_role ?? ''} style={control}
              onChange={(e) => patchPlayer(row.player_id,
                { prior_role: (e.target.value || null) as NbaUsagePlayer['prior_role'] })}>
              <option value="">unverified</option><option value="starter">starter</option>
              <option value="bench">bench</option></select>
              <select aria-label={`${player.player_name} current role`}
                value={player.projected_role ?? ''} style={{ ...control, marginTop: '4px' }}
                onChange={(e) => patchPlayer(row.player_id,
                  { projected_role: (e.target.value || null) as NbaUsagePlayer['projected_role'] })}>
                <option value="">unverified</option><option value="starter">starter</option>
                <option value="bench">bench</option>
                <option value="out_of_rotation">out of rotation</option></select></Cell>
            <Cell><label><input type="checkbox" checked={player.active}
              onChange={(e) => patchPlayer(row.player_id, { active: e.target.checked })} /> active</label>
              <input aria-label={`${player.player_name} depth slot`} type="number"
                value={player.depth_slot ?? ''} placeholder="slot" style={control}
                onChange={(e) => patchPlayer(row.player_id,
                  { depth_slot: e.target.value ? Number(e.target.value) : null })} />
              <input aria-label={`${player.player_name} projected minutes`} type="number"
                value={player.projected_minutes ?? ''} placeholder="minutes" style={control}
                onChange={(e) => patchPlayer(row.player_id,
                  { projected_minutes: e.target.value ? Number(e.target.value) : null })} /></Cell>
            <Cell><input aria-label={`${player.player_name} usage adjustment`} type="number" step=".1"
              value={player.usage_adjustment_pct} style={control}
              onChange={(e) => patchPlayer(row.player_id,
                { usage_adjustment_pct: Number(e.target.value) })} />
              <input aria-label={`${player.player_name} adjustment reason`}
                value={player.usage_adjustment_reason ?? ''} placeholder="rationale"
                style={{ ...control, marginTop: '4px' }}
                onChange={(e) => patchPlayer(row.player_id,
                  { usage_adjustment_reason: e.target.value || null })} /></Cell>
            <Cell><textarea aria-label={`${player.player_name} hierarchy context`}
              value={player.primary_handler_context ?? ''} style={{ ...control, minHeight: '62px' }}
              onChange={(e) => patchPlayer(row.player_id,
                { primary_handler_context: e.target.value || null })} /></Cell>
          </tr>
        })}
      </tbody></table></div>
      <Reason value={reason} onChange={setReason} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" style={button} disabled={busy || !Object.keys(overrides).length}
          onClick={() => void save(false)}>SAVE PLAYER OVERRIDES</button>
        <button type="button" style={button} disabled={busy || !Object.keys(selected.player_overrides).length}
          onClick={() => void save(true)}>RESET OVERRIDES</button>
      </div>
    </>}
  </div>
}

function UsagePdfReport({ analyses, selected }: {
  analyses: NbaUsageDifferential[]; selected: NbaUsageDifferential | null
}) {
  return <div id="nba-usage-report" className="nba-print-only">
    <h1>247 Sports Intel · NBA Offseason Usage Differential</h1>
    <p>2026-27 offseason report using exposure-weighted final 2025-26 USG%.
      Raw usage percentages are never summed. Role adjustments are separate projections.</p>
    <h2>All-team summary · {analyses.length} team row(s)</h2>
    <table aria-label="NBA usage differential PDF all-team summary">
      <thead><tr>{['TEAM', 'OUTGOING', 'INCOMING', 'NET', 'DEPTH NET',
        'LARGEST OUT', 'LARGEST IN', 'CONFIDENCE / COMPLETENESS'].map((label) =>
        <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{analyses.map((item) => <tr key={item.id}>
        <td>{item.team}</td>
        <td>{item.analysis.outgoing_load ?? 'unknown'}</td>
        <td>{item.analysis.incoming_load ?? 'unknown'}</td>
        <td>{item.analysis.net_load ?? 'unknown'}</td>
        <td>{item.analysis.active_net_load ?? 'unknown'}</td>
        <td>{largest(item, 'outgoing')}</td><td>{largest(item, 'incoming')}</td>
        <td>{item.analysis.ready ? 'verified'
          : `incomplete · ${[...item.analysis.errors, ...item.analysis.depth_chart_errors,
              ...item.analysis.role_adjustments.errors].join(' · ') || 'unknown-data fields remain'}`}</td>
      </tr>)}</tbody>
    </table>
    {!selected ? <>
      <h2>Selected-team detail</h2>
      <p>No selected verified team detail. Select a team before saving its detail.</p>
    </> : <UsagePrintDetail item={selected} />}
  </div>
}

function UsagePrintDetail({ item }: { item: NbaUsageDifferential }) {
  const analysis = item.analysis
  return <>
    <h2>{item.team} selected-team detail</h2>
    <p>Status: {analysis.ready ? 'verified' : 'incomplete'} · Outgoing:{' '}
      {analysis.outgoing_load ?? 'unknown'} · Incoming: {analysis.incoming_load ?? 'unknown'} · Net:{' '}
      {analysis.net_load ?? 'unknown'} · Depth net: {analysis.active_net_load ?? 'unknown'}</p>
    <p>{analysis.method}<br />{analysis.active_method}<br />{analysis.role_adjustments.method}</p>
    {[...analysis.errors, ...analysis.depth_chart_errors, ...analysis.role_adjustments.errors].length > 0
      && <p>Unknown / incomplete: {[...analysis.errors, ...analysis.depth_chart_errors,
        ...analysis.role_adjustments.errors].join(' · ')}</p>}
    <table aria-label="Selected NBA usage PDF contributor detail">
      <thead><tr>{['PLAYER', 'MOVEMENT', 'USG / EXPOSURE / LOAD', 'ROLE / DEPTH',
        'CONFIDENCE', 'STAT PROVENANCE', 'ROSTER VERIFICATION'].map((label) =>
        <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{analysis.contributors.map((row) => {
        const player = row.effective
        const source = player.provenance
        return <tr key={row.player_id}>
          <td>{player.player_name || 'unknown'}<br />{player.player_id}</td>
          <td>{row.classification} · {player.prior_team ?? 'unknown'} →{' '}
            {player.current_team ?? 'unknown'}</td>
          <td>{player.usg_pct ?? 'unknown'}% · {player.possessions ?? player.minutes ?? 'unknown'}{' '}
            {player.possessions != null ? 'possessions' : player.minutes != null ? 'minutes' : 'exposure'} · load{' '}
            {row.usage_load_per_1000 ?? 'unknown'}</td>
          <td>{player.prior_role ?? 'unknown'} → {player.projected_role ?? 'unknown'} · slot{' '}
            {player.depth_slot ?? 'unknown'} · projected minutes {player.projected_minutes ?? 'unknown'}</td>
          <td>{player.confidence ?? 'unknown confidence'} · prior NBA sample:{' '}
            {player.has_prior_nba_sample ? 'yes' : 'no / unknown newcomer'}</td>
          <td>{source ? <>{source.source_name} · {source.season} {source.season_type} ·{' '}
            {source.license ?? 'license unknown'} · retrieved {source.retrieved_at}<br />
            {source.source_url}</> : 'unknown provenance'}</td>
          <td>{player.roster_source_url && player.roster_verified_at
            ? <>{player.roster_verified_at}<br />{player.roster_source_url}</>
            : 'unknown roster source or verification time'}</td>
        </tr>
      })}</tbody>
    </table>
    <h3>Unknown newcomers</h3>
    {analysis.unknown_newcomers.length === 0 ? <p>None reported.</p>
      : <ul>{analysis.unknown_newcomers.map((player) => <li key={player.player_id}>
        {player.player_name} · {player.reason}</li>)}</ul>}
    <h3>Projected role adjustments</h3>
    <table aria-label="Selected NBA usage PDF role adjustments">
      <thead><tr>{['PLAYER', 'ROLE BEFORE → AFTER', 'ORIGINAL → EFFECTIVE USG%',
        'ADJUSTMENT', 'PROJECTED MINUTES', 'HYPOTHESIS / CONFIDENCE / REASON'].map((label) =>
        <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{analysis.role_adjustments.players.map((player) => <tr key={player.player_id}>
        <td>{player.player_name}</td><td>{player.prior_role} → {player.current_role}</td>
        <td>{player.original_usg_pct ?? 'unknown'} → {player.effective_usg_pct ?? 'unknown'}</td>
        <td>{player.operator_adjustment_pct}</td>
        <td>{player.projected_minutes ?? 'unknown'}</td>
        <td>{player.hypothesis} · {player.confidence} · {player.reason ?? 'no reason supplied'}</td>
      </tr>)}</tbody>
    </table>
  </>
}

function largest(item: NbaUsageDifferential, kind: 'incoming' | 'outgoing') {
  const row = item.analysis.contributors.filter((entry) => entry.classification === kind)
    .sort((a, b) => (b.usage_load_per_1000 ?? 0) - (a.usage_load_per_1000 ?? 0))[0]
  return row ? `${row.effective.player_name} · ${row.usage_load_per_1000 ?? 'unknown'}` : '—'
}

function UsageChart({ analyses }: { analyses: NbaUsageDifferential[] }) {
  const ranked = analyses.filter((item) => item.analysis.ready && item.analysis.net_load != null)
  const max = Math.max(1, ...ranked.map((item) => Math.abs(item.analysis.net_load!)))
  if (!ranked.length) return <p style={{ color: 'var(--steel)' }}>
    No verified all-team results yet. Incomplete teams are excluded from rankings,
    never estimated.</p>
  return <div aria-label="NBA net usage load diverging chart" style={{ display: 'grid', gap: '3px' }}>
    <strong style={{ ...mono, fontSize: '10px', color: 'var(--blue)' }}>
      VERIFIED NET USAGE LOAD · LOST ← 0 → ADDED</strong>
    {ranked.map((item) => {
      const value = item.analysis.net_load!
      const width = `${Math.abs(value) / max * 50}%`
      return <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '42px 1fr 60px',
        alignItems: 'center', gap: '6px', fontSize: '10px' }}>
        <span style={mono}>{item.team}</span>
        <div style={{ height: '13px', position: 'relative', background: 'var(--navy-raised)' }}>
          <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0,
            borderLeft: '1px solid var(--steel)' }} />
          <span style={{ position: 'absolute', height: '9px', top: '2px',
            ...(value < 0 ? { right: '50%', width } : { left: '50%', width }),
            background: value < 0 ? 'var(--alert)' : 'var(--lime)' }} />
        </div>
        <span style={mono}>{value >= 0 ? '+' : ''}{value}</span>
      </div>
    })}
  </div>
}

function ContributorHeadline({ item }: { item: NbaUsageDifferential }) {
  const outgoing = item.analysis.contributors.filter((row) => row.classification === 'outgoing')
    .sort((a, b) => (b.usage_load_per_1000 ?? 0) - (a.usage_load_per_1000 ?? 0))[0]
  const incoming = item.analysis.contributors.filter((row) => row.classification === 'incoming')
    .sort((a, b) => (b.usage_load_per_1000 ?? 0) - (a.usage_load_per_1000 ?? 0))[0]
  return <div style={{ fontSize: '11px', color: 'var(--steel)' }}>
    Largest outgoing: {outgoing ? `${outgoing.effective.player_name} (${outgoing.usage_load_per_1000})` : 'unknown'}
    {' · '}Largest incoming: {incoming ? `${incoming.effective.player_name} (${incoming.usage_load_per_1000})` : 'unknown'}
  </div>
}

function RoleAdjustmentTable({ item }: { item: NbaUsageDifferential }) {
  const role = item.analysis.role_adjustments
  return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead><tr>{['PLAYER', 'ROLE BEFORE → AFTER', 'ORIGINAL USG%', 'ADJUSTMENT',
      'EFFECTIVE USG%', 'HYPOTHESIS / CONFIDENCE'].map((label) => <th key={label}
      style={{ ...mono, fontSize: '10px', textAlign: 'left', padding: '5px' }}>{label}</th>)}</tr></thead>
    <tbody>{role.players.map((player) => <tr key={player.player_id}>
      <Cell>{player.player_name}</Cell><Cell>{player.prior_role} → {player.current_role}</Cell>
      <Cell>{player.original_usg_pct ?? 'unknown'}</Cell><Cell>{player.operator_adjustment_pct}</Cell>
      <Cell>{player.effective_usg_pct ?? 'unknown'}</Cell>
      <Cell>{player.hypothesis} · {player.confidence}</Cell>
    </tr>)}</tbody>
  </table></div>
}

function Summary({ item }: { item: NbaUsageDifferential }) {
  const a = item.analysis
  return <div style={{ display: 'grid', gap: '8px',
    gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
    {[['OUTGOING', a.outgoing_load], ['INCOMING', a.incoming_load],
      ['NET', a.net_load], ['DEPTH NET', a.active_net_load]].map(([label, value]) => <div key={label as string}
      style={{ background: 'var(--navy-raised)', padding: '10px' }}>
      <div style={{ ...mono, fontSize: '10px', color: 'var(--steel)' }}>{label}</div>
      <strong style={{ ...mono, fontSize: '20px' }}>{value ?? 'NOT READY'}</strong>
    </div>)}
    <div style={{ gridColumn: '1 / -1', color: 'var(--steel)', fontSize: '11px' }}>
      {a.method}<br />{a.active_method}<br />{a.role_adjustments.method}
      {[...a.errors, ...a.depth_chart_errors, ...a.role_adjustments.errors].map((error) =>
        <div key={error} style={{ color: 'var(--alert)' }}>{error}</div>)}
    </div>
  </div>
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '6px', verticalAlign: 'top',
    borderBottom: '1px solid var(--steel-line)' }}>{children}</td>
}

function Reason({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>AUDIT REASON
    <input aria-label="Usage audit reason" value={value} style={control}
      placeholder="Roster verification, role, or exposure change"
      onChange={(e) => onChange(e.target.value)} />
  </label>
}
