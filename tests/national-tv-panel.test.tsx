import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NationalTvPanel, { NationalTvBadge } from '@/app/command/NationalTvPanel'
import { SlatePanel } from '@/app/command/panels'
import type { NationalTvContext, StagedSlateResponse } from '@/lib/operator/client'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

const greater: NationalTvContext = {
  status: 'ready', level: 'greater_caution', color: 'red', icon: '!',
  label: 'SMALL NATIONAL-TV SLATE — GREATER CAUTION',
  reasons: ['National broadcast on Fixture Network.', 'The full NBA day has 4 games, each with a distinct scheduled start.'],
  national: true, networks: ['Fixture Network'], game_id: 'game-1',
  game_date: '2026-11-01', tip_time: '2026-11-01T19:00:00Z',
  slate_game_count: 4, distinct_start_windows: 4,
  source: { label: 'Licensed synthetic schedule', url: 'https://example.test/schedule',
    provider_terms_url: 'https://example.test/terms', rights_reference: 'Synthetic rights reference',
    observed_at: '2026-11-01T16:00:00Z', retrieved_at: '2026-11-01T16:02:00Z', max_age_hours: 24 },
  snapshot_id: 'immutable-audit-1', snapshot_sha256: 'a'.repeat(64),
  computed_at: '2026-11-01T16:05:00Z', formula_version: 'nba-national-tv-caution-v1',
  preview_only: true, projection_mutated: false, selection_mutated: false,
  ranking_mutated: false, advisory_only: true,
}

describe('national-TV staged-row evidence', () => {
  it('shows both caution levels, accessible text reasons and source/audit provenance', () => {
    render(<NationalTvBadge value={greater} playerName="Fixture Player" />)
    const summary = screen.getByLabelText('SMALL NATIONAL-TV SLATE — GREATER CAUTION for Fixture Player')
    expect(summary.tagName).toBe('SUMMARY')
    fireEvent.click(summary)
    expect(screen.getByText('NATIONAL TV — CAUTION')).toBeTruthy()
    expect(screen.getByText(/full NBA day has 4 games/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Licensed synthetic schedule' }).getAttribute('href'))
      .toBe('https://example.test/schedule')
    expect(screen.getByText(/immutable-audit-1/)).toBeTruthy()
    expect(screen.getByText(/maximum age 24 hours/)).toBeTruthy()
  })

  it('does not infer a clear or caution status when context is missing', () => {
    render(<NationalTvBadge playerName="Fixture Player" />)
    expect(screen.getByLabelText('NATIONAL TV — UNKNOWN for Fixture Player')).toBeTruthy()
    expect(screen.getByText('No verified broadcast context is available.')).toBeTruthy()
    expect(screen.queryByText('NATIONAL TV — CAUTION')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('places server-supplied caution on the player/prop while keeping projection and selection controls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rows: [] }) }))
    const slate: StagedSlateResponse = {
      league: 'NBA', limit: 50, offset: 0, total: 1, pending: 1, counts: { pending: 1 },
      window: { start: '2026-11-01', end: '2026-11-01', source: 'eastern_today', week: null },
      selections: [{ id: 'selection-1', game_id: 'game-1', player_name: 'Fixture Player',
        team: 'BOS', stat_type: 'points', line: 18.5, our_projection: 21,
        direction: 'over', edge_pct: 13.5, confidence: 'high', tier_required: 'gold',
        status: 'pending', game_date: '2026-11-01', platform: null, line_pulled: false,
        national_tv_context: greater,
        provenance: { config_id: null, config_name: null, agent_run_id: null,
          agent_run_short: null, snapshot_hash_short: null } }],
    }
    render(<SlatePanel slate={slate} isOwner />)
    const playerRow = screen.getByRole('checkbox', { name: 'Select Fixture Player' }).closest('tr')!
    expect(within(playerRow).getByLabelText(/SMALL NATIONAL-TV SLATE/)).toBeTruthy()
    expect(within(playerRow).getByText('21')).toBeTruthy()
    expect(within(playerRow).getByText('18.5')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Select Fixture Player' }).hasAttribute('disabled')).toBe(false)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})

describe('operator broadcast snapshot import', () => {
  it('audits permitted input through the same-origin operator proxy and refreshes only after save', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      audit_saved: true, snapshot_id: 'immutable-audit-1', snapshot_sha256: 'a'.repeat(64),
      result: { slate_date: '2026-11-01', status: 'ready', reasons: [], games: [greater] },
    }) })
    vi.stubGlobal('fetch', fetchMock)
    const onChanged = vi.fn()
    render(<NationalTvPanel onChanged={onChanged} />)
    const snapshot = { slate_date: '2026-11-01', source_label: 'Synthetic fixture', games: [] }
    fireEvent.change(screen.getByLabelText('Full NBA day broadcast snapshot JSON'),
      { target: { value: JSON.stringify(snapshot) } })
    fireEvent.change(screen.getByLabelText('Audit reason'), { target: { value: ' Reviewed fixture ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save broadcast snapshot' }))
    expect(await screen.findByRole('status')).toHaveProperty('textContent',
      'Immutable broadcast audit saved · 2026-11-01 · verified context')
    expect(fetchMock).toHaveBeenCalledWith('/api/operator/nba-national-tv/snapshots', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot, reason: 'Reviewed fixture' }),
    })
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('keeps audit failure explicit and does not refresh the slate or claim success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503,
      json: async () => ({ detail: 'Broadcast audit could not be saved.' }) }))
    const onChanged = vi.fn()
    render(<NationalTvPanel onChanged={onChanged} />)
    fireEvent.change(screen.getByLabelText('Full NBA day broadcast snapshot JSON'), { target: { value: '{}' } })
    fireEvent.change(screen.getByLabelText('Audit reason'), { target: { value: 'Fixture review' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save broadcast snapshot' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Broadcast audit could not be saved.')
    expect(onChanged).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('rejects malformed JSON without any request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<NationalTvPanel onChanged={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Full NBA day broadcast snapshot JSON'), { target: { value: '[]' } })
    fireEvent.change(screen.getByLabelText('Audit reason'), { target: { value: 'Fixture review' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save broadcast snapshot' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
