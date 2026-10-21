'use client'

import { useEffect, useState } from 'react'
import type {
  NbaWagerConcentrationStatus, WagerConcentrationResult,
} from '@/lib/operator/client'

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

export interface WagerConcentrationPacket {
  snapshot: Record<string, unknown>
  calibration: Record<string, unknown>
  basketball_risk?: Record<string, unknown>
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

export default function WagerConcentrationPanel() {
  const [status, setStatus] = useState<NbaWagerConcentrationStatus | null>(null)
  const [packetText, setPacketText] = useState('')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<WagerConcentrationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <span>SOURCE <a href={result.raw_metrics.source_url} target="_blank"
          rel="noreferrer" style={{ color: 'var(--blue)' }}>
          {result.raw_metrics.source_label}</a></span>
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
  </div>
}
