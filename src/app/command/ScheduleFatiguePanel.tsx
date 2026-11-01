'use client'

import { useMemo, useState } from 'react'
import type {
  NbaFatigueComparison, NbaFatiguePlayer, NbaScheduleFatigueResult,
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
const th: React.CSSProperties = {
  ...mono, padding: '8px', color: 'var(--steel)', fontSize: '9px',
  letterSpacing: '.06em', textAlign: 'left', whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--steel-line)',
}
const td: React.CSSProperties = {
  padding: '8px', fontSize: '11px', color: 'var(--steel-bright)',
  borderBottom: '1px solid var(--steel-line)', verticalAlign: 'top',
}

export interface ScheduleFatiguePacket {
  schedule_games: Array<Record<string, unknown>>
  player_game_logs: Array<Record<string, unknown>>
  schedule_provenance: Record<string, unknown>
  box_score_provenance: Record<string, unknown>
  reconciliation_provenance?: Record<string, unknown> | null
  availability_complete?: boolean
}

export interface FatigueReviewRow {
  player: NbaFatiguePlayer
  condition: 'back_to_back' | 'third_game_in_four_nights'
  comparison: NbaFatigueComparison
  season: string
}

export function parseFatiguePacket(text: string): ScheduleFatiguePacket {
  const packet = JSON.parse(text) as Partial<ScheduleFatiguePacket> | null
  if (!packet || !Array.isArray(packet.schedule_games)
      || !Array.isArray(packet.player_game_logs)
      || !packet.schedule_provenance || !packet.box_score_provenance) {
    throw new Error('Snapshot must include schedule_games, player_game_logs, schedule_provenance, and box_score_provenance.')
  }
  return packet as ScheduleFatiguePacket
}

export function fatigueReviewRows(
  result: NbaScheduleFatigueResult | null,
  view: 'overall' | 'season' = 'overall',
): FatigueReviewRow[] {
  if (!result) return []
  if (view === 'season') {
    return result.players.flatMap((player) => ([
      ...player.conditions.back_to_back.by_season.map((comparison) => ({
        player, condition: 'back_to_back' as const,
        comparison, season: comparison.season,
      })),
      ...player.conditions.third_game_in_four_nights.by_season.map((comparison) => ({
        player, condition: 'third_game_in_four_nights' as const,
        comparison, season: comparison.season,
      })),
    ]))
  }
  return result.players.flatMap((player) => ([
    { player, condition: 'back_to_back' as const,
      comparison: player.conditions.back_to_back.overall, season: 'ALL' },
    { player, condition: 'third_game_in_four_nights' as const,
      comparison: player.conditions.third_game_in_four_nights.overall, season: 'ALL' },
  ]))
}

function apiError(body: unknown, status: number) {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    return (detail as { error?: string }).error ?? JSON.stringify(detail)
  }
  return `Request failed (${status})`
}

function pct(comparison: NbaFatigueComparison, key: string) {
  const value = comparison.metrics[key]?.per_game.shrunk_percent_delta
  if (value == null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function tone(value: string) {
  if (value === 'Ready' || value === 'high') return 'var(--lime)'
  if (value === 'medium') return 'var(--blue)'
  if (value === 'Unknown') return 'var(--alert)'
  return 'var(--steel)'
}

function conditionLabel(condition: FatigueReviewRow['condition']) {
  return condition === 'back_to_back' ? 'BACK-TO-BACK' : '3RD GAME / 4 NIGHTS'
}

function flags(player: NbaFatiguePlayer) {
  const values = []
  if (player.flags.team_change) values.push('team change')
  if (player.flags.role_change) values.push('role change')
  if (player.flags.injury_affected_games) values.push(`${player.flags.injury_affected_games} injury`)
  if (player.flags.minutes_restriction_games) values.push(`${player.flags.minutes_restriction_games} minutes restriction`)
  if (player.flags.survivorship_bias_risk) values.push('availability incomplete')
  return values.length ? values.join(' · ') : 'none'
}

function sourceLabel(source: Record<string, unknown>) {
  const name = typeof source.source_name === 'string' ? source.source_name : 'unidentified source'
  const retrieved = typeof source.retrieved_at === 'string'
    ? new Date(source.retrieved_at).toLocaleString()
    : 'retrieval time unavailable'
  return `${name} · ${retrieved}`
}

export default function ScheduleFatiguePanel() {
  const [snapshot, setSnapshot] = useState('')
  const [reason, setReason] = useState('')
  const [availabilityComplete, setAvailabilityComplete] = useState(false)
  const [result, setResult] = useState<NbaScheduleFatigueResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'overall' | 'season'>('overall')
  const rows = useMemo(() => fatigueReviewRows(result, view), [result, view])

  async function loadFile(file: File | undefined) {
    if (!file) return
    setSnapshot(await file.text())
    setError(null)
  }

  async function analyze() {
    if (!reason.trim()) {
      setError('An audit reason is required.'); return
    }
    let packet: ScheduleFatiguePacket
    try { packet = parseFatiguePacket(snapshot) } catch (e) {
      setError(e instanceof Error ? e.message : 'Snapshot must be valid JSON.'); return
    }
    setBusy(true); setError(null); setResult(null)
    try {
      const response = await fetch('/api/operator/nba-schedule-fatigue/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...packet,
          availability_complete: availabilityComplete,
          reason: reason.trim() }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(apiError(body, response.status)); return
      }
      setResult(body as NbaScheduleFatigueResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview backend is unreachable.')
    } finally {
      setBusy(false)
    }
  }

  return <div>
    <div style={{ padding: 'var(--pad)', display: 'grid', gap: '12px' }}>
      <div style={{ padding: '10px', border: '1px solid var(--steel-line)',
                    color: 'var(--steel)', fontSize: '12px', lineHeight: 1.5 }}>
        Protected Preview diagnostic. Upload or paste a point-in-time NBA schedule
        and box-score snapshot. The analysis is audited and cannot modify official
        projections, staged selections, publications, or customer data.
      </div>
      <label style={{ display: 'grid', gap: '5px', ...mono, fontSize: '10px',
                      color: 'var(--steel)' }}>
        VERIFIED SNAPSHOT JSON
        <input aria-label="Schedule fatigue snapshot file" type="file"
          accept="application/json,.json" onChange={(event) => {
            void loadFile(event.currentTarget.files?.[0])
          }} />
        <textarea aria-label="Schedule fatigue snapshot JSON" value={snapshot}
          onChange={(event) => setSnapshot(event.target.value)} rows={8}
          placeholder={'{"schedule_games": [...], "player_game_logs": [...], "schedule_provenance": {...}, "box_score_provenance": {...}}'}
          style={{ ...control, resize: 'vertical' }} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                      color: 'var(--steel-bright)', fontSize: '12px' }}>
        <input type="checkbox" checked={availabilityComplete}
          onChange={(event) => setAvailabilityComplete(event.target.checked)} />
        Snapshot includes eligible players who did not play, not only appearances
      </label>
      <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr auto' }}>
        <input aria-label="Schedule fatigue audit reason" value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Audit reason" style={control} />
        <button type="button" onClick={() => { void analyze() }}
          disabled={busy} style={{ ...button, opacity: busy ? .5 : 1 }}>
          {busy ? 'ANALYZING…' : 'RUN PREVIEW ANALYSIS'}
        </button>
      </div>
      {error && <p role="alert" style={{ margin: 0, color: 'var(--alert)',
                                         fontSize: '12px' }}>{error}</p>}
    </div>

    {result && <>
      <div style={{ padding: '10px var(--pad)', display: 'flex', gap: '18px',
                    flexWrap: 'wrap', borderTop: '1px solid var(--steel-line)',
                    color: 'var(--steel)', fontSize: '11px', ...mono }}>
        <span>SEASONS {result.scope.seasons.join(', ')}</span>
        <span>{result.scope.start_date} → {result.scope.end_date}</span>
        <span>PLAYERS {result.players.length}</span>
        <span>FORMULA {result.audit.formula_version}</span>
        <span>AUDIT {result.audit.logged ? 'LOGGED' : 'UNCONFIRMED'}</span>
        <span style={{ color: 'var(--lime)' }}>PREVIEW ISOLATED</span>
      </div>
      <div style={{ padding: '10px var(--pad)', display: 'grid', gap: '8px',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                    borderTop: '1px solid var(--steel-line)', ...mono,
                    color: 'var(--steel)', fontSize: '10px' }}>
        <span>SCHEDULE {sourceLabel(result.provenance.schedule)}</span>
        <span>BOX SCORES {sourceLabel(result.provenance.box_scores)}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          VIEW
          <select aria-label="Schedule fatigue result view" value={view}
            onChange={(event) => setView(event.target.value as 'overall' | 'season')}
            style={{ ...control, width: 'auto' }}>
            <option value="overall">Multi-season overall</option>
            <option value="season">Individual seasons</option>
          </select>
        </label>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table aria-label="NBA schedule fatigue review" style={{ width: '100%',
          borderCollapse: 'collapse', minWidth: '1180px' }}>
          <thead><tr>{[
            'Player', 'Season', 'Season type', 'Condition', 'Status', 'Confidence',
            'Sample', 'Minutes Δ', 'PTS Δ', 'REB Δ', 'AST Δ', '3PM Δ',
            'PRA Δ', 'Risk flags',
          ].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead>
          <tbody>{rows.map(({ player, condition, comparison, season }) => <tr
            key={`${player.player_id}-${player.season_type}-${condition}-${season}`}>
            <td style={td}><strong>{player.player_name}</strong><div style={{
              ...mono, fontSize: '9px', color: 'var(--steel)' }}>
              {player.flags.teams.join(' / ')}</div></td>
            <td style={{ ...td, ...mono }}>{season}</td>
            <td style={td}>{player.season_type}</td>
            <td style={{ ...td, ...mono }}>{conditionLabel(condition)}</td>
            <td style={{ ...td, color: tone(comparison.status), ...mono }}>
              {comparison.status.toUpperCase()}
              {comparison.insufficient_reasons.length > 0 && <div title={
                comparison.insufficient_reasons.join('; ')} style={{
                  color: 'var(--steel)', fontSize: '9px' }}>insufficient sample</div>}
            </td>
            <td style={{ ...td, color: tone(comparison.confidence), ...mono }}>
              {comparison.confidence.toUpperCase()}</td>
            <td style={{ ...td, ...mono }}>
              {comparison.conditioned_sample.appearances} / {comparison.baseline_sample.appearances}
              <div style={{ color: 'var(--steel)', fontSize: '9px' }}>condition / baseline</div>
            </td>
            <td style={{ ...td, ...mono }}>{comparison.minutes.shrunk_percent_delta == null
              ? '—' : `${comparison.minutes.shrunk_percent_delta > 0 ? '+' : ''}${comparison.minutes.shrunk_percent_delta.toFixed(1)}%`}</td>
            {['points', 'rebounds', 'assists', 'three_pm', 'pra'].map((key) =>
              <td key={key} style={{ ...td, ...mono }}>{pct(comparison, key)}</td>)}
            <td style={{ ...td, minWidth: '170px', color: player.flags.survivorship_bias_risk
              ? 'var(--alert)' : 'var(--steel)' }}>{flags(player)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </div>
}
