import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WagerConcentrationPanel, {
  parseWagerConcentrationPacket,
} from '@/app/command/WagerConcentrationPanel'
import type {
  NbaWagerConcentrationStatus, WagerConcentrationResult,
} from '@/lib/operator/client'

afterEach(() => vi.restoreAllMocks())

const packet = {
  snapshot: { player_name: 'Example Player', bet_pct: 40, handle_pct: 70 },
  calibration: { calibration_id: 'retained-preview-1' },
  basketball_risk: { personal_foul_rate: 3.1 },
}

const status: NbaWagerConcentrationStatus = {
  status: 'source_required',
  indicator_key: 'nba_wager_concentration',
  display_name: 'Chalk / Wager Concentration',
  formula_version: 'nba-wager-concentration-v1',
  preview_only: true,
  production_eligible: false,
  preferred_source: 'DraftKings when commercially authorized',
  source_data_loaded: false,
  commercial_use_authorized: false,
  reason: 'No authorized market-split snapshot is loaded.',
  required_market_fields: ['source', 'sportsbook', 'bet_pct', 'handle_pct'],
  dollar_handle_policy: 'Exact dollar handle is neither accepted nor inferred.',
  threshold_policy: 'Severity requires validated retained-snapshot calibration.',
  isaiah_hartenstein_example: 'not_loaded_until_actual_split_and_game_are_verified',
}

const result: WagerConcentrationResult = {
  status: 'ready',
  severity: 'high',
  color: 'red',
  icon: '!',
  label: 'high wager concentration',
  red_caution_flag: true,
  raw_metrics: {
    provider_name: 'Licensed Provider', sportsbook: 'DraftKings',
    source_label: 'Licensed market feed', source_url: 'https://example.test/snapshot',
    provider_terms_url: 'https://example.test/terms',
    market_timestamp: '2026-10-21T17:00:00Z',
    retrieved_at: '2026-10-21T17:01:00Z', game_id: 'game-1',
    game_date: '2026-10-21', player_id: 'player-1', player_name: 'Example Player',
    team: 'OKC', opponent_team: 'DEN', market_key: 'player_rebounds',
    line: 10.5, side: 'over', odds_american: -115, bet_pct: 40,
    handle_pct: 70, handle_minus_bet_pp: 30, bet_rank: 4, handle_rank: 1,
    line_movement: { previous_line: 9.5, current_line: 10.5, line_delta: 1,
      previous_odds_american: -105, current_odds_american: -115,
      previous_market_timestamp: '2026-10-21T16:00:00Z' },
  },
  thresholds: {
    status: 'validated', calibration_id: 'retained-preview-1',
    method: 'Held-out retained-snapshot calibration',
    calibrated_at: '2026-10-20T00:00:00Z', retained_snapshot_sha256: 'a'.repeat(64),
    training_rows: 1200, holdout_rows: 400, caution_handle_pct: 60,
    high_handle_pct: 68, caution_gap_pp: 12, high_gap_pp: 20,
    holdout_flagged_rows: 42, holdout_adverse_rate_pct: 55,
    source_label: 'Retained authorized snapshots',
    source_url: 'https://example.test/calibration',
  },
  why_fired: ['Handle share met the calibrated high threshold.'], reasons: [],
  freshness: 'current', coverage: 'complete',
  basketball_risk: { personal_foul_rate: 3.1, opponent_rim_pressure: 61,
    projected_minutes: 31, likely_matchup: 'Starting center' },
  advisory: { selection_removed: false, automatic_rejection: false,
    causal_performance_claim: false,
    message: 'Heavy betting does not cause foul trouble or player performance.' },
  audit: { input_snapshot_sha256: 'b'.repeat(64),
    calibration_snapshot_sha256: 'a'.repeat(64),
    formula_version: 'nba-wager-concentration-v1',
    computed_at: '2026-10-21T17:02:00Z', logged: true },
  isolation: { preview_only: true, production_eligible: false,
    official_projection_mutated: false, selection_mutated: false,
    publication_mutated: false },
}

describe('wager concentration packet', () => {
  it('requires both a snapshot and calibration', () => {
    expect(parseWagerConcentrationPacket(JSON.stringify(packet)).snapshot)
      .toEqual(packet.snapshot)
    expect(() => parseWagerConcentrationPacket('{}')).toThrow(/snapshot and calibration/)
  })
})

describe('wager concentration panel', () => {
  it('shows the protected source and calibration boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(status), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })))
    render(<WagerConcentrationPanel />)
    expect(await screen.findByText(/SOURCE REQUIRED/)).toBeTruthy()
    expect(screen.getByText(status.dollar_handle_policy)).toBeTruthy()
    expect(screen.getByText(status.threshold_policy)).toBeTruthy()
  })

  it('renders raw metrics separately from calibrated severity and basketball risk', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(status), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(result), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)
    render(<WagerConcentrationPanel />)
    await screen.findByText(/SOURCE REQUIRED/)
    fireEvent.change(screen.getByLabelText('Wager concentration snapshot JSON'), {
      target: { value: JSON.stringify(packet) },
    })
    fireEvent.change(screen.getByLabelText('Wager concentration audit reason'), {
      target: { value: 'Review concentration without changing the pick' },
    })
    fireEvent.click(screen.getByText('RUN PREVIEW REVIEW'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/operator/nba-wager-concentration/analyze',
      expect.objectContaining({ method: 'POST' })))
    expect(screen.getByText(/RED CAUTION/)).toBeTruthy()
    expect(screen.getByText('70.0%')).toBeTruthy()
    expect(screen.getByText('30.0 pp')).toBeTruthy()
    expect(screen.getByText(/training 1200/)).toBeTruthy()
    expect(screen.getByText(/Personal foul rate 3.1/)).toBeTruthy()
    expect(screen.getByText(result.advisory.message)).toBeTruthy()
  })

  it('requires an audit reason before analysis', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(status), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<WagerConcentrationPanel />)
    await screen.findByText(/SOURCE REQUIRED/)
    fireEvent.change(screen.getByLabelText('Wager concentration snapshot JSON'), {
      target: { value: JSON.stringify(packet) },
    })
    fireEvent.click(screen.getByText('RUN PREVIEW REVIEW'))
    expect(screen.getByRole('alert').textContent).toContain('audit reason')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
