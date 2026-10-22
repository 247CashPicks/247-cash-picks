'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  NbaCareerReboundPlayer, NbaCareerReboundingResponse, ReboundContextResult,
} from '@/lib/operator/client'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const th: React.CSSProperties = {
  ...mono, padding: '8px', color: 'var(--steel)', fontSize: '9px',
  letterSpacing: '.06em', textAlign: 'left', whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--steel-line)',
}
const td: React.CSSProperties = {
  padding: '8px', fontSize: '11px', color: 'var(--steel-bright)',
  borderBottom: '1px solid var(--steel-line)', verticalAlign: 'top',
}
const control: React.CSSProperties = {
  border: '1px solid var(--steel-line)', borderRadius: '3px',
  color: 'var(--steel-bright)', background: 'var(--navy-void)',
  fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '8px',
}

function apiError(body: unknown, status: number) {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    return (detail as { error?: string }).error ?? JSON.stringify(detail)
  }
  return `Request failed (${status})`
}

function metric(value: number | null) {
  return value == null ? 'NO SAMPLE' : value.toFixed(1)
}

function sampleLabel(row: NbaCareerReboundPlayer) {
  if (row.sample_status === 'career_regular_season') return 'VERIFIED CAREER'
  if (row.sample_status === 'no_prior_nba_regular_season') return 'ROOKIE · NO CAREER SAMPLE'
  return row.sample_status.replaceAll('_', ' ').toUpperCase()
}

const contextTone: Record<ReboundContextResult['color'], string> = {
  red: 'var(--alert)', yellow: 'var(--amber)', green: 'var(--lime)',
  gray: 'var(--steel)',
}

export function ReboundContextBadge({ value }: { value?: ReboundContextResult }) {
  if (!value) return null
  return (
    <details style={{ marginTop: '6px', maxWidth: '360px' }}>
      <summary style={{ cursor: 'pointer', color: contextTone[value.color],
                        ...mono, fontSize: '10px', listStylePosition: 'inside' }}>
        <span aria-hidden>{value.icon}</span>{' '}
        REBOUND CONTEXT: {value.label.toUpperCase()}
        {value.score == null ? '' : ` · ${value.score > 0 ? '+' : ''}${value.score.toFixed(2)}`}
      </summary>
      <div style={{ padding: '7px 0 0 14px', color: 'var(--steel)',
                    fontSize: '10px', lineHeight: 1.5 }}>
        <div>Confidence: {value.confidence} · {value.formula_version}</div>
        {value.components.map((component) => (
          <div key={component.name}>
            {component.name.replaceAll('_', ' ')}: {component.detail} · weight{' '}
            {(component.weight * 100).toFixed(0)}% · contribution{' '}
            {component.weighted_points > 0 ? '+' : ''}{component.weighted_points.toFixed(2)}
          </div>
        ))}
        {value.reasons.map((reason) => <div key={reason}>Reason: {reason}</div>)}
      </div>
    </details>
  )
}

export default function CareerReboundingPanel() {
  const [packet, setPacket] = useState<NbaCareerReboundingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [rosterClass, setRosterClass] = useState('all')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/operator/nba-career-rebounding', {
          cache: 'no-store', signal: controller.signal,
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          setError(apiError(body, response.status)); return
        }
        setPacket(body as NbaCareerReboundingResponse)
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Reference unavailable.')
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return (packet?.players ?? []).filter((row) => (
      (!term || row.player_name.toLocaleLowerCase().includes(term)
        || row.current_team.toLocaleLowerCase().includes(term))
      && (rosterClass === 'all' || row.roster_class === rosterClass)
    ))
  }, [packet, rosterClass, search])

  if (error) {
    return <p role="alert" style={{ color: 'var(--alert)', padding: 'var(--pad)' }}>{error}</p>
  }
  if (!packet) {
    return <p role="status" style={{ color: 'var(--steel)', padding: 'var(--pad)' }}>
      Loading verified career rebound reference…
    </p>
  }

  return <div>
    <div style={{ padding: 'var(--pad)', display: 'grid', gap: '12px' }}>
      <div style={{ color: 'var(--steel)', fontSize: '12px', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--steel-bright)' }}>{packet.manifest.metric}</strong>
        {' '}from the regular-season career row—not rebound percentage, per-game,
        per-36, or current-season-only. Matchup traffic lights in the staged slate
        require fresh defender, lineup, pace, and team context; missing evidence is gray.
      </div>
      <div style={{ ...mono, display: 'flex', gap: '16px', flexWrap: 'wrap',
                    color: 'var(--steel)', fontSize: '10px' }}>
        <span>OFFICIAL ROSTER {packet.manifest.official_roster_count}</span>
        <span>RANKED {packet.manifest.ranked_player_count}</span>
        <span>NO CAREER SAMPLE {packet.manifest.no_career_metric_count}</span>
        <span>RETRIEVED {packet.manifest.retrieval_date}</span>
        <a href="/downloads/nba_active_career_rebounds_per_100.csv" download
          style={{ color: 'var(--blue)' }}>DOWNLOAD COMPLETE CSV</a>
        <a href="/downloads/nba_roster_edge_cases.csv" download
          style={{ color: 'var(--blue)' }}>DOWNLOAD EDGE CASES</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto',
                    gap: '8px' }}>
        <input aria-label="Search career rebound reference" value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search player or current team" style={control} />
        <select aria-label="Filter roster class" value={rosterClass}
          onChange={(event) => setRosterClass(event.target.value)} style={control}>
          <option value="all">All official roster players</option>
          <option value="active_roster">Active roster</option>
          <option value="two_way">Two-way</option>
          <option value="unmatched_official_roster">Unmatched official record</option>
        </select>
      </div>
    </div>
    <div style={{ overflowX: 'auto', maxHeight: '720px', overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <caption style={{ position: 'absolute', width: '1px', height: '1px',
                          padding: 0, margin: '-1px', overflow: 'hidden',
                          clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap',
                          border: 0 }}>
          Active NBA players ranked by career regular-season rebounds per 100 possessions
        </caption>
        <thead><tr>
          {['Rank', 'Player', 'Team', 'Pos', 'ORB/100', 'DRB/100', 'TRB/100',
            'Career GP', 'Career MIN', 'Roster / sample', 'Confidence / source']
            .map((label) => <th key={label} scope="col" style={th}>{label}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.player_name}-${row.current_team}`}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '42px' }}>
              <td style={{ ...td, ...mono }}>{row.rank ?? '—'}</td>
              <td style={td}><strong>{row.player_name}</strong></td>
              <td style={{ ...td, ...mono }}>{row.current_team || '—'}</td>
              <td style={{ ...td, ...mono }}>{row.position || '—'}</td>
              <td style={{ ...td, ...mono }}>{metric(row.career_orb_per_100)}</td>
              <td style={{ ...td, ...mono }}>{metric(row.career_drb_per_100)}</td>
              <td style={{ ...td, ...mono, color: row.career_trb_per_100 == null
                ? 'var(--steel)' : 'var(--lime)' }}>
                {metric(row.career_trb_per_100)}
              </td>
              <td style={{ ...td, ...mono }}>{row.career_games ?? '—'}</td>
              <td style={{ ...td, ...mono }}>{row.career_minutes ?? '—'}</td>
              <td style={{ ...td, ...mono, fontSize: '9px' }}>
                {row.roster_class.replaceAll('_', ' ').toUpperCase()}
                <div style={{ color: 'var(--steel)', marginTop: '3px' }}>
                  {sampleLabel(row)}
                </div>
              </td>
              <td style={{ ...td, ...mono, fontSize: '9px' }}>
                {row.confidence.toUpperCase()} · {row.retrieval_date}
                {row.career_source ? <div style={{ marginTop: '3px' }}>
                  <a href={row.career_source} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--blue)' }}>CAREER SOURCE</a>
                </div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p style={{ padding: '10px var(--pad)', margin: 0, color: 'var(--steel)',
                fontSize: '11px' }}>
      Showing {rows.length} of {packet.players.length}. Unsigned, waived, and
      training-camp-only records are separated in the edge-case download and are
      not silently mixed into the official active roster ranking.
    </p>
  </div>
}
