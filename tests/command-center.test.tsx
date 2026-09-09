import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type {
  CompareResponse, Indicator, IndicatorConfig, IndicatorsResponse, OperatorMe,
} from '@/lib/operator/client'
import {
  ComparePanel, IndicatorsPanel, Panel, PromotePanel, RunHealthPanel,
  SlatePanel, VerdictChip,
  contradictsVerdict, slateEmptyMessage,
} from '@/app/command/panels'
import type {
  NflScheduleContext, StagedSelection, StagedSlateResponse,
} from '@/lib/operator/client'

/**
 * Part B tests. The route guard is exercised through its own unit rather than a
 * rendered page: it redirects and calls notFound(), both of which are Next
 * control-flow throws, and asserting on the throw is the honest assertion.
 */

const ME_OWNER: OperatorMe = {
  clerk_user_id: 'user_1', email: 'a@b.c', display_name: 'King OG',
  role: 'owner', is_owner: true, can_promote: true,
}
const ME_OPERATOR: OperatorMe = {
  clerk_user_id: 'user_2', email: 'e@b.c', display_name: 'Eli',
  role: 'operator', is_owner: false, can_promote: false,
}

const CONFIG: IndicatorConfig = {
  id: 'cfg-1', name: 'no funnel', league: 'NFL', status: 'preview',
  created_by: 'Eli', created_at: '2026-09-08T21:00:00Z',
  promoted_at: null, promoted_by: null, parent_config_id: null, note: null,
}

function indicator(over: Partial<Indicator> = {}): Indicator {
  return {
    key: 'game_script_pass_rate_enabled',
    display_name: 'Game-script pass-rate shift',
    description: 'Use the pregame margin to shift the pass/run mix.',
    category: 'projection_factor', league: 'NFL', value_type: 'boolean',
    value: false, default_value: false,
    min_value: null, max_value: null, bounds_source: null,
    toggleable: true, engine_param: 'game_script_pass_rate_enabled',
    backtest_verdict: 'PASSED on rushing yards — -0.0710 MAE',
    backtest_effect: { rush_yds: { mae_delta: -0.071, ci: [-0.1271, -0.015] } },
    backtest_report_path: 'GAME_SCRIPT_REPORT.md',
    source_file: 'agents/nfl_projector.py',
    ...over,
  }
}

function response(indicators: Indicator[]): IndicatorsResponse {
  return {
    league: 'NFL', config_id: 'cfg-live', config_source: 'database',
    total: indicators.length, limit: 200, offset: 0, indicators,
    constraints: [],
  }
}

beforeEach(() => { vi.restoreAllMocks() })

describe('verdict chip', () => {
  it('renders the effect and CI from backtest_effect', () => {
    render(<VerdictChip i={indicator()} />)
    expect(screen.getByText(/PASSED on rushing yards/)).toBeTruthy()
    expect(screen.getByText(/rush_yds -0\.071 \[-0\.1271, -0\.015\]/)).toBeTruthy()
    expect(screen.getByText('GAME_SCRIPT_REPORT.md')).toBeTruthy()
  })

  it('renders nothing when there is no verdict', () => {
    const { container } = render(
      <VerdictChip i={indicator({ backtest_verdict: null })} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('contradiction marker', () => {
  it('flags a factor that is ON with a FAILED verdict', () => {
    expect(contradictsVerdict(indicator({
      value: true, backtest_verdict: 'FAILED — receptions +0.0045 MAE',
    }))).toBe(true)
  })

  it('does not flag the same failed factor when it is OFF', () => {
    // Off with a failing verdict is the system agreeing with its own
    // measurement. Marking it would cry wolf on every correctly-disabled gate.
    expect(contradictsVerdict(indicator({
      value: false, backtest_verdict: 'FAILED — receptions +0.0045 MAE',
    }))).toBe(false)
  })

  it('flags an unsupported premise that is on', () => {
    expect(contradictsVerdict(indicator({
      value: true, backtest_verdict: 'PREMISE UNSUPPORTED — no stat shows…',
    }))).toBe(true)
  })

  it('does not flag a passing verdict', () => {
    expect(contradictsVerdict(indicator({ value: true }))).toBe(false)
  })

  it('shows the marker in the rendered row', () => {
    render(<IndicatorsPanel
      data={response([indicator({ value: true,
                                  backtest_verdict: 'FAILED — worse' })])}
      editing={null} onChanged={() => {}} />)
    expect(screen.getByText('CONTRADICTS MEASUREMENT')).toBeTruthy()
  })
})

describe('guards and fixed numerics', () => {
  it('renders a guard as locked with the reason', () => {
    render(<IndicatorsPanel
      data={response([indicator({ key: 'implausible_edge_pct',
                                  display_name: 'Implausible edge guard',
                                  category: 'guard', toggleable: false,
                                  value_type: 'numeric', value: 40,
                                  min_value: 0, max_value: 1000,
                                  bounds_source: 'physical',
                                  backtest_verdict: null,
                                  backtest_effect: null })])}
      editing={null} onChanged={() => {}} />)
    expect(screen.getByText('correctness — not switchable')).toBeTruthy()
  })

  it('renders a numeric whose bounds collapse as fixed', () => {
    render(<IndicatorsPanel
      data={response([indicator({ key: 'DOME_WEATHER_MULT',
                                  display_name: 'Dome weather multiplier',
                                  value_type: 'numeric', value: 1,
                                  min_value: 1, max_value: 1,
                                  bounds_source: 'physical',
                                  backtest_verdict: null,
                                  backtest_effect: null })])}
      editing={null} onChanged={() => {}} />)
    expect(screen.getByText('fixed at 1')).toBeTruthy()
  })
})

describe('PATCH rejection', () => {
  it('surfaces the backend message verbatim', async () => {
    const message = 'Minimum edge must stay below the implausible-edge guard.'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ detail: { error: message,
                                 rule: 'min_edge_below_implausible' } }),
      { status: 422 })))

    const { container } = render(<IndicatorsPanel
      data={response([indicator({ value: false })])}
      editing={CONFIG} onChanged={() => {}} />)

    fireEvent.click(container.querySelector('button[aria-pressed]')!)
    // The message is the backend's, not a reworded one: a rejection reworded
    // on the way through is a rejection the operator cannot act on.
    expect(await screen.findByText(message)).toBeTruthy()
  })
})

describe('compare', () => {
  const compare: CompareResponse = {
    league: 'NFL', config_id: 'cfg-1',
    window: { start: '2026-09-13', end: '2026-09-13' },
    requested_window: { start: '2026-09-13', end: '2026-09-13' },
    dates_previewed: ['2026-09-13'],
    covers_requested_window: true,
    rows: [{
      player_name: 'Big Move', team: 'BUF', game_date: '2026-09-13',
      stat: 'rec_yds', live_projection: 60, preview_projection: 90, delta: 30,
      line: 65.5, live_edge_pct: -8.4, preview_edge_pct: 37.4,
      staged_selection_changes: true,
    }],
    summary: {
      rows_compared: 1, rows_changed: 1,
      mean_abs_delta_per_stat: { rec_yds: 30 },
      would_stage: { live: 9, preview: 14 }, would_stage_delta: 5,
      staged_selections_affected: 1,
    },
    staged_selection_changes: [{
      player_name: 'Big Move', stat: 'rec_yds', game_date: '2026-09-13',
      status: 'pending', staged_edge_pct: -8.4, preview_edge_pct: 37.4,
      direction_change: { from: 'under', to: 'over' },
    }],
  }

  it('renders the 409 message rather than an empty table', () => {
    render(<ComparePanel league="NFL" config={CONFIG} compare={null}
      error="no preview projections for config cfg-1 — Run a preview first."
      onCompare={() => {}} onError={() => {}} />)
    expect(screen.getByRole('alert').textContent)
      .toContain('Run a preview first')
    expect(screen.queryByText('Δ')).toBeNull()
  })

  it('shows would_stage for both configs and the difference', () => {
    render(<ComparePanel league="NFL" config={CONFIG} compare={compare}
      error={null} onCompare={() => {}} onError={() => {}} />)
    expect(screen.getByText('WOULD STAGE (LIVE)')).toBeTruthy()
    expect(screen.getByText('WOULD STAGE (PREVIEW)')).toBeTruthy()
    expect(screen.getByText('+5')).toBeTruthy()
  })

  it('lists staged selections whose direction would flip', () => {
    render(<ComparePanel league="NFL" config={CONFIG} compare={compare}
      error={null} onCompare={() => {}} onError={() => {}} />)
    expect(screen.getByText(/under → over/)).toBeTruthy()
  })

  it('asks for a preview selection before offering to run', () => {
    render(<ComparePanel league="NFL" config={null} compare={null} error={null}
      onCompare={() => {}} onError={() => {}} />)
    expect(screen.getByText(/Select a preview configuration/)).toBeTruthy()
  })
})

describe('promote control', () => {
  it('is enabled for an owner', () => {
    render(<PromotePanel me={ME_OWNER} config={CONFIG} indicators={null}
      compare={null} onPromoted={() => {}} />)
    const b = screen.getByText(/PROMOTE NO FUNNEL/) as HTMLButtonElement
    expect(b.disabled).toBe(false)
  })

  it('is disabled for an operator, with the reason', () => {
    render(<PromotePanel me={ME_OPERATOR} config={CONFIG} indicators={null}
      compare={null} onPromoted={() => {}} />)
    const b = screen.getByText(/PROMOTE NO FUNNEL/) as HTMLButtonElement
    expect(b.disabled).toBe(true)
    expect(screen.getByText(/requires the owner role/)).toBeTruthy()
    expect(screen.getByText(/create previews, edit values/)).toBeTruthy()
  })

  it('the confirmation states that promote does not trigger a run', async () => {
    render(<PromotePanel me={ME_OWNER} config={CONFIG}
      indicators={response([indicator({ value: true, default_value: false })])}
      compare={null} onPromoted={() => {}} />)
    // fireEvent, not node.click(): the raw DOM call is not wrapped in act, so
    // the modal's state update has not flushed when the assertion runs.
    fireEvent.click(screen.getByText(/PROMOTE NO FUNNEL/))
    expect(await screen.findByText(/does not re-project anything/)).toBeTruthy()
    expect(screen.getByText(/next scheduled live run/)).toBeTruthy()
  })

  it('the confirmation diff lists only keys that differ', async () => {
    render(<PromotePanel me={ME_OWNER} config={CONFIG}
      indicators={response([
        indicator({ key: 'changed', display_name: 'Changed one',
                    value: true, default_value: false }),
        indicator({ key: 'same', display_name: 'Unchanged one',
                    value: false, default_value: false }),
      ])}
      compare={null} onPromoted={() => {}} />)
    fireEvent.click(screen.getByText(/PROMOTE NO FUNNEL/))
    expect(await screen.findByText('Changed one')).toBeTruthy()
    expect(screen.queryByText('Unchanged one')).toBeNull()
  })
})

describe('panels render their own errors', () => {
  it('shows the error instead of a blank panel', () => {
    render(<Panel title="Indicators" error="Backend unreachable" />)
    expect(screen.getByRole('alert').textContent).toBe('Backend unreachable')
  })

  it('does not claim to be loading when it failed', () => {
    render(<Panel title="Indicators" error="Backend unreachable" />)
    expect(screen.queryByText('Loading…')).toBeNull()
  })
})

describe('run health panel reads the real report shape', () => {
  /**
   * Fixture copied from a live agents/agent_health.run() response, not from
   * the panel that renders it. The first version of this panel read
   * last_run / status / triggered_by / error_summary; the report actually
   * returns last_attempt_at / last_attempt_status / last_attempt_triggered_by
   * / last_error. Against live data three of four columns rendered "—" and the
   * panel looked like it worked.
   */
  const REAL_SHAPE = {
    status: 'attention',
    checked_at: '2026-09-09T19:01:43.243649+00:00',
    agents_checked: 21,
    agents_needing_attention: 1,
    agents: [
      {
        agent_name: 'picks-selector', league: 'NBA', expected_now: true,
        stale: true, latest_failed: false, needs_attention: true,
        last_attempt_at: '2026-09-09T18:30:00+00:00',
        last_attempt_status: 'skipped',
        last_attempt_triggered_by: 'pipeline',
        last_successful_at: null, healthy_age_hours: null,
        last_error: 'no slate for today',
      },
      {
        agent_name: 'picks-publisher', league: 'NBA', expected_now: true,
        stale: false, latest_failed: false, needs_attention: false,
        last_attempt_at: '2026-09-09T17:59:00+00:00',
        last_attempt_status: 'success',
        last_attempt_triggered_by: 'route',
        last_successful_at: '2026-09-09T17:59:00+00:00',
        healthy_age_hours: 1.0, last_error: null,
      },
    ],
  }

  it('renders the timestamp, trigger and status from the real field names', () => {
    render(<RunHealthPanel data={REAL_SHAPE} />)
    expect(screen.getByText('2026-09-09 18:30')).toBeTruthy()
    expect(screen.getByText('pipeline')).toBeTruthy()
    expect(screen.getByText('route')).toBeTruthy()
    expect(screen.getByText('SUCCESS')).toBeTruthy()
  })

  it('surfaces stale ahead of the raw status', () => {
    render(<RunHealthPanel data={REAL_SHAPE} />)
    expect(screen.getByText('STALE')).toBeTruthy()
  })

  it('expands the error rather than hiding it behind a click', () => {
    render(<RunHealthPanel data={REAL_SHAPE} />)
    expect(screen.getByText('no slate for today')).toBeTruthy()
  })

  it('uses the report\'s own needs_attention verdict', () => {
    render(<RunHealthPanel data={REAL_SHAPE} />)
    expect(screen.getByText('1 of 2 need attention')).toBeTruthy()
  })

  it('never renders a dash where the report supplied a value', () => {
    const { container } = render(<RunHealthPanel data={REAL_SHAPE} />)
    const cells = [...container.querySelectorAll('td')].map((c) => c.textContent)
    // Two fully-populated rows: nothing should be missing.
    expect(cells.filter((c) => c === '—')).toHaveLength(0)
  })

  it('says so honestly when the report has no agents', () => {
    render(<RunHealthPanel data={{ agents: [] }} />)
    expect(screen.getByText('No runs recorded.')).toBeTruthy()
  })
})

// ── Finding 2: a preview must cover the window it claims ────────────────────

const SCHEDULE: NflScheduleContext = {
  season: 2026, week: 1, reference_game_date: '2026-09-13',
  target_date: '2026-09-09', source: 'nflverse schedules/games.csv',
  game_type: 'REG',
}

const PREVIEW_CONFIG: IndicatorConfig = {
  id: 'cfg-1', name: 'experiment', league: 'NFL', status: 'preview',
  created_by: 'King OG', created_at: '2026-09-09T00:00:00', promoted_at: null,
  promoted_by: null, parent_config_id: null, note: null,
}

const COMPARE: CompareResponse = {
  league: 'NFL', config_id: 'cfg-1',
  window: { start: '2026-09-09', end: '2026-09-14' },
  requested_window: { start: '2026-09-09', end: '2026-09-14' },
  dates_previewed: ['2026-09-09', '2026-09-14'],
  covers_requested_window: true,
  rows: [],
  summary: {
    rows_compared: 0, rows_changed: 0, mean_abs_delta_per_stat: {},
    would_stage: { live: 0, preview: 0 }, would_stage_delta: 0,
    staged_selections_affected: 0,
  },
  staged_selection_changes: [],
}

describe('preview window', () => {
  const noop = () => {}

  it('offers NFL a week, because the projector selects games by week', () => {
    render(<ComparePanel league="NFL" config={PREVIEW_CONFIG} compare={null}
      error={null} schedule={SCHEDULE} onCompare={noop} onError={noop} />)
    expect((screen.getByLabelText('NFL week') as HTMLInputElement).value)
      .toBe('1')
    expect((screen.getByLabelText('NFL season') as HTMLInputElement).value)
      .toBe('2026')
  })

  it('offers a date range for date-shaped leagues', () => {
    render(<ComparePanel league="NBA" config={{ ...PREVIEW_CONFIG, league: 'NBA' }}
      compare={null} error={null} schedule={null}
      onCompare={noop} onError={noop} />)
    expect(screen.queryByLabelText('NFL week')).toBeNull()
    expect(screen.getByText(/FROM/)).toBeTruthy()
  })

  it('sends the week, not the first day of a range, for NFL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ status: 'success', dates_previewed: ['2026-09-13'],
                           window: { start: '2026-09-13', end: '2026-09-14' } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<ComparePanel league="NFL" config={PREVIEW_CONFIG} compare={null}
      error={null} schedule={SCHEDULE} onCompare={noop} onError={noop} />)
    fireEvent.click(screen.getByText('RUN PREVIEW'))
    // Wait on the rendered result, not just the call: that lets the state
    // update settle inside act() instead of after the test ends.
    await screen.findByText(/PREVIEWED 2026-09-13/)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.week).toBe(1)
    expect(body.season).toBe('2026')
  })

  it('warns when the preview covered less than was requested', () => {
    /* The defect this whole change exists for: a one-day preview under a
       six-day heading read as a week's verdict. */
    const partial: CompareResponse = {
      ...COMPARE,
      window: { start: '2026-09-09', end: '2026-09-09' },
      requested_window: { start: '2026-09-09', end: '2026-09-14' },
      dates_previewed: ['2026-09-09'],
      covers_requested_window: false,
    }
    render(<ComparePanel league="NFL" config={PREVIEW_CONFIG} compare={partial}
      error={null} schedule={SCHEDULE} onCompare={noop} onError={noop} />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('2026-09-09')
    expect(alert.textContent).toContain('not the requested')
    expect(alert.textContent).toContain('2026-09-14')
  })

  it('says nothing alarming when the preview covered the whole request', () => {
    render(<ComparePanel league="NFL" config={PREVIEW_CONFIG} compare={COMPARE}
      error={null} schedule={SCHEDULE} onCompare={noop} onError={noop} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

// ── Finding 3: an empty slate explains itself ───────────────────────────────

function sel(name: string, status: string): StagedSelection {
  return {
    id: `id-${name}`, player_name: name, team: 'BUF', stat_type: 'rec_yds',
    line: 65.5, our_projection: 70, direction: 'over', edge_pct: 6.9,
    confidence: 'high', tier_required: 'free', status, game_date: '2026-09-13',
    platform: 'prizepicks', line_pulled: false,
    provenance: { config_id: null, config_name: null, agent_run_id: null,
                  agent_run_short: null, snapshot_hash_short: null },
  }
}

function slate(over: Partial<StagedSlateResponse> = {}): StagedSlateResponse {
  return {
    league: 'NFL', limit: 50, offset: 0,
    window: { start: '2026-09-13', end: '2026-09-14', source: 'upcoming' },
    counts: {}, total: 0, pending: 0, selections: [], ...over,
  }
}

describe('staged slate', () => {
  it('shows every state, not only pending', () => {
    render(<SlatePanel slate={slate({
      selections: [sel('Pends', 'pending'), sel('Pubs', 'published')],
      counts: { pending: 1, published: 1 }, total: 2, pending: 1,
    })} />)
    expect(screen.getByText('PENDING')).toBeTruthy()
    expect(screen.getByText('PUBLISHED')).toBeTruthy()
  })

  it('puts pending first — it is the only actionable state', () => {
    render(<SlatePanel slate={slate({
      selections: [sel('Pends', 'pending'), sel('Pubs', 'published')],
      counts: { pending: 1, published: 1 }, total: 2, pending: 1,
    })} />)
    const states = screen.getAllByText(/^(PENDING|PUBLISHED)$/)
      .map((n) => n.textContent)
    expect(states[0]).toBe('PENDING')
  })

  it('an empty window names what IS there, never a bare blank', () => {
    /* Live NFL when this was written: 23 cancelled, 10 published, 0 pending. */
    const message = slateEmptyMessage(slate({
      counts: { published: 10, cancelled: 23 }, total: 33, pending: 0,
    }))
    expect(message).toContain('Nothing pending')
    expect(message).toContain('10 published')
    expect(message).toContain('23 cancelled')
    expect(message).toContain('2026-09-13')
  })

  it('distinguishes an empty window from a league with no selections at all', () => {
    /* Live NBA when this was written: zero selections, ever. */
    const message = slateEmptyMessage(slate({
      window: { start: null, end: null, source: 'no_selections' },
      league: 'NBA',
    }))
    expect(message).toContain('No NBA selections on record at all')
  })

  it('never renders the bare string the old panel used', () => {
    render(<SlatePanel slate={slate({
      counts: { published: 10 }, total: 10, pending: 0,
    })} />)
    expect(screen.queryByText('Nothing staged.')).toBeNull()
  })
})
