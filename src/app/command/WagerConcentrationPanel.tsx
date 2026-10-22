'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  NbaWagerConcentrationStatus, WagerConcentrationResult,
  WagerConcentrationResults, WagerConcentrationRow,
} from '@/lib/operator/client'
import { easternToday } from '@/lib/time/eastern'
import { ReferenceOnlyLabel, marketSourcePolicy } from '@/lib/market-source-policy'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const control: React.CSSProperties = {
  width: '100%', border: '1px solid var(--steel-line)', borderRadius: '3px',
  color: 'var(--steel-bright)', background: 'var(--navy-void)',
  fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '8px',
}
const button: React.CSSProperties = {
  ...mono, fontSize: '10px', letterSpacing: '.06em', padding: '8px 12px',
  color: 'var(--blue)', background: 'transparent', cursor: 'pointer',
  border: '1px solid var(--steel-line)', borderRadius: '3px',
}
const tones: Record<WagerConcentrationResult['color'], string> = {
  red: 'var(--alert)', yellow: 'var(--amber)', green: 'var(--lime)',
  gray: 'var(--steel)',
}
const resultTone: Record<WagerConcentrationRow['severity'], string> = {
  high: 'var(--alert)', elevated: 'var(--amber)', normal: 'var(--lime)',
  unknown: 'var(--steel)',
}
const resultIcon: Record<WagerConcentrationRow['severity'], string> = {
  high: '▲', elevated: '●', normal: '✓', unknown: '?',
}
const tableCell: React.CSSProperties = {
  padding: '8px 9px', borderBottom: '1px solid var(--steel-line)',
  verticalAlign: 'top', fontSize: '11px', lineHeight: 1.45,
}
const tableHead: React.CSSProperties = {
  ...tableCell, ...mono, color: 'var(--steel)', fontSize: '9px',
  letterSpacing: '.06em', textAlign: 'left', whiteSpace: 'nowrap',
}

export interface WagerConcentrationPacket {
  snapshot: Record<string, unknown>
  calibration: Record<string, unknown>
  basketball_risk?: Record<string, unknown>
}

type WagerFilters = {
  slate: string; game: string; player: string; market: string; book: string
}

export function parseWagerConcentrationPacket(text: string): WagerConcentrationPacket {
  const packet = JSON.parse(text) as Partial<WagerConcentrationPacket> | null
  if (!packet || !packet.snapshot || !packet.calibration) {
    throw new Error('Snapshot JSON must include snapshot and calibration objects.')
  }
  return packet as WagerConcentrationPacket
}

function apiError(body: unknown, status: number) {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    return (detail as { error?: string }).error ?? JSON.stringify(detail)
  }
  return `Request failed (${status})`
}

function number(value: number | null, suffix = '') {
  return value == null ? '—' : `${value.toFixed(1)}${suffix}`
}

function odds(value: number | null) {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : `${value}`
}

function timestamp(value: string) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function SourceReference({ source, label, url }: {
  source: unknown; label: string; url: string
}) {
  const policy = marketSourcePolicy(source)
  const text = label || 'Source'
  if (policy.classification === 'reference_only' || !url.startsWith('https://')) {
    return <span style={{ color: 'var(--steel)' }}>{text}</span>
  }
  return <a href={url} target="_blank" rel="noreferrer"
    style={{ color: 'var(--blue)' }}>{text}</a>
}

export function WagerCautionBadge({ row }: { row: WagerConcentrationRow | null }) {
  if (!row) return null
  const label = row.severity === 'high'
    ? 'High wager concentration caution'
    : row.severity === 'elevated'
      ? 'Moderate wager concentration caution'
      : row.severity === 'normal'
        ? 'Verified no wager concentration caution'
        : 'Wager concentration unknown'
  return <span aria-label={label} title={label} style={{
    ...mono, display: 'inline-flex', gap: '4px', alignItems: 'center',
    marginTop: '4px', fontSize: '9px', letterSpacing: '.04em',
    color: resultTone[row.severity],
  }}>
    <span aria-hidden>{resultIcon[row.severity]}</span>
    {row.severity.toUpperCase()} CONCENTRATION
  </span>
}

export default function WagerConcentrationPanel() {
  const [status, setStatus] = useState<NbaWagerConcentrationStatus | null>(null)
  const [packetText, setPacketText] = useState('')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<WagerConcentrationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<WagerConcentrationResults | null>(null)
  const [resultsBusy, setResultsBusy] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [filters, setFilters] = useState<WagerFilters>({
    slate: easternToday(), game: '', player: '', market: '', book: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<WagerFilters>({
    slate: easternToday(), game: '', player: '', market: '', book: '',
  })

  const loadResults = useCallback(async (signal?: AbortSignal) => {
    setResultsBusy(true); setResultsError(null)
    const params = new URLSearchParams({ slate: appliedFilters.slate })
    for (const key of ['game', 'player', 'market', 'book'] as const) {
      if (appliedFilters[key].trim()) params.set(key, appliedFilters[key].trim())
    }
    try {
      const response = await fetch(
        `/api/operator/nba-wager-concentration/results?${params.toString()}`,
        { cache: 'no-store', signal })
      const body = await response.json().catch(() => null)
      if (!response.ok) { setResultsError(apiError(body, response.status)); return }
      setResults(body as WagerConcentrationResults)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setResultsError(cause instanceof Error ? cause.message : 'Daily results unavailable.')
    } finally {
      if (!signal?.aborted) setResultsBusy(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/operator/nba-wager-concentration', {
          cache: 'no-store', signal: controller.signal,
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) { setError(apiError(body, response.status)); return }
        setStatus(body as NbaWagerConcentrationStatus)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Source status unavailable.')
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadResults(controller.signal)
    return () => controller.abort()
  }, [loadResults])

  async function analyze() {
    if (!reason.trim()) { setError('An audit reason is required.'); return }
    let packet: WagerConcentrationPacket
    try { packet = parseWagerConcentrationPacket(packetText) } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Snapshot must be valid JSON.')
      return
    }
    setBusy(true); setError(null); setResult(null)
    try {
      const response = await fetch('/api/operator/nba-wager-concentration/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...packet, basketball_risk: packet.basketball_risk ?? {},
          reason: reason.trim() }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) { setError(apiError(body, response.status)); return }
      setResult(body as WagerConcentrationResult)
      await loadResults()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preview backend is unreachable.')
    } finally {
      setBusy(false)
    }
  }

  return <div>
    <div style={{ padding: 'var(--pad)', display: 'grid', gap: '12px' }}>
      <div style={{ padding: '10px', border: '1px solid var(--steel-line)',
                    color: 'var(--steel)', fontSize: '12px', lineHeight: 1.55 }}>
        Protected Preview advisory. Paste only a commercially authorized,
        identity-matched player-prop split snapshot and its retained-snapshot
        calibration packet. Missing, stale, partial, unmatched, or uncalibrated
        inputs remain gray Unknown. This panel never removes a player or prop.
      </div>
      {status ? <div style={{ display: 'grid', gap: '6px', color: 'var(--steel)',
                              fontSize: '11px', lineHeight: 1.5 }}>
        <span style={{ ...mono, color: 'var(--steel-bright)' }}>
          SOURCE REQUIRED · {status.preferred_source.toUpperCase()}
        </span>
        <span>{status.reason}</span>
        <span>{status.dollar_handle_policy}</span>
        <span>{status.threshold_policy}</span>
        <span>Required: {status.required_market_fields.join(' · ')}</span>
      </div> : null}
      <label style={{ display: 'grid', gap: '5px', ...mono, fontSize: '10px',
                      color: 'var(--steel)' }}>
        AUTHORIZED MARKET + CALIBRATION JSON
        <textarea aria-label="Wager concentration snapshot JSON" value={packetText}
          onChange={(event) => setPacketText(event.target.value)} rows={10}
          placeholder={'{"snapshot": {...}, "calibration": {...}, "basketball_risk": {...}}'}
          style={{ ...control, resize: 'vertical' }} />
      </label>
      <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr auto' }}>
        <input aria-label="Wager concentration audit reason" value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Audit reason" style={control} />
        <button type="button" onClick={() => { void analyze() }} disabled={busy}
          style={{ ...button, opacity: busy ? .5 : 1 }}>
          {busy ? 'ANALYZING…' : 'RUN PREVIEW REVIEW'}
        </button>
      </div>
      {error ? <p role="alert" style={{ margin: 0, color: 'var(--alert)',
                                        fontSize: '12px' }}>{error}</p> : null}
    </div>

    {result ? <div style={{ borderTop: '1px solid var(--steel-line)' }}>
      <div style={{ padding: '12px var(--pad)', display: 'grid', gap: '6px',
                    borderLeft: `4px solid ${tones[result.color]}` }}>
        <strong style={{ color: tones[result.color], ...mono, fontSize: '12px' }}>
          <span aria-hidden>{result.icon}</span>{' '}
          {result.label.toUpperCase()}
          {result.red_caution_flag ? ' · RED CAUTION' : ''}
        </strong>
        <span style={{ color: 'var(--steel)', fontSize: '11px' }}>
          Freshness {result.freshness} · coverage {result.coverage} · audit{' '}
          {result.audit.logged ? 'logged' : 'unconfirmed'}
        </span>
        {result.why_fired.map((item) => <span key={item}
          style={{ color: 'var(--steel-bright)', fontSize: '11px' }}>{item}</span>)}
        {result.reasons.map((item) => <span key={item}
          style={{ color: 'var(--alert)', fontSize: '11px' }}>Unknown: {item}</span>)}
      </div>

      {result.raw_metrics ? <div style={{ padding: '12px var(--pad)', display: 'grid',
            gap: '7px', color: 'var(--steel)', fontSize: '11px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <span>PLAYER <strong>{result.raw_metrics.player_name}</strong></span>
        <span>MARKET <strong>{result.raw_metrics.side.toUpperCase()} {' '}
          {result.raw_metrics.line} {result.raw_metrics.market_key}</strong></span>
        <span>ODDS <strong>{odds(result.raw_metrics.odds_american)}</strong></span>
        <span>BET <strong>{number(result.raw_metrics.bet_pct, '%')}</strong>
          {' '}· rank {result.raw_metrics.bet_rank ?? '—'}</span>
        <span>HANDLE <strong>{number(result.raw_metrics.handle_pct, '%')}</strong>
          {' '}· rank {result.raw_metrics.handle_rank ?? '—'}</span>
        <span>HANDLE − BET <strong>
          {number(result.raw_metrics.handle_minus_bet_pp, ' pp')}</strong></span>
        <span>LINE MOVE <strong>
          {number(result.raw_metrics.line_movement.line_delta)}</strong>
          {' '}· prior {result.raw_metrics.line_movement.previous_line ?? '—'}</span>
        <span>PRIOR / CURRENT ODDS <strong>
          {odds(result.raw_metrics.line_movement.previous_odds_american)} → {' '}
          {odds(result.raw_metrics.line_movement.current_odds_american)}</strong></span>
        <span>SOURCE <SourceReference source={result.raw_metrics.sportsbook}
          label={result.raw_metrics.source_label} url={result.raw_metrics.source_url} />
          <div><ReferenceOnlyLabel source={result.raw_metrics.sportsbook} /></div>
        </span>
      </div> : null}

      {result.thresholds ? <div style={{ padding: '12px var(--pad)',
            borderTop: '1px solid var(--steel-line)', color: 'var(--steel)',
            fontSize: '11px', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--steel-bright)' }}>CALIBRATION</strong>{' '}
        {result.thresholds.calibration_id} · training {result.thresholds.training_rows}
        {' '}· holdout {result.thresholds.holdout_rows} · handle caution/high {' '}
        {result.thresholds.caution_handle_pct}/{result.thresholds.high_handle_pct}%
        {' '}· gap caution/high {result.thresholds.caution_gap_pp}/
        {result.thresholds.high_gap_pp} pp
        <div>{result.thresholds.method}</div>
      </div> : null}

      <div style={{ padding: '12px var(--pad)', borderTop: '1px solid var(--steel-line)',
                    color: 'var(--steel)', fontSize: '11px', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--steel-bright)' }}>SEPARATE BASKETBALL RISK</strong>
        <div>Personal foul rate {number(result.basketball_risk.personal_foul_rate)}
          {' '}· opponent rim pressure {number(result.basketball_risk.opponent_rim_pressure)}
          {' '}· projected minutes {number(result.basketball_risk.projected_minutes)}</div>
        <div>Likely matchup: {result.basketball_risk.likely_matchup ?? 'Unknown'}</div>
        <div style={{ color: 'var(--steel-bright)', marginTop: '6px' }}>
          {result.advisory.message}
        </div>
      </div>
    </div> : null}
    <DailyResultsTable results={results} filters={filters} setFilters={setFilters}
      busy={resultsBusy} error={resultsError}
      onRefresh={() => {
        const unchanged = Object.keys(filters).every(key =>
          filters[key as keyof WagerFilters] === appliedFilters[key as keyof WagerFilters])
        if (unchanged) void loadResults()
        else setAppliedFilters({ ...filters })
      }} />
  </div>
}

function DailyResultsTable({ results, filters, setFilters, busy, error, onRefresh }: {
  results: WagerConcentrationResults | null
  filters: WagerFilters
  setFilters: React.Dispatch<React.SetStateAction<WagerFilters>>
  busy: boolean
  error: string | null
  onRefresh: () => void
}) {
  const update = (key: keyof typeof filters, value: string) => {
    setFilters(current => ({ ...current, [key]: value }))
  }
  return <section aria-label="Daily wager concentration results"
    style={{ borderTop: '1px solid var(--steel-line)' }}>
    <div style={{ padding: '12px var(--pad)', display: 'grid', gap: '9px' }}>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between',
                    alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ ...mono, color: 'var(--steel-bright)', fontSize: '12px' }}>
          DAILY PROP-LEVEL RESULTS
        </strong>
        <span role="status" style={{ color: 'var(--steel)', fontSize: '10px' }}>
          {busy ? 'Refreshing…' : `${results?.total ?? 0} audited row(s)`}
        </span>
      </div>
      <div style={{ display: 'grid', gap: '8px',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {([
          ['slate', 'Slate date', 'date'], ['game', 'Game', 'text'],
          ['player', 'Player', 'text'], ['market', 'Market', 'text'],
          ['book', 'Sportsbook', 'text'],
        ] as const).map(([key, label, type]) => <label key={key}
          style={{ display: 'grid', gap: '4px', ...mono, fontSize: '9px',
                   color: 'var(--steel)' }}>
          {label.toUpperCase()}
          <input aria-label={`Wager results ${label.toLowerCase()} filter`}
            type={type} value={filters[key]}
            onChange={(event) => update(key, event.target.value)} style={control} />
        </label>)}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onRefresh} disabled={busy} style={button}>
          REFRESH RESULTS
        </button>
        <span style={{ color: 'var(--steel)', fontSize: '10px' }}>
          Order: red caution · yellow moderate · verified neutral · gray Unknown.
          No row is hidden, downgraded, rejected, or removed.
        </span>
      </div>
      {error ? <p role="alert" style={{ margin: 0, color: 'var(--alert)',
                                        fontSize: '12px' }}>{error}</p> : null}
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table aria-label="Daily audited wager concentration results"
        style={{ width: '100%', minWidth: '1550px', borderCollapse: 'collapse' }}>
        <caption style={{ position: 'absolute', width: '1px', height: '1px',
                          padding: 0, margin: '-1px', overflow: 'hidden',
                          clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
          Audited NBA prop-level wager concentration results for {results?.slate ?? filters.slate}
        </caption>
        <thead><tr>{[
          'Caution / status', 'Player', 'Team / opponent', 'Prop market',
          'Line / side', 'Current odds', 'Bet %', 'Handle %', 'Gap',
          'Bet rank', 'Handle rank', 'Sportsbook / source',
          'Market / retrieval time', 'Freshness', 'Calibration', 'Why flagged',
        ].map(label => <th key={label} scope="col" style={tableHead}>{label}</th>)}</tr></thead>
        <tbody>
          {(results?.rows ?? []).map(row => <tr key={row.id}
            style={{ borderLeft: `4px solid ${resultTone[row.severity]}` }}>
            <td style={tableCell}><WagerCautionBadge row={row} />
              <div style={{ color: 'var(--steel)', marginTop: '3px' }}>{row.label}</div></td>
            <td style={tableCell}><strong>{row.player_name || 'Unknown'}</strong></td>
            <td style={tableCell}>{row.team || '—'} / {row.opponent_team || '—'}</td>
            <td style={tableCell}>{row.market_key || 'Unknown'}</td>
            <td style={{ ...tableCell, ...mono }}>
              {row.line ?? '—'} {row.side ? row.side.toUpperCase() : '—'}</td>
            <td style={{ ...tableCell, ...mono }}>{odds(row.odds_american)}</td>
            <td style={{ ...tableCell, ...mono }}>{number(row.bet_pct, '%')}</td>
            <td style={{ ...tableCell, ...mono }}>{number(row.handle_pct, '%')}</td>
            <td style={{ ...tableCell, ...mono }}>
              {number(row.handle_minus_bet_pp, ' pp')}</td>
            <td style={{ ...tableCell, ...mono }}>{row.bet_rank ?? '—'}</td>
            <td style={{ ...tableCell, ...mono }}>{row.handle_rank ?? '—'}</td>
            <td style={tableCell}><strong>{row.sportsbook || 'Unknown'}</strong>
              <div><ReferenceOnlyLabel source={row.sportsbook} /></div>
              <div><SourceReference source={row.sportsbook}
                label={row.source_label} url={row.source_url} /></div></td>
            <td style={tableCell}>Market {timestamp(row.market_timestamp)}<br />
              Retrieved {timestamp(row.retrieved_at)}</td>
            <td style={tableCell}>{row.freshness}<br />{row.coverage}</td>
            <td style={tableCell}>{row.calibration_version || 'Unknown'}<br />
              <span style={{ color: 'var(--steel)' }}>{row.formula_version}</span></td>
            <td style={{ ...tableCell, minWidth: '250px' }}>
              {row.why_flagged.length ? row.why_flagged.join('; ') : 'No verified reason recorded.'}
            </td>
          </tr>)}
          {!busy && (results?.rows.length ?? 0) === 0 ? <tr><td colSpan={16}
            style={{ ...tableCell, padding: '18px var(--pad)', color: 'var(--steel)' }}>
            No audited prop reviews match these filters. This is not a neutral signal;
            coverage remains Unknown until an authorized snapshot is reviewed.
          </td></tr> : null}
        </tbody>
      </table>
    </div>
    {results?.truncated ? <p role="alert" style={{ margin: 0, padding: '10px var(--pad)',
        color: 'var(--amber)', fontSize: '11px' }}>
      Only the newest 1,000 audited reviews were scanned. Narrow the filters.
    </p> : null}
  </section>
}
