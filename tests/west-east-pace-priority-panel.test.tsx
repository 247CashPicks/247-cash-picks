import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WestEastPacePriorityPanel from '@/app/command/WestEastPacePriorityPanel'
import type { NbaWestEastPaceResult } from '@/lib/operator/client'

afterEach(() => vi.restoreAllMocks())

const result: NbaWestEastPaceResult = {
  indicator: {
    key: 'nba_west_to_east_pace_priority',
    display_name: 'West-to-East Pace-Up Priority', formula_version: '1.0.0',
    preview_only: true, production_eligible: false,
    projection_coefficient_pct: 0, automatic_projection_adjustment: false,
    backtest: { study: 'four-season cross-conference calibration',
      report_path: 'docs/nba_conference_calibration.md',
      recommended_coefficient_pct: 0,
      verdict: 'No stable incremental conference effect on holdout.' },
    owner_observation: { game_date: '2026-10-21', team: 'MIN',
      conference_direction: 'West -> East',
      observation: 'Owner reported all Minnesota players exceeded their lines.',
      evidence_role: 'owner-observed supporting audit case',
      causal_status: 'Not independently verified here and not universal causal proof.' },
  },
  game_date: '2026-10-21', generated_at: '2026-10-21T18:00:00Z',
  summary: { players_evaluated: 1, high_priority_players: 1,
    coefficient_changed: false },
  players: [{
    player_name: 'Minnesota Player', team: 'MIN', opponent_team: 'BOS',
    conference_direction: 'West -> East', status: 'HIGH PRIORITY', color: 'green',
    review_priority: 0, schedule_pace_delta: 3.25, opponent_pace: 103.4,
    league_average_pace: 100.2, pace_increase_vs_league_average_pct: 3.19,
    lineup_coverage: { complete: true, projected_minutes: 34,
      starter_status_known: true, is_starter: true },
    source_freshness: {
      player: { status: 'fresh', observed_at: '2026-10-21T17:30:00Z',
        age_hours: .5, fresh: true },
      pace_context: { status: 'fresh', observed_at: '2026-10-21T17:30:00Z',
        age_hours: .5, fresh: true },
      matchup: { status: 'fresh', observed_at: '2026-10-21T17:30:00Z',
        age_hours: .5, fresh: true },
    },
    confidence: 'high', fail_closed_reasons: [],
    projection_coefficient_pct: 0, automatic_projection_adjustment: false,
  }],
  outcome_tracking: { status: 'ongoing', unit: 'settled player prop',
    dimensions: ['game_date', 'player'],
    promotion_rule: 'No coefficient without stable multi-season holdout evidence.' },
  isolation: { preview_only: true, production_eligible: false,
    selection_mutated: false, projection_mutated: false },
}

describe('West-to-East pace-up priority panel', () => {
  it('renders a prominent green high-priority player with required evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })))
    render(<WestEastPacePriorityPanel />)
    expect(await screen.findByText('Minnesota Player')).toBeTruthy()
    expect(screen.getByText('HIGH PRIORITY')).toBeTruthy()
    expect(screen.getByText(/SCHEDULE PACE Δ \+3.25/)).toBeTruthy()
    expect(screen.getByText(/VS LEAGUE AVG \+3.19%/)).toBeTruthy()
    expect(screen.getByText(/LINEUP COMPLETE/)).toBeTruthy()
    expect(screen.getByText(/CONFIDENCE HIGH/)).toBeTruthy()
    expect(screen.getByText(/coefficient remains 0.0%/i)).toBeTruthy()
    expect(screen.getByText(/not universal causal proof/i)).toBeTruthy()
  })

  it('shows backend failures instead of a blank panel', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ detail: 'Pace context unavailable.' }), {
        status: 503, headers: { 'Content-Type': 'application/json' },
      })))
    render(<WestEastPacePriorityPanel />)
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Pace context unavailable.')
  })
})
