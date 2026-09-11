import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LineRanksPanel, SlatePanel, parseTeamRanks, stagedSlateHeading } from '@/app/command/panels'
import ProjectionsPanel, { type ProjRow } from '@/app/dashboard/ProjectionsPanel'
import { latestLiveProjections } from '@/lib/picks/projections'
import { leagueWindowDates } from '@/lib/picks/visible_selections'
import type { NflScheduleContext, StagedSlateResponse } from '@/lib/operator/client'
import { easternToday } from '@/lib/time/eastern'

afterEach(() => vi.restoreAllMocks())

const slate: StagedSlateResponse = {
  league: 'NFL', limit: 50, offset: 0,
  window: { start: '2026-09-09', end: '2026-09-14',
    source: 'schedule_week', week: 1 },
  counts: { pending: 2 }, total: 2, pending: 2,
  selections: ['Christian McCaffrey', 'Puka Nacua'].map((name, index) => ({
    id: `sel-${index}`, player_name: name, team: index ? 'LAR' : 'SF',
    stat_type: 'rec_yds', line: 60.5, our_projection: 70,
    direction: 'over', edge_pct: 15.7, confidence: 'medium',
    tier_required: 'free', status: 'pending', game_date: '2026-09-13',
    platform: 'underdog', line_pulled: false,
    provenance: { config_id: null, config_name: null, agent_run_id: null,
      agent_run_short: null, snapshot_hash_short: null },
  })),
}

describe('league-native visibility', () => {
  it('keeps the Eastern game date after UTC midnight', () => {
    expect(easternToday(new Date('2026-09-11T00:30:00Z'))).toBe('2026-09-10')
  })

  it('shows the complete NFL week on Thursday, including earlier and later dates', () => {
    const games = [
      { game_date: '2026-09-09', week: 1 },
      { game_date: '2026-09-10', week: 1 },
      { game_date: '2026-09-13', week: 1 },
      { game_date: '2026-09-14', week: 1 },
      { game_date: '2026-09-17', week: 2 },
    ]
    expect(leagueWindowDates('NFL', '2026-09-10', games)).toEqual([
      '2026-09-09', '2026-09-10', '2026-09-13', '2026-09-14',
    ])
  })

  it('names the NFL week and its schedule range in the panel heading', () => {
    expect(stagedSlateHeading(slate)).toBe('NFL Week 1 · Sep 9–14')
  })

  it('keeps only the latest live projection and excludes all preview rows', () => {
    const rows = [
      { id: 'preview', player_name: 'Ja\u2019Marr Chase', game_date: '2026-09-13',
        created_at: '2026-09-09T00:00:00Z', run_label: 'preview:835' },
      { id: 'live-old', player_name: 'Ja\u2019Marr Chase', game_date: '2026-09-13',
        created_at: '2026-09-09T01:00:00Z', run_label: 'live' },
      { id: 'live-new', player_name: 'Ja\u2019Marr Chase', game_date: '2026-09-13',
        created_at: '2026-09-10T01:00:00Z', run_label: 'live' },
    ]
    expect(latestLiveProjections(rows).map(row => row.id)).toEqual(['live-new'])
  })
})

describe('owner confirmation', () => {
  it('confirms selected pending rows and reports the publisher count', async () => {
    const changed = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ league: 'NFL', requested: 1, confirmed: 1,
        published: 1, already_confirmed: 0, already_published: 0,
        audit_logged: true, errors: [] }),
    }))
    render(<SlatePanel slate={slate} isOwner onChanged={changed} />)
    fireEvent.click(screen.getByLabelText('Select Christian McCaffrey'))
    fireEvent.click(screen.getByRole('button', { name: /CONFIRM \+ PUBLISH \(1\)/ }))
    await waitFor(() => expect(screen.getByRole('status').textContent)
      .toContain('1 confirmed \u00b7 1 published'))
    expect(fetch).toHaveBeenCalledWith('/api/operator/staged-slate/confirm',
      expect.objectContaining({ method: 'POST' }))
    expect(changed).toHaveBeenCalledOnce()
  })

  it('does not expose an actionable confirmation to a non-owner', () => {
    render(<SlatePanel slate={slate} isOwner={false} />)
    expect(screen.queryByRole('button', { name: /CONFIRM \+ PUBLISH/ }))
      .toBeNull()
    expect(screen.queryByLabelText('Select Christian McCaffrey')).toBeNull()
    expect(screen.getByText('Owner confirmation required.')).toBeTruthy()
  })
})

describe('line-rank paste validation', () => {
  const teams = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET',
    'GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ',
    'PHI','PIT','SEA','SF','TB','TEN','WAS']

  it('accepts exactly 32 distinct teams and the rank permutation 1 through 32', () => {
    const parsed = parseTeamRanks(teams.map((team, i) => `${team} ${i + 1}`).join('\n'))
    expect(parsed).toHaveLength(32)
    expect(new Set(parsed.map(row => row.rank)).size).toBe(32)
  })

  it('rejects a duplicate team or duplicate rank', () => {
    const invalid = teams.map((team, i) => `${i === 31 ? 'TEN' : team} ${i === 31 ? 31 : i + 1}`).join('\n')
    expect(() => parseTeamRanks(invalid)).toThrow(/exactly 32 distinct teams/)
  })

  it('is an operator-only panel whose week comes from schedule context', () => {
    const schedule = { season: 2026, week: 1 } as NflScheduleContext
    render(<LineRanksPanel schedule={schedule} onChanged={() => undefined} />)
    expect(screen.getByText('NFL 2026 \u00b7 Week 1')).toBeTruthy()
  })
})

describe('projection integrity guard', () => {
  it('labels a guarded projection and withholds the engine number', () => {
    const row: ProjRow = {
      id: 'proj-1', player_name: 'Tyler Higbee', team: 'LAR', position: 'TE',
      is_starter: true, game_date: '2026-09-13', confidence_band: 'medium',
      proj_rec_yds: 147.4, _edgePct: 147.4, _headlineStat: 'rec_yds',
      _excludedByGuard: true,
    }
    render(<ProjectionsPanel rows={[row]} sport="NFL"
      cols={[{ key: 'proj_rec_yds', label: 'REC YDS', digits: 1 }]} />)
    expect(screen.getByText('EXCLUDED BY GUARD')).toBeTruthy()
    expect(screen.queryByText('147.4')).toBeNull()
    expect((screen.getByRole('button', { name: '+ ADD' }) as HTMLButtonElement)
      .disabled).toBe(true)
  })
})
