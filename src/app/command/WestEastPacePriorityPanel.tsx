'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  NbaWestEastPacePlayer, NbaWestEastPaceResult,
} from '@/lib/operator/client'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

function number(value: number | null, suffix = '') {
  if (value == null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`
}

function freshness(row: NbaWestEastPacePlayer) {
  return Object.entries(row.source_freshness)
    .map(([source, value]) => `${source}: ${value.status}${value.age_hours == null ? '' : ` ${value.age_hours}h`}`)
    .join(' · ')
}

export default function WestEastPacePriorityPanel() {
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [result, setResult] = useState<NbaWestEastPaceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const response = await fetch(
        `/api/operator/nba-west-east-pace-priority?game_date=${encodeURIComponent(gameDate)}`,
        { cache: 'no-store' },
      )
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const detail = body?.detail
        setError(typeof detail === 'string' ? detail : 'Could not load the pace-up priority review.')
        return
      }
      setResult(body as NbaWestEastPaceResult)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Preview backend is unreachable.')
    } finally {
      setBusy(false)
    }
  }, [gameDate])

  useEffect(() => { void load() }, [load])

  return <div style={{ display: 'grid', gap: '12px', padding: 'var(--pad)' }}>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
      <label style={{ display: 'grid', gap: '5px', color: 'var(--steel)',
                      fontSize: '10px', ...mono }}>
        GAME DATE
        <input type="date" aria-label="West-to-East pace-up game date"
          value={gameDate} onChange={(event) => setGameDate(event.target.value)}
          style={{ color: 'var(--steel-bright)', background: 'var(--navy-void)',
                   border: '1px solid var(--steel-line)', borderRadius: '3px',
                   padding: '7px', ...mono }} />
      </label>
      <button type="button" onClick={() => { void load() }} disabled={busy}
        style={{ border: '1px solid var(--steel-line)', borderRadius: '3px',
                 padding: '8px 12px', background: 'transparent', color: 'var(--blue)',
                 cursor: busy ? 'wait' : 'pointer', ...mono }}>
        {busy ? 'CHECKING…' : 'REFRESH'}
      </button>
      {result && <div style={{ marginLeft: 'auto', color: 'var(--steel)',
                              fontSize: '10px', ...mono }}>
        {result.summary.high_priority_players} HIGH PRIORITY / {result.summary.players_evaluated} REVIEWED
      </div>}
    </div>

    <div style={{ border: '1px solid var(--lime)', borderRadius: '4px',
                  padding: '12px', background: 'rgba(140, 255, 0, 0.06)',
                  fontSize: '12px', lineHeight: 1.55 }}>
      <strong style={{ color: 'var(--lime)', ...mono }}>OWNER HIGH-PRIORITY INDICATOR</strong>
      <div>Western player → Eastern opponent → verified pace-up matchup.</div>
      <div style={{ color: 'var(--steel)' }}>
        Review emphasis only. The four-season calibrated projection coefficient remains 0.0%.
      </div>
    </div>

    {error && <p role="alert" style={{ color: 'var(--alert)', margin: 0 }}>{error}</p>}

    {result?.players.length === 0 && !error &&
      <p style={{ color: 'var(--steel)', margin: 0 }}>No NBA player rows are available for this date.</p>}

    {result?.players.map((row) => {
      const highlighted = row.status === 'HIGH PRIORITY'
      return <article key={`${row.team}-${row.player_name}`} style={{
        display: 'grid', gap: '8px', padding: '12px', borderRadius: '4px',
        border: `1px solid ${highlighted ? 'var(--lime)' : 'var(--steel-line)'}`,
        background: highlighted ? 'rgba(140, 255, 0, 0.08)' : 'var(--navy-void)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px',
                      flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <strong style={{ color: highlighted ? 'var(--lime)' : 'var(--steel-bright)' }}>
              {row.player_name}
            </strong>
            <span style={{ color: 'var(--steel)', marginLeft: '8px', fontSize: '11px' }}>
              {row.team} vs {row.opponent_team} · {row.conference_direction}
            </span>
          </div>
          <strong style={{ color: highlighted ? 'var(--lime)' : 'var(--steel)',
                           fontSize: '11px', letterSpacing: '.07em', ...mono }}>
            {row.status}
          </strong>
        </div>
        <div style={{ display: 'grid', gap: '6px',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      fontSize: '11px', ...mono }}>
          <span>SCHEDULE PACE Δ {number(row.schedule_pace_delta)}</span>
          <span>VS LEAGUE AVG {number(row.pace_increase_vs_league_average_pct, '%')}</span>
          <span>OPP PACE {row.opponent_pace?.toFixed(2) ?? '—'}</span>
          <span>MINUTES {row.lineup_coverage.projected_minutes ?? '—'}</span>
          <span>LINEUP {row.lineup_coverage.complete ? 'COMPLETE' : 'INCOMPLETE'}</span>
          <span>CONFIDENCE {row.confidence.toUpperCase()}</span>
        </div>
        <div style={{ color: 'var(--steel)', fontSize: '10px', ...mono }}>
          {freshness(row)}
        </div>
        {!highlighted && row.fail_closed_reasons.length > 0 &&
          <div style={{ color: 'var(--alert)', fontSize: '10px', ...mono }}>
            FAIL CLOSED · {row.fail_closed_reasons.join(' · ')}
          </div>}
      </article>
    })}

    {result && <div style={{ display: 'grid', gap: '6px', color: 'var(--steel)',
                             fontSize: '10px', lineHeight: 1.5, ...mono }}>
      <span>BACKTEST · {result.indicator.backtest.verdict}</span>
      <span>OWNER OBSERVATION · {result.indicator.owner_observation.game_date} {result.indicator.owner_observation.team} · {result.indicator.owner_observation.evidence_role}; {result.indicator.owner_observation.causal_status}</span>
      <span>OUTCOME TRACKING · {result.outcome_tracking.status.toUpperCase()} · {result.outcome_tracking.promotion_rule}</span>
      <span style={{ color: 'var(--lime)' }}>PROTECTED PREVIEW · NO PROJECTION OR SELECTION MUTATION</span>
    </div>}
  </div>
}
