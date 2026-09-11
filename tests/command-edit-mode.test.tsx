/**
 * Selecting a preview must put the Indicators panel into edit mode AGAINST
 * THAT CONFIG — controls and values both.
 *
 * On 2026-09-09 the controls bound correctly and the values did not.
 * /operator/indicators had no config_id parameter, so it always answered with
 * the live configuration. Selecting the preview "test" enabled the toggles,
 * each PATCH wrote to the preview and returned 200, and then router.refresh()
 * re-read live values so the row re-rendered identical. Eight edits landed in
 * the database while the screen insisted nothing had happened.
 *
 * The selection therefore lives in the URL: the values are fetched server-side
 * for that config, so client-only selection could not help but drift from them.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const refresh = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }))

const CommandCenter = (await import('@/app/command/CommandCenter')).default
import { IndicatorsPanel } from '@/app/command/panels'
import type {
  IndicatorConfig, IndicatorsResponse, OperatorMe,
} from '@/lib/operator/client'

const ME: OperatorMe = {
  clerk_user_id: 'user_1', email: 'og305218@gmail.com', display_name: 'King OG',
  role: 'owner', is_owner: true, can_promote: true,
}
const LIVE_CFG: IndicatorConfig = {
  id: 'cfg-live', name: 'cutover baseline', league: 'NFL', status: 'live',
  created_by: 'kingog', created_at: '2026-09-09T02:33:36', promoted_at: null,
  promoted_by: null, parent_config_id: null, note: null,
}
const TEST_CFG: IndicatorConfig = {
  id: 'cfg-test', name: 'test', league: 'NFL', status: 'preview',
  created_by: 'King OG', created_at: '2026-09-09T17:29:36', promoted_at: null,
  promoted_by: null, parent_config_id: 'cfg-live', note: null,
}

function indicators(over: Partial<IndicatorsResponse> = {}): IndicatorsResponse {
  return {
    league: 'NFL', config_id: 'cfg-live', config_source: 'database',
    config_name: 'cutover baseline', config_status: 'live',
    total: 1, limit: 200, offset: 0, constraints: [],
    indicators: [{
      key: 'funnel_multiplier_enabled', display_name: 'Funnel multiplier',
      description: 'x', category: 'projection_factor', league: 'NFL',
      value_type: 'boolean', value: false, default_value: false,
      min_value: null, max_value: null, bounds_source: null, toggleable: true,
      engine_param: 'funnel', backtest_verdict: null, backtest_effect: null,
      backtest_report_path: null, source_file: 'x.py',
    }],
    ...over,
  }
}

const ok = <T,>(data: T) => ({ ok: true, status: 200, data, error: null,
                               rule: null, indicatorKey: null })

function renderPage(selectedConfigId: string | null,
                    ind: IndicatorsResponse = indicators()) {
  return render(
    <CommandCenter
      me={ME} league="NFL" leagues={['NFL', 'NBA']}
      selectedConfigId={selectedConfigId}
      indicators={ok(ind)}
      configs={ok({ configs: [LIVE_CFG, TEST_CFG] })}
      audit={ok({ entries: [] })}
      slate={ok({ league: 'NFL', limit: 50, offset: 0,
                  window: { start: null, end: null, source: 'no_schedule' as const,
                            week: null },
                  counts: {}, total: 0, pending: 0, selections: [] })}
      health={ok({ agents: [] } as Record<string, unknown>)}
    />,
  )
}

beforeEach(() => { refresh.mockClear(); push.mockClear() })

describe('selecting a preview', () => {
  it('puts the config in the URL, so the server fetches ITS values', () => {
    renderPage(null)
    fireEvent.click(screen.getByText('EDIT'))
    expect(push).toHaveBeenCalledWith('/command?league=NFL&config=cfg-test')
  })

  it('deselecting drops the config from the URL', () => {
    renderPage('cfg-test')
    fireEvent.click(screen.getByText('EDITING'))
    expect(push).toHaveBeenCalledWith('/command?league=NFL')
  })

  it('switching league drops a config belonging to the other one', () => {
    // Carrying it across 404s the indicators fetch and blanks the panel.
    renderPage('cfg-test')
    fireEvent.click(screen.getByText('NBA'))
    expect(push).toHaveBeenCalledWith('/command?league=NBA')
  })

  it('with the config selected, Indicators is in edit mode', () => {
    renderPage('cfg-test', indicators({
      config_id: 'cfg-test', config_name: 'test', config_status: 'preview',
    }))
    expect(screen.getByText(/Editing/)).toBeTruthy()
    expect(screen.queryByText(/Showing the live configuration/)).toBeNull()
  })

  it('shows THAT config\'s value, not the live one', () => {
    // The defect: live had it OFF, the preview had it ON, and the panel
    // rendered OFF while the controls edited the preview.
    renderPage('cfg-test', indicators({
      config_id: 'cfg-test', config_name: 'test', config_status: 'preview',
      indicators: [{ ...indicators().indicators[0], value: true }],
    }))
    // The value CELL (a span), not the toggle button — both read "ON".
    const valueCells = screen.getAllByText('ON')
      .filter((n) => n.tagName.toLowerCase() === 'span')
    expect(valueCells).toHaveLength(1)
    // And the control reflects it.
    expect(screen.getByRole('button', { name: 'ON' })
      .getAttribute('aria-pressed')).toBe('true')
  })

  it('enables the controls', () => {
    renderPage('cfg-test', indicators({
      config_id: 'cfg-test', config_name: 'test', config_status: 'preview',
    }))
    const controls = screen.getAllByRole('button')
      .filter((b) => /^(ON|OFF|SET)$/.test(b.textContent ?? ''))
    expect(controls.length).toBeGreaterThan(0)
    expect(controls.every((c) => !(c as HTMLButtonElement).disabled)).toBe(true)
  })
})

describe('the values/controls mismatch guard', () => {
  it('warns when the values came from a different config than it edits', () => {
    /* Exactly the 2026-09-09 state: controls bound to the preview, values
       from live. It rendered no warning at all. */
    render(<IndicatorsPanel
      data={indicators({ config_id: 'cfg-live', config_name: 'cutover baseline',
                         config_status: 'live' })}
      editing={TEST_CFG} onChanged={() => {}} />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('cutover baseline')
    expect(alert.textContent).toContain('test')
    expect(alert.textContent).toContain('would not be visible')
  })

  it('is silent when they agree', () => {
    render(<IndicatorsPanel
      data={indicators({ config_id: 'cfg-test', config_name: 'test',
                         config_status: 'preview' })}
      editing={TEST_CFG} onChanged={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('is silent when nothing is being edited', () => {
    render(<IndicatorsPanel data={indicators()} editing={null}
      onChanged={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
