import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RotationPanel from '@/app/command/RotationPanel'
import type {
  NbaLeagueAveragePaceContext, NbaPaceIndicatorValue, NbaRotation,
  NbaRotationPlayer,
} from '@/lib/operator/client'

const leagueContext: NbaLeagueAveragePaceContext = {
  value: 100.2, raw_value: 100.2167, unit: 'possessions_per_48_minutes',
  season: '2025-26', season_type: 'Regular Season',
  definition: 'Mean NBA team PACE', source_name: 'SportsDataverse NBA Stats',
  source_url: 'https://example.test/team_stats_advanced_2026.parquet',
  source_sha256: 'abc123', license: 'CC BY 4.0',
  retrieved_at: '2026-10-14T00:00:00Z', teams: 30, team_games: 2460,
  model_contract_precision: 1,
}

function effect(status: NbaPaceIndicatorValue['status'], text: string,
                value: number): NbaPaceIndicatorValue {
  return {
    indicator_key: 'nba_opponent_pace_effect_pct', name: 'Opponent Pace Effect',
    formula_version: '1.0.0', formula: '((opponent - league) / league) * 100',
    unit: 'percent', polarity: { positive: 'favorable', negative: 'unfavorable' },
    thresholds: { pace_up_min_pct: .05, pace_down_max_pct: -.05,
      neutral_absolute_lt_pct: .05, display_decimal_places: 1,
      rounding_mode: 'ROUND_HALF_UP' },
    value, value_full_precision: String(value), display_value: value,
    status, symbol: status === 'pace_up' ? '+' : status === 'pace_down' ? '-' : '=',
    text, screen_reader_label: `${text} compared with verified league average`,
    confidence: 'high', provenance: {}, freshness: {},
    applicability: { league: 'NBA', unit: 'starter',
      comparison: 'starter_vs_starter', role: 'own_unit', opponent_team: null },
    league_average: leagueContext,
  }
}

function player(slot: number): NbaRotationPlayer {
  return {
    slot, player_id: `p${slot}`, player_name: `Player ${slot}`,
    pace: 97 + slot, usage_pct: 20 + slot, sample_games: 70,
    sample_minutes: 1800, sample_confidence: 'high', pace_driver: null,
    current_team: 'LAL', roster_source_url: 'https://www.nba.com/lakers/roster',
    roster_verified_at: '2026-10-14T00:00:00Z', provisional_baseline: true,
    provenance: {
      source_name: 'SportsDataverse NBA Stats league-dash',
      source_url: 'https://example.test/player_stats_advanced_2026.parquet',
      license: 'CC BY 4.0', retrieved_at: '2026-10-14T00:00:00Z',
      season: '2025-26', season_type: 'Regular Season', per_mode: 'Totals',
      definition: 'NBA Advanced Players PACE', source_team: 'LAL',
    },
  }
}

const source = Array.from({ length: 10 }, (_, index) => player(index + 1))
const slots = source.map((original) => ({
  slot: original.slot, unit: original.slot <= 5 ? 'starter' as const : 'bench' as const,
  original, override: null, effective: original,
}))

const rotation: NbaRotation = {
  id: 'rotation-1', league: 'NBA', season: '2026-27', team: 'LAL',
  status: 'draft', source_slots: source, slot_overrides: {}, blend_weights: null,
  reason: 'opening rotation', actor_user_id: 'user-1', actor_display_name: 'Owner',
  evaluation: {
    ready: true,
    heuristic_label: 'Preseason projected-unit pace heuristic',
    baseline_label: 'Provisional opening-season carry-forward from final 2025-26',
    errors: [], slots,
    starters: { unit: 'starter', ready: true, errors: [], average_pace: 100,
      league_average_pace: 100.2, league_average_pace_context: leagueContext,
      vs_league_delta: -.2, label_vs_league: 'pace-down',
      own_unit_pace: effect('pace_down', 'PACE DOWN -0.2%', -.2) },
    bench: { unit: 'bench', ready: true, errors: [], average_pace: 105,
      league_average_pace: 100.2, league_average_pace_context: leagueContext,
      vs_league_delta: 4.8, label_vs_league: 'pace-up',
      own_unit_pace: effect('pace_up', 'PACE UP +4.8%', 4.8) },
    blended: null, blend_note: 'kept separate', weighting_mode: 'arithmetic',
    usage_note: 'descriptive only',
    pace_drivers: source.map((p) => ({ slot: p.slot, player_id: p.player_id,
      player_name: p.player_name, usage_pct: p.usage_pct,
      status: 'not verified' as const, evidence: null, descriptive_only: true as const })),
    pace_driver_rankings: [],
    influence_adjustment: { enabled: false as const, mode: 'off' as const,
      reason: 'requires backtest' },
  },
}

afterEach(() => {
  delete document.body.dataset.printReport
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('NBA projected rotation pace editor', () => {
  it('shows separate arithmetic starter and bench paces and no inferred driver', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.includes('/nba-rotations?')) return Response.json({
        league: 'NBA', season: '2026-27', league_average_pace: 100.2,
        league_average_pace_context: leagueContext,
        pace_season: '2025-26', pace_definition: 'PACE',
        indicator_definitions: [], rotations: [rotation],
      })
      if (path.endsWith('/rotation-1/audit')) return Response.json({ events: [] })
      throw new Error(`unexpected ${path}`)
    }))
    render(<RotationPanel />)
    const option = await screen.findByRole('option', { name: /LAL · ready/ })
    fireEvent.change(screen.getByLabelText('Rotation'),
                     { target: { value: option.getAttribute('value') } })
    expect((await screen.findAllByText('100')).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('105').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/PACE DRIVERS/)).toBeTruthy()
    expect(screen.getAllByText('not verified').length).toBeGreaterThan(0)
    expect(screen.getByText(/Influence adjustment OFF/)).toBeTruthy()
    expect(screen.getByText(/Destination → Save as PDF/)).toBeTruthy()
    await screen.findByText('LAL selected-team detail')
    expect(document.body.textContent).toContain('CC BY 4.0')
    expect(document.body.textContent).toContain(
      'https://example.test/player_stats_advanced_2026.parquet')
    fireEvent.click(screen.getByText('SAVE PACE REPORT AS PDF'))
    expect(print).toHaveBeenCalledOnce()
    expect(document.body.dataset.printReport).toBe('nba-unit-pace')
    window.dispatchEvent(new Event('afterprint'))
    expect(document.body.dataset.printReport).toBeUndefined()
  })

  it('saves a pace override with identity, provenance, roster verification, and reason', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.includes('/nba-rotations?')) return Response.json({
        league: 'NBA', season: '2026-27', league_average_pace: 100.2,
        league_average_pace_context: leagueContext,
        pace_season: '2025-26', pace_definition: 'PACE',
        indicator_definitions: [], rotations: [rotation],
      })
      if (path.endsWith('/rotation-1/audit')) return Response.json({ events: [] })
      if (path.endsWith('/rotation-1') && init?.method === 'PATCH') {
        return Response.json(rotation)
      }
      throw new Error(`unexpected ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<RotationPanel />)
    await screen.findByRole('option', { name: /LAL · ready/ })
    fireEvent.change(screen.getByLabelText('Rotation'), { target: { value: 'rotation-1' } })
    const pace = await screen.findByLabelText('Slot 1 pace')
    fireEvent.change(pace, { target: { value: '109.5' } })
    fireEvent.change(screen.getByLabelText('Rotation audit reason'),
                     { target: { value: 'licensed source correction' } })
    fireEvent.click(screen.getByText('SAVE OVERRIDES'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/operator/nba-rotations/rotation-1', expect.objectContaining({ method: 'PATCH' })))
    const call = fetchMock.mock.calls.find(([path, init]) =>
      path === '/api/operator/nba-rotations/rotation-1' && init?.method === 'PATCH')!
    const body = JSON.parse(String(call[1]?.body))
    expect(body.reason).toBe('licensed source correction')
    expect(body.slot_overrides['1']).toMatchObject({
      player_id: 'p1', player_name: 'Player 1', pace: 109.5,
      current_team: 'LAL', roster_verified_at: '2026-10-14T00:00:00Z',
      provisional_baseline: true,
    })
    expect(body.slot_overrides['1'].provenance.season).toBe('2025-26')
  })

  it('renders opponent-facing starter and bench effects with accessible text and raw support', async () => {
    const starterEffect = {
      ...effect('pace_up', 'PACE UP +2.7%', 2.7),
      screen_reader_label: 'Starter pace up plus 2.7 percent compared with verified league average',
      applicability: { league: 'NBA' as const, unit: 'starter' as const,
        comparison: 'starter_vs_starter', role: 'matchup_pace_effect' as const,
        opponent_team: 'BOS', team: 'LAL' },
    }
    const benchEffect = {
      ...effect('pace_down', 'PACE DOWN -5.0%', -5), symbol: '-' as const,
      screen_reader_label: 'Bench pace down minus 5.0 percent compared with verified league average',
      applicability: { league: 'NBA' as const, unit: 'bench' as const,
        comparison: 'bench_vs_bench', role: 'matchup_pace_effect' as const,
        opponent_team: 'BOS', team: 'LAL' },
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.includes('/nba-rotations?')) return Response.json({
        league: 'NBA', season: '2026-27', league_average_pace: 100.2,
        league_average_pace_context: leagueContext, pace_season: '2025-26',
        pace_definition: 'PACE', indicator_definitions: [], rotations: [rotation],
      })
      if (path.endsWith('/rotation-1/audit')) return Response.json({ events: [] })
      if (path.includes('/nba-rotations/matchup?')) return Response.json({
        season: '2026-27', team: rotation, opponent: rotation,
        comparison: { ready: true, errors: [], indicator_definition: {},
          starters: { team_pace: 100, opponent_pace: 102.9, delta: -2.9,
            label: 'pace-down', own_unit_pace: rotation.evaluation.starters.own_unit_pace,
            matchup_pace_effect: starterEffect,
            supporting_raw_values: { team_unit_projected_pace: 100,
              opponent_unit_projected_pace: 102.9,
              verified_league_average_pace: 100.2,
              team_minus_opponent_pace: -2.9 } },
          bench: { team_pace: 105, opponent_pace: 95.19, delta: 9.81,
            label: 'pace-up', own_unit_pace: rotation.evaluation.bench.own_unit_pace,
            matchup_pace_effect: benchEffect,
            supporting_raw_values: { team_unit_projected_pace: 105,
              opponent_unit_projected_pace: 95.19,
              verified_league_average_pace: 100.2,
              team_minus_opponent_pace: 9.81 } },
          players: [] },
      })
      throw new Error(`unexpected ${path}`)
    }))
    render(<RotationPanel />)
    await screen.findByRole('option', { name: /LAL · ready/ })
    fireEvent.change(screen.getByLabelText('Rotation'), { target: { value: 'rotation-1' } })
    fireEvent.change(screen.getByLabelText('Opponent team'), { target: { value: 'BOS' } })
    fireEvent.click(screen.getByText('COMPARE UNITS'))
    expect(await screen.findByLabelText(starterEffect.screen_reader_label)).toBeTruthy()
    expect(screen.getByLabelText(benchEffect.screen_reader_label)).toBeTruthy()
    expect(screen.getByText(/own 100 · opponent 102.9 · league 100.2/)).toBeTruthy()
    expect(screen.getByText(/own 105 · opponent 95.19 · league 100.2/)).toBeTruthy()
  })
})
