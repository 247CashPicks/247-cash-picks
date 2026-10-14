import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UsageDifferentialPanel from '@/app/command/UsageDifferentialPanel'
import type { NbaUsageDifferential, NbaUsagePlayer } from '@/lib/operator/client'

function player(team: string): NbaUsagePlayer {
  return {
    player_id: `${team}-p1`, player_name: `${team} Player`, prior_team: 'OLD',
    current_team: team, has_prior_nba_sample: true, usg_pct: 24,
    possessions: 1000, minutes: 400, games: 20, confidence: 'high',
    position: 'G', active: true, depth_slot: 1, projected_minutes: 32,
    projected_role: 'starter', prior_role: 'starter',
    prior_primary_handler: true, projected_primary_handler: true,
    usage_adjustment_pct: 0, usage_adjustment_reason: null,
    lineup_overlap: 'verified', primary_handler_context: 'verified handler',
    roster_source_url: `https://www.nba.com/${team.toLowerCase()}/roster`,
    roster_verified_at: '2026-10-14T00:00:00Z',
    provenance: {
      source_name: 'Licensed NBA baseline', source_url: 'https://example.test/usage',
      license: 'CC BY 4.0', retrieved_at: '2026-10-14T00:00:00Z',
      season: '2025-26', season_type: 'Regular Season', per_mode: 'Totals',
      definition: 'Exposure-weighted USG%', source_team: 'OLD',
    },
  }
}

function analysis(team: string, index: number): NbaUsageDifferential {
  const p = player(team)
  return {
    id: `usage-${index}`, league: 'NBA', season: '2026-27', team, status: 'draft',
    source_players: [p], player_overrides: {}, reason: 'verified fixture',
    actor_user_id: 'owner', actor_display_name: 'Owner',
    analysis: {
      team, ready: true, errors: [], method: 'Exposure-weighted whole-roster method.',
      exposure_basis: 'possessions', outgoing_load: 24, incoming_load: 0,
      net_load: -24, depth_chart_ready: true, depth_chart_errors: [],
      active_incoming_load: 0, active_outgoing_load: 24, active_net_load: -24,
      active_method: 'Active depth chart kept separate.',
      active_depth_slots: [{ slot: 1, unit: 'starter', player_name: p.player_name }],
      contributors: [{ player_id: p.player_id, original: p, override: null,
        effective: p, classification: 'outgoing', exposure_basis: 'possessions',
        usage_load_per_1000: 24 }],
      unknown_newcomers: index === 0
        ? [{ player_id: 'unknown-1', player_name: 'Unknown Newcomer',
          reason: 'No prior NBA sample.' }] : [],
      returning_opportunities: [],
      role_adjustments: {
        ready: true, errors: [], method: 'Role layer defaults to zero.',
        players: [{ player_id: p.player_id, player_name: p.player_name,
          original_usg_pct: 24, operator_adjustment_pct: 0, effective_usg_pct: 24,
          prior_role: 'starter', current_role: 'starter',
          prior_primary_handler: true, projected_primary_handler: true,
          hypothesis: 'No change', projected_minutes: 32, lineup_overlap: 'verified',
          primary_handler_context: 'verified handler', confidence: 'high', reason: null,
          defaulted_to_no_change: true, label: 'unchanged' }],
      },
    },
  }
}

afterEach(() => {
  delete document.body.dataset.printReport
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('NBA offseason usage differential report', () => {
  it('renders the fail-closed empty report and opens a scoped PDF-save dialog', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/nba-usage-differentials?season=2026-27')
      return Response.json({ league: 'NBA', season: '2026-27', analyses: [] })
    }))

    render(<UsageDifferentialPanel />)

    expect(await screen.findByText(/No verified all-team results yet/)).toBeTruthy()
    expect(screen.getByText(/Incomplete teams are excluded from rankings/)).toBeTruthy()
    expect(screen.getByText(/Raw percentages are never summed/)).toBeTruthy()
    expect(screen.getByText(/Destination → Save as PDF/)).toBeTruthy()
    expect(screen.getByText('All-team summary · 0 team row(s)')).toBeTruthy()
    expect(screen.getByText(/No selected verified team detail/)).toBeTruthy()
    fireEvent.click(screen.getByText('SAVE USAGE REPORT AS PDF'))
    expect(print).toHaveBeenCalledOnce()
    expect(document.body.dataset.printReport).toBe('nba-usage-differential')
    window.dispatchEvent(new Event('afterprint'))
    expect(document.body.dataset.printReport).toBeUndefined()
  })

  it('keeps all 30 rows plus selected provenance and unknown labels in the PDF report', async () => {
    const teams = ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
      'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
      'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS']
    const analyses = teams.map(analysis)
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      league: 'NBA', season: '2026-27', analyses,
    })))

    render(<UsageDifferentialPanel />)
    const report = await screen.findByLabelText('NBA usage differential PDF all-team summary')
    expect(report.querySelectorAll('tr')).toHaveLength(31)

    const interactiveRow = Array.from(document.querySelectorAll('table:not([aria-label]) tbody tr'))
      .find((row) => row.querySelector('td')?.textContent === 'ATL')
    fireEvent.click(interactiveRow!)

    expect(await screen.findByText('ATL selected-team detail')).toBeTruthy()
    expect(document.body.textContent).toContain('Unknown Newcomer · No prior NBA sample.')
    expect(document.body.textContent).toContain('https://example.test/usage')
    expect(document.body.textContent).toContain('CC BY 4.0')
    expect(document.body.textContent).toContain('high · prior NBA sample: yes')
  })
})
