'use client'

import { useEffect, useState } from 'react'
import type {
  DefensiveImpactResult, NbaDefensiveImpactStatus,
} from '@/lib/operator/client'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const tone: Record<DefensiveImpactResult['color'], string> = {
  red: 'var(--alert)', yellow: 'var(--amber)', green: 'var(--lime)',
  gray: 'var(--steel)',
}

function signed(value: number | null) {
  if (value == null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

function percentile(value: number | null) {
  if (value == null) return 'percentile —'
  const rounded = Math.round(value)
  const mod100 = rounded % 100
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th'
    : rounded % 10 === 1 ? 'st'
      : rounded % 10 === 2 ? 'nd'
        : rounded % 10 === 3 ? 'rd' : 'th'
  return `${rounded}${suffix} percentile`
}

export function DefensiveImpactBadge({ value }: { value?: DefensiveImpactResult }) {
  if (!value) return null
  return (
    <details style={{ marginTop: '6px', maxWidth: '430px' }}>
      <summary style={{ cursor: 'pointer', color: tone[value.color], ...mono,
                        fontSize: '10px', listStylePosition: 'inside' }}>
        <span aria-hidden>{value.icon}</span>{' '}
        DEFENSIVE IMPACT: {value.label.toUpperCase()}
        {value.risk_score == null ? '' : ` · ${signed(value.risk_score)}`}
      </summary>
      <div style={{ padding: '7px 0 0 14px', color: 'var(--steel)',
                    fontSize: '10px', lineHeight: 1.55 }}>
        <div>Confidence: {value.confidence} · {value.formula_version}</div>
        <div>Primary assignment effect: {signed(value.primary_assignment_effect)}</div>
        <div>Secondary / switch exposure: {signed(value.secondary_exposure_effect)}</div>
        <div>Team defense / help effect: {signed(value.team_defense_effect)}</div>
        {value.prop_relevance ? <div>
          Prop relevance: primary {(value.prop_relevance.primary * 100).toFixed(0)}%
          {' '}· secondary {(value.prop_relevance.secondary * 100).toFixed(0)}%
          {' '}· team {(value.prop_relevance.team * 100).toFixed(0)}%
        </div> : null}
        {value.team_defense ? <div>
          {value.team_defense.opponent_team} defense{' '}
          {value.team_defense.opponent_defensive_rating.toFixed(1)} vs league{' '}
          {value.team_defense.league_average_defensive_rating.toFixed(1)} · help{' '}
          {(value.team_defense.scheme_help_factor * 100).toFixed(0)}% · source confidence{' '}
          {(value.team_defense.source_confidence * 100).toFixed(0)}%
        </div> : null}
        {value.defenders.map((defender) => (
          <div key={`${defender.defender_name}-${defender.season}`}
            style={{ marginTop: '5px' }}>
            <strong style={{ color: 'var(--steel-bright)' }}>
              {defender.defender_name}
            </strong>{' '}
            · DEF {defender.defensive_epm == null ? '—' : signed(defender.defensive_epm)}
            {' '}· {percentile(defender.defensive_percentile)}
            {' '}· rank {defender.defensive_rank ?? '—'}
            <div>
              {defender.season} · as of {defender.as_of_date} · assignment{' '}
              {defender.assignment_confidence} · rotation {defender.rotation_confidence}
            </div>
            {defender.projected_shared_minutes == null ? null : <div>
              Defender minutes {defender.projected_minutes?.toFixed(1) ?? '—'} · shared minutes{' '}
              {defender.projected_shared_minutes.toFixed(1)} · primary share{' '}
              {((defender.primary_exposure_share ?? 0) * 100).toFixed(1)}% · secondary share{' '}
              {((defender.secondary_exposure_share ?? 0) * 100).toFixed(1)}%
            </div>}
            {defender.position_overlap == null ? null : <div>
              Position overlap {(defender.position_overlap * 100).toFixed(0)}% · switchability{' '}
              {((defender.switchability ?? 0) * 100).toFixed(0)}% · closing lineup{' '}
              {((defender.closing_lineup_probability ?? 0) * 100).toFixed(0)}% · source confidence{' '}
              {((defender.source_confidence ?? 0) * 100).toFixed(0)}%
            </div>}
            <div>Source: <a href={defender.source_url} target="_blank" rel="noreferrer"
              style={{ color: 'var(--blue)' }}>{defender.source_label}</a></div>
            {defender.reasons.map((reason) => (
              <div key={reason}>Defender unavailable: {reason}</div>
            ))}
          </div>
        ))}
        {value.reasons.map((reason) => <div key={reason}>Reason: {reason}</div>)}
        <div style={{ marginTop: '5px' }}>{value.caveat}</div>
      </div>
    </details>
  )
}

function apiError(body: unknown, status: number) {
  const detail = (body as { detail?: unknown } | null)?.detail
  return typeof detail === 'string' ? detail : `Request failed (${status})`
}

export default function DefensiveImpactPanel() {
  const [status, setStatus] = useState<NbaDefensiveImpactStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/operator/nba-defensive-impact', {
          cache: 'no-store', signal: controller.signal,
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          setError(apiError(body, response.status)); return
        }
        setStatus(body as NbaDefensiveImpactStatus)
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Status unavailable.')
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  if (error) {
    return <p role="alert" style={{ color: 'var(--alert)', padding: 'var(--pad)' }}>
      {error}
    </p>
  }
  if (!status) {
    return <p role="status" style={{ color: 'var(--steel)', padding: 'var(--pad)' }}>
      Loading defensive-impact license status…
    </p>
  }
  return (
    <div style={{ padding: 'var(--pad)', display: 'grid', gap: '10px',
                  color: 'var(--steel)', fontSize: '12px', lineHeight: 1.55 }}>
      <div style={{ ...mono, color: 'var(--steel-bright)', fontSize: '11px' }}>
        <span aria-hidden style={{ color: 'var(--steel)' }}>?</span>{' '}
        DEFENSIVE EPM EXPOSURE · LICENSE REQUIRED · PREVIEW ONLY
      </div>
      <p style={{ margin: 0 }}>
        Canonical input: <strong style={{ color: 'var(--steel-bright)' }}>
          {status.canonical_field}</strong> ({status.metric}). Do not use the adjacent{' '}
        <strong style={{ color: 'var(--steel-bright)' }}>{status.excluded_field}</strong>.
      </p>
      <p style={{ margin: 0 }}>{status.reason}</p>
      <p style={{ margin: 0 }}>{status.permitted_path}</p>
      <p style={{ margin: 0 }}>
        When authorized data is supplied, the indicator reports primary assignment,
        secondary switch/help exposure, closing-lineup overlap, team defense, source
        confidence, and prop-specific relevance separately. Unknown rotations remain gray.
      </p>
      <a href={status.terms_url} target="_blank" rel="noreferrer"
        style={{ color: 'var(--blue)', width: 'fit-content' }}>
        PROVIDER TERMS / LICENSING BOUNDARY
      </a>
    </div>
  )
}
