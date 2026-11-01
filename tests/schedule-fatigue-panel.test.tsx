import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScheduleFatiguePanel, {
  fatigueReviewRows, parseFatiguePacket,
} from '@/app/command/ScheduleFatiguePanel'
import type { NbaScheduleFatigueResult } from '@/lib/operator/client'

afterEach(() => vi.restoreAllMocks())

const packet = {
  schedule_games: [{ game_id: 'g1' }],
  player_game_logs: [{ game_id: 'g1', player_id: 'p1' }],
  schedule_provenance: { source_name: 'NBA.com' },
  box_score_provenance: { source_name: 'NBA.com' },
}

const sample = {
  opportunities: 9, appearances: 9, dnp_or_inactive: 0,
  total_minutes: 270, mean_minutes: 30, minutes_variance: 0,
}
const delta = {
  conditioned_mean: 18, baseline_mean: 20, conditioned_variance: 1,
  baseline_variance: 1, raw_delta: -2, raw_percent_delta: -10,
  shrink_factor: .53, shrunk_delta: -1.06, shrunk_percent_delta: -5.3,
}
const comparison = {
  status: 'Ready' as const, confidence: 'medium' as const,
  insufficient_reasons: [], conditioned_sample: sample,
  baseline_sample: { ...sample, appearances: 24, opportunities: 24,
    total_minutes: 720 }, minutes: { ...delta, shrunk_percent_delta: 0 },
  metrics: Object.fromEntries(['points', 'rebounds', 'assists', 'three_pm', 'pra']
    .map((key) => [key, { per_game: delta, per_minute: delta }])),
}
const result: NbaScheduleFatigueResult = {
  status: 'success',
  indicator: { key: 'nba_schedule_fatigue_effect', formula_version: '1.0.0',
    preview_only: true, production_eligible: false },
  scope: { seasons: ['2025-26'], start_date: '2025-10-01', end_date: '2026-04-12' },
  players: [{
    player_id: 'p1', player_name: 'Player One', player_name_aliases: ['Player One'],
    season_type: 'Regular Season',
    scope: { seasons: ['2025-26'], start_date: '2025-10-01', end_date: '2026-04-12' },
    flags: { team_change: false, teams: ['BOS'], role_change: false,
      roles: ['starter'], starter_states: [true], injury_affected_games: 0,
      injury_context_missing_games: 0, minutes_restriction_games: 0,
      availability_complete: true, survivorship_bias_risk: false },
    conditions: {
      back_to_back: { overall: comparison, by_season: [],
        recent_season_weighted: { status: 'Ready', season_weights: { '2025-26': 1 }, metrics: {} } },
      third_game_in_four_nights: { overall: { ...comparison, status: 'Unknown',
        confidence: 'unknown', insufficient_reasons: ['condition_games below minimum'] },
        by_season: [], recent_season_weighted: { status: 'Unknown', season_weights: {}, metrics: {} } },
    },
  }],
  provenance: { schedule: {}, box_scores: {}, reconciliation: null },
  audit: { input_snapshot_sha256: 'abc', formula_version: '1.0.0',
    computed_at: '2026-10-16T00:00:00Z', logged: true },
  isolation: { preview_only: true, production_eligible: false,
    official_projection_mutated: false, selection_mutated: false,
    publication_mutated: false },
}

describe('schedule fatigue packet', () => {
  it('requires both historical arrays and provenance records', () => {
    expect(parseFatiguePacket(JSON.stringify(packet)).schedule_games).toHaveLength(1)
    expect(() => parseFatiguePacket('{}')).toThrow(/schedule_games/)
  })

  it('creates one review row per player and condition', () => {
    expect(fatigueReviewRows(result)).toHaveLength(2)
    expect(fatigueReviewRows(result, 'season')).toHaveLength(0)
  })
})

describe('schedule fatigue panel', () => {
  it('submits through the protected operator proxy and renders auditable deltas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<ScheduleFatiguePanel />)
    fireEvent.change(screen.getByLabelText('Schedule fatigue snapshot JSON'), {
      target: { value: JSON.stringify(packet) },
    })
    fireEvent.change(screen.getByLabelText('Schedule fatigue audit reason'), {
      target: { value: 'Review historical fatigue before approving picks' },
    })
    fireEvent.click(screen.getByText('RUN PREVIEW ANALYSIS'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/operator/nba-schedule-fatigue/analyze',
      expect.objectContaining({ method: 'POST' })))
    expect((await screen.findAllByText('Player One')).length).toBe(2)
    expect(screen.getByText('BACK-TO-BACK')).toBeTruthy()
    expect(screen.getAllByText('-5.3%').length).toBeGreaterThan(0)
    expect(screen.getByText('PREVIEW ISOLATED')).toBeTruthy()
    expect(screen.getByText(/SCHEDULE unidentified source/)).toBeTruthy()
    expect(screen.getByLabelText('Schedule fatigue result view')).toBeTruthy()
  })

  it('fails closed before fetch when the audit reason is missing', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ScheduleFatiguePanel />)
    fireEvent.change(screen.getByLabelText('Schedule fatigue snapshot JSON'), {
      target: { value: JSON.stringify(packet) },
    })
    fireEvent.click(screen.getByText('RUN PREVIEW ANALYSIS'))
    expect(screen.getByRole('alert').textContent).toContain('audit reason')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
