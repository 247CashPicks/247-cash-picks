import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DefensiveImpactPanel, {
  DefensiveImpactBadge,
} from '@/app/command/DefensiveImpactPanel'
import type {
  DefensiveImpactResult, NbaDefensiveImpactStatus,
} from '@/lib/operator/client'

afterEach(() => vi.restoreAllMocks())

const status: NbaDefensiveImpactStatus = {
  status: 'license_required',
  metric: 'Defensive Estimated Plus-Minus',
  canonical_field: 'DEF',
  excluded_field: 'EPM (total Estimated Plus-Minus)',
  commercial_model_use_authorized: false,
  source_data_loaded: false,
  terms_url: 'https://dunksandthrees.com/terms',
  reason: 'No written commercial predictive-model license is recorded.',
  permitted_path: 'Submit a licensed operator snapshot with provenance.',
  formula_version: 'nba-defensive-impact-exposure-v1',
}

describe('defensive impact license panel', () => {
  it('shows the DEF-vs-EPM guard and does not imply data was ingested', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify(status), { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))
    render(<DefensiveImpactPanel />)
    expect(await screen.findByText(/LICENSE REQUIRED/)).toBeTruthy()
    expect(screen.getByText(/Canonical input:/)).toBeTruthy()
    expect(screen.getByText(/No written commercial/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /PROVIDER TERMS/ }).getAttribute('href'))
      .toBe('https://dunksandthrees.com/terms')
  })
})

describe('defensive impact staged-slate badge', () => {
  it('keeps primary, secondary, and team effects visibly separate', () => {
    const value: DefensiveImpactResult = {
      status: 'ready', color: 'red', icon: '▼',
      label: 'Elevated defensive risk', risk_score: 2.4,
      confidence: 'medium', primary_assignment_effect: 0.5,
      secondary_exposure_effect: 1.1, team_defense_effect: 0.8,
      team_defense: { opponent_team: 'Detroit Pistons',
        opponent_defensive_rating: 110, league_average_defensive_rating: 114,
        scheme_help_factor: .75, source_confidence: .9 },
      prop_relevance: { primary: 1, secondary: .85, team: .7 },
      reasons: [], caveat: 'Exposure estimate only; never exact guarded possessions.',
      formula_version: 'nba-defensive-impact-exposure-v1',
      defenders: [{
        defender_name: 'Ausar Thompson', season: '2026-27',
        as_of_date: '2026-10-19T12:00:00Z', defensive_metric_name: 'DEF',
        defensive_epm: 2.2, defensive_percentile: 92,
        defensive_rank: 7, source_label: 'Licensed fixture',
        source_url: 'https://licensed.example.test/snapshot',
        assignment_confidence: 'unverified', rotation_confidence: 'verified',
        projected_minutes: 34, projected_shared_minutes: 30,
        position_overlap: .95, switchability: .95,
        closing_lineup_probability: .9, source_confidence: .9,
        primary_exposure_share: 0, secondary_exposure_share: .55,
        primary_effect: 0, secondary_effect: 1.1, reasons: [],
      }],
    }
    render(<DefensiveImpactBadge value={value} />)
    fireEvent.click(screen.getByText(/DEFENSIVE IMPACT: ELEVATED/))
    expect(screen.getByText(/Primary assignment effect: \+0.50/)).toBeTruthy()
    expect(screen.getByText(/Secondary \/ switch exposure: \+1.10/)).toBeTruthy()
    expect(screen.getByText(/Team defense \/ help effect: \+0.80/)).toBeTruthy()
    expect(screen.getByText(/Ausar Thompson/)).toBeTruthy()
    expect(screen.getByText(/92nd percentile/)).toBeTruthy()
    expect(screen.getByText(/Position overlap 95%/)).toBeTruthy()
    expect(screen.getByText(/Detroit Pistons defense 110.0 vs league 114.0/)).toBeTruthy()
    expect(screen.getByText(/never exact guarded possessions/)).toBeTruthy()
  })

  it('renders license and rotation failures as gray Unknown', () => {
    const value: DefensiveImpactResult = {
      status: 'unknown', color: 'gray', icon: '?', label: 'Unknown',
      risk_score: null, confidence: 'unknown', primary_assignment_effect: null,
      secondary_exposure_effect: null, team_defense_effect: null,
      team_defense: null,
      defenders: [], prop_relevance: null,
      reasons: ['No commercially authorized Defensive EPM snapshot is configured.'],
      caveat: 'Exposure estimate only; never exact guarded possessions.',
      formula_version: 'nba-defensive-impact-exposure-v1',
    }
    render(<DefensiveImpactBadge value={value} />)
    fireEvent.click(screen.getByText(/DEFENSIVE IMPACT: UNKNOWN/))
    expect(screen.getByText(/No commercially authorized/)).toBeTruthy()
  })
})
