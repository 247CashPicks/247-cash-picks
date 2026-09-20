/**
 * The line entry panel. It has to be usable every week: 40-60 lines in a few
 * minutes, which means no player name is ever typed and a pasted block is
 * checked before it is written.
 *
 * The preview is the safeguard, not a convenience. A misparsed name becomes a
 * line against the wrong player, which is one selector run from a pick against
 * the wrong player.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { LineEntryPanel } from '@/app/command/panels'
import type { LineEntrySlate } from '@/lib/operator/client'

const SLATE: LineEntrySlate = {
  league: 'NFL', from_date: '2026-09-20',
  game_dates: ['2026-09-20', '2026-09-21'],
  stat_types: ['rec_yds', 'receptions', 'pass_yds'],
  unpriceable_stat_types: ['pass_yds'],
  platforms: ['underdog', 'prizepicks'],
  player_count: 2,
  players: [
    { player_name: "Ja'Marr Chase", player_name_key: 'jamarr chase',
      team: 'CIN', game_date: '2026-09-20',
      projections: { rec_yds: 88.4, receptions: 6.1 }, rank_value: 88.4,
      existing_lines: {} },
    { player_name: 'D.J. Moore', player_name_key: 'dj moore', team: 'CHI',
      game_date: '2026-09-20', projections: { rec_yds: 61 }, rank_value: 61,
      existing_lines: { rec_yds: 58.5 } },
  ],
}

function stub(status: number, payload: unknown) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300, status,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

beforeEach(() => vi.unstubAllGlobals())

describe('the pre-filled grid', () => {
  it('lists slate players so no name is typed', () => {
    render(<LineEntryPanel league="NFL" slate={SLATE} error={null}
      onChanged={() => {}} />)
    expect(screen.getByText("Ja'Marr Chase")).toBeTruthy()
    expect(screen.getByText('D.J. Moore')).toBeTruthy()
  })

  it('gives every priceable stat its own box, and omits unpriceable ones', () => {
    render(<LineEntryPanel league="NFL" slate={SLATE} error={null}
      onChanged={() => {}} />)
    expect(screen.getByLabelText("Ja'Marr Chase rec_yds")).toBeTruthy()
    expect(screen.getByLabelText("Ja'Marr Chase receptions")).toBeTruthy()
    // pass_yds can never price, so it is not offered as a grid column.
    expect(screen.queryByLabelText("Ja'Marr Chase pass_yds")).toBeNull()
  })

  it('writes only the boxes that were filled', async () => {
    const mock = stub(200, { written: 1, line_source: 'underdog_manual' })
    render(<LineEntryPanel league="NFL" slate={SLATE} error={null}
      onChanged={() => {}} />)
    fireEvent.change(screen.getByLabelText("Ja'Marr Chase rec_yds"),
                     { target: { value: '74.5' } })
    fireEvent.click(await screen.findByText('WRITE 1 LINE'))
    await vi.waitFor(() => expect(mock).toHaveBeenCalled())
    const body = JSON.parse(mock.mock.calls[0][1].body)
    expect(body.rows).toEqual([
      { player_name: "Ja'Marr Chase", stat_type: 'rec_yds', line: 74.5 }])
    expect(body.platform).toBe('underdog')
  })

  it('shows an existing line so a replacement is visible before it happens', () => {
    render(<LineEntryPanel league="NFL" slate={SLATE} error={null}
      onChanged={() => {}} />)
    expect(screen.getAllByText(/has line/).length).toBeGreaterThan(0)
  })

  it('warns that an unpriceable stat stores but never prices', () => {
    render(<LineEntryPanel league="NFL" slate={SLATE} error={null}
      onChanged={() => {}} />)
    expect(screen.getByText(/never prices/)).toBeTruthy()
  })
})

describe('paste', () => {
  function toPaste() {
    render(<LineEntryPanel league="NFL" slate={SLATE} error={null}
      onChanged={() => {}} />)
    fireEvent.click(screen.getByText('PASTE'))
  }

  it('CHECK parses without writing', async () => {
    const mock = stub(200, { parsed: 1, matched_count: 1, unmatched_count: 0,
                             matched: [], unmatched: [] })
    toPaste()
    fireEvent.change(screen.getByLabelText('Pasted lines'),
                     { target: { value: "Ja'Marr Chase, rec yds, 74.5" } })
    fireEvent.click(screen.getByText('CHECK'))
    await vi.waitFor(() => expect(mock).toHaveBeenCalled())
    expect(mock.mock.calls[0][0]).toBe('/api/operator/line-entry/parse')
  })

  it('shows unmatched rows with their reason BEFORE anything is written', async () => {
    stub(200, {
      parsed: 2, matched_count: 0, unmatched_count: 1, matched: [],
      unmatched: [{ line_number: 2, raw: 'Some Guy, rec yds, 40.5',
                    parsed_name: 'Some Guy', stat_type: 'rec_yds', line: 40.5,
                    problems: ['"Some Guy" is not in the current slate'] }],
    })
    toPaste()
    fireEvent.change(screen.getByLabelText('Pasted lines'),
                     { target: { value: 'x' } })
    fireEvent.click(screen.getByText('CHECK'))
    expect(await screen.findByText('NOT WRITTEN')).toBeTruthy()
    expect(screen.getByText(/is not in the current slate/)).toBeTruthy()
    // Nothing written: no write button when nothing matched.
    expect(screen.queryByText(/WRITE \d+ MATCHED/)).toBeNull()
  })

  it('writes only the matched rows', async () => {
    const mock = stub(200, {
      parsed: 2, matched_count: 1, unmatched_count: 1,
      matched: [{ line_number: 1, raw: 'x', player_name: "Ja'Marr Chase",
                  player_name_key: 'jamarr chase', team: 'CIN',
                  game_date: '2026-09-20', stat_type: 'rec_yds', line: 74.5,
                  our_projection: 88.4, replaces_existing: false,
                  warnings: [] }],
      unmatched: [{ line_number: 2, raw: 'bad', parsed_name: null,
                    stat_type: null, line: null, problems: ['no line value found'] }],
    })
    toPaste()
    fireEvent.change(screen.getByLabelText('Pasted lines'),
                     { target: { value: 'x\nbad' } })
    fireEvent.click(screen.getByText('CHECK'))
    fireEvent.click(await screen.findByText('WRITE 1 MATCHED'))
    await vi.waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
    const body = JSON.parse(mock.mock.calls[1][1].body)
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0].player_name).toBe("Ja'Marr Chase")
  })
})

describe('empty and error states explain themselves', () => {
  it('an empty slate says lines attach to projected players', () => {
    render(<LineEntryPanel league="NFL" error={null} onChanged={() => {}}
      slate={{ ...SLATE, player_count: 0, players: [] }} />)
    expect(screen.getByText(/Run the projector first/)).toBeTruthy()
  })

  it('a failed slate fetch renders the error, not a blank', () => {
    render(<LineEntryPanel league="NFL" slate={null}
      error="Backend unreachable" onChanged={() => {}} />)
    expect(screen.getByRole('alert').textContent).toContain('Backend unreachable')
  })
})
