import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CareerReboundingPanel, {
  ReboundContextBadge,
} from '@/app/command/CareerReboundingPanel'
import type {
  NbaCareerReboundingResponse, ReboundContextResult,
} from '@/lib/operator/client'

afterEach(() => vi.restoreAllMocks())

const packet: NbaCareerReboundingResponse = {
  status: 'ready',
  manifest: {
    metric: 'Career regular-season total rebounds per 100 possessions',
    retrieval_date: '2026-10-19', official_roster_count: 2,
    ranked_player_count: 1, no_career_metric_count: 1,
    unmatched_official_count: 0, bref_non_official_edge_case_count: 3,
    sources: ['NBA.com', 'Basketball Reference'],
    definition_guard: 'TRB per 100 possessions',
  },
  players: [{
    rank: 1, player_name: 'Veteran Center', current_team: 'DET', position: 'C',
    roster_class: 'active_roster', career_games: 200, career_minutes: 5000,
    career_orb_per_100: 5.0, career_drb_per_100: 11.0,
    career_trb_per_100: 16.0, sample_status: 'career_regular_season',
    confidence: 'high', freshness: 'retrieved 2026-10-19',
    official_roster_source: 'https://www.nba.com/players',
    career_source: 'https://www.basketball-reference.com/players/v/vetera01.html',
    retrieval_date: '2026-10-19',
  }, {
    rank: null, player_name: 'Rookie Guard', current_team: 'BOS', position: 'G',
    roster_class: 'two_way', career_games: null, career_minutes: null,
    career_orb_per_100: null, career_drb_per_100: null,
    career_trb_per_100: null, sample_status: 'no_prior_nba_regular_season',
    confidence: 'high', freshness: 'retrieved 2026-10-19',
    official_roster_source: 'https://www.nba.com/players', career_source: '',
    retrieval_date: '2026-10-19',
  }],
}

describe('career rebound reference panel', () => {
  it('loads through the protected proxy and preserves rookies without estimates', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(packet), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<CareerReboundingPanel />)
    expect(await screen.findByText('Veteran Center')).toBeTruthy()
    expect(screen.getByText('Rookie Guard')).toBeTruthy()
    expect(screen.getAllByText('NO SAMPLE').length).toBeGreaterThan(0)
    expect(screen.getByText('ROOKIE · NO CAREER SAMPLE')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/api/operator/nba-career-rebounding',
      expect.objectContaining({ cache: 'no-store' }))
    expect(screen.getByText('DOWNLOAD COMPLETE CSV').getAttribute('href'))
      .toBe('/downloads/nba_active_career_rebounds_per_100.csv')

    fireEvent.change(screen.getByLabelText('Filter roster class'), {
      target: { value: 'two_way' },
    })
    await waitFor(() => expect(screen.queryByText('Veteran Center')).toBeNull())
    expect(screen.getByText('Rookie Guard')).toBeTruthy()
  })
})

describe('rebound context badge', () => {
  it('uses accessible text and exposes every raw component', () => {
    const value: ReboundContextResult = {
      status: 'ready', color: 'green', icon: '▲', label: 'Favorable',
      score: 3.2, confidence: 'high', reasons: [],
      formula_version: 'nba-rebound-context-v1',
      thresholds: { red_below: -1.5, green_at_or_above: 1.5 },
      components: [{ name: 'pace_context', raw_percent: 4, weight: .15,
        weighted_points: .6, detail: '104.0 vs league 100.0' }],
    }
    render(<ReboundContextBadge value={value} />)
    expect(screen.getByText(/REBOUND CONTEXT: FAVORABLE/)).toBeTruthy()
    fireEvent.click(screen.getByText(/REBOUND CONTEXT: FAVORABLE/))
    expect(screen.getByText(/pace context: 104.0 vs league 100.0/)).toBeTruthy()
  })

  it('renders fail-closed unknown reasons instead of a color-only signal', () => {
    const value: ReboundContextResult = {
      status: 'unknown', color: 'gray', icon: '?', label: 'Unknown',
      score: null, confidence: 'unknown', components: [],
      reasons: ['projected lineup role is not confirmed'],
      formula_version: 'nba-rebound-context-v1',
      thresholds: { red_below: -1.5, green_at_or_above: 1.5 },
    }
    render(<ReboundContextBadge value={value} />)
    fireEvent.click(screen.getByText(/REBOUND CONTEXT: UNKNOWN/))
    expect(screen.getByText(/projected lineup role is not confirmed/)).toBeTruthy()
  })
})
