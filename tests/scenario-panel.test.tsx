import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScenarioPanel from '@/app/command/ScenarioPanel'

const fields = [{
  key: 'projected_minutes', label: 'Projected minutes', type: 'number' as const,
  category: 'role', minimum: 0.1, maximum: 48, nullable: false,
}, {
  key: 'is_starter', label: 'Starter', type: 'boolean' as const,
  category: 'role', nullable: false,
}]

const source = {
  source: {
    league: 'NBA' as const, game_id: 'game-1', game_date: '2026-10-14',
    tip_time: '2026-10-15T00:00:00Z', player_name: 'Test Player',
    team: 'BOS', opponent_team: 'NYK', position: 'G',
    inputs: { projected_minutes: 36, is_starter: true },
    source_timestamps: { stats_fetched_at: '2026-10-14T18:00:00Z' },
    indicator_config: { id: 'cfg-live', name: 'live', source: 'database',
                        snapshot_hash: 'abc' },
    official_projection: null,
  },
  original_outputs: { proj_pts: 20, proj_reb: 5, proj_ast: 7 },
  timing: {
    game_start: '2026-10-15T00:00:00+00:00',
    server_time: '2026-10-14T23:40:00+00:00', seconds_to_tip: 1200,
    minutes_to_tip: 20, inside_final_30: true, game_started: false,
    urgency: 'final_30_minutes' as const,
  },
  fields,
  isolation: { official_projection_mutated: false as const,
               published_projection_mutated: false as const },
}

afterEach(() => vi.unstubAllGlobals())

describe('projection scenario sandbox', () => {
  it('uses the protected picker and surfaces final-30 source timing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.includes('/options?')) return Response.json({
        league: 'NBA', game_date: '2026-10-14', games: [{
          id: 'game-1', game_date: '2026-10-14',
          tip_time: '2026-10-15T00:00:00Z', home_team: 'BOS', away_team: 'NYK',
          players: [{ player_name: 'Test Player', team: 'BOS',
            opponent_team: 'NYK', position: 'G', projected_minutes: 36,
            is_starter: true }],
        }],
      })
      if (path.includes('/source?')) return Response.json(source)
      throw new Error(`unexpected request: ${path}`)
    }))

    render(<ScenarioPanel />)
    const game = await screen.findByRole('option', { name: /NYK @ BOS/ })
    fireEvent.change(screen.getByLabelText('Game'), { target: { value: game.getAttribute('value') } })
    fireEvent.change(screen.getByLabelText('Player'), { target: { value: 'Test Player' } })

    expect(await screen.findByText(/FINAL 30 MINUTES/)).toBeTruthy()
    expect(screen.getByDisplayValue('36')).toBeTruthy()
    expect(screen.getByText(/never changes official projections/)).toBeTruthy()
  })

  it('sends only changed fields to the canonical draft endpoint', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.includes('/options?')) return Response.json({
        league: 'NBA', game_date: '2026-10-14', games: [{
          id: 'game-1', game_date: '2026-10-14', tip_time: source.source.tip_time,
          home_team: 'BOS', away_team: 'NYK', players: [{
            player_name: 'Test Player', team: 'BOS', opponent_team: 'NYK',
            position: 'G', projected_minutes: 36, is_starter: true,
          }],
        }],
      })
      if (path.includes('/source?')) return Response.json(source)
      if (path === '/api/operator/projection-scenarios' && init?.method === 'POST') {
        return Response.json({
          id: 'scenario-1', ...source.source, status: 'draft', reason: 'late lineup',
          source_snapshot: source.source, overrides: { projected_minutes: 40 },
          outputs: { proj_pts: 23 }, actor_user_id: 'user-1',
          actor_display_name: 'Owner', timing: source.timing, fields,
        })
      }
      if (path.endsWith('/scenario-1/audit')) return Response.json({ events: [] })
      throw new Error(`unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScenarioPanel />)
    await screen.findByRole('option', { name: /NYK @ BOS/ })
    fireEvent.change(screen.getByLabelText('Game'), { target: { value: 'game-1' } })
    fireEvent.change(screen.getByLabelText('Player'), { target: { value: 'Test Player' } })
    const minutes = await screen.findByLabelText('Projected minutes')
    fireEvent.change(minutes, { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Audit reason'),
                     { target: { value: 'late lineup' } })
    fireEvent.click(screen.getByText('CREATE DRAFT & RECALCULATE'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/operator/projection-scenarios', expect.objectContaining({ method: 'POST' })))
    const call = fetchMock.mock.calls.find(([path, init]) =>
      path === '/api/operator/projection-scenarios' && init?.method === 'POST')!
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      league: 'NBA', game_id: 'game-1', player_name: 'Test Player',
      overrides: { projected_minutes: 40 }, reason: 'late lineup',
    })
    expect(await screen.findByText('23')).toBeTruthy()
  })
})
