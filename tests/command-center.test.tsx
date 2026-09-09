import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type {
  CompareResponse, Indicator, IndicatorConfig, IndicatorsResponse, OperatorMe,
} from '@/lib/operator/client'
import {
  ComparePanel, IndicatorsPanel, Panel, PromotePanel, VerdictChip,
  contradictsVerdict,
} from '@/app/command/panels'

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
