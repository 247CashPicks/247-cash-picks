/**
 * The page must fetch indicators FOR THE CONFIG BEING EDITED.
 *
 * The panel tests render CommandCenter with selectedConfigId already supplied,
 * so they cannot see whether the page reads ?config= or puts it on the
 * request. Removing that wiring left all 55 of them green — the same blind
 * spot that let the original defect ship: /operator/indicators had no
 * config_id at all, so the editor always displayed live values while its
 * controls wrote to a preview.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const operatorFetch = vi.fn()
const requireOperatorPage = vi.fn()

vi.mock('@/lib/operator/client', () => ({ operatorFetch }))
vi.mock('@/lib/operator/guard', () => ({ requireOperatorPage }))
vi.mock('@/app/command/CommandCenter', () => ({
  default: () => null,
}))

const CommandPage = (await import('@/app/command/page')).default

const ME = { clerk_user_id: 'u', email: 'e', display_name: 'King OG',
             role: 'owner' as const, is_owner: true, can_promote: true }

beforeEach(() => {
  operatorFetch.mockReset()
  operatorFetch.mockResolvedValue({ ok: true, status: 200, data: null,
                                    error: null, rule: null, indicatorKey: null })
  requireOperatorPage.mockReset()
  requireOperatorPage.mockResolvedValue(ME)
})

function indicatorCall() {
  return operatorFetch.mock.calls
    .map((c) => c[0] as string)
    .find((p) => p.startsWith('/operator/indicators'))
}

describe('the indicators fetch', () => {
  it('carries the selected config, so its values are what render', async () => {
    await CommandPage({ searchParams: Promise.resolve({ league: 'NFL',
                                                        config: 'cfg-test' }) })
    expect(indicatorCall()).toContain('config_id=cfg-test')
  })

  it('omits config_id when nothing is selected, showing live', async () => {
    await CommandPage({ searchParams: Promise.resolve({ league: 'NFL' }) })
    expect(indicatorCall()).not.toContain('config_id')
  })

  it('encodes the id rather than splicing it into the query raw', async () => {
    await CommandPage({ searchParams: Promise.resolve({
      league: 'NFL', config: 'a&b=c' }) })
    expect(indicatorCall()).toContain('config_id=a%26b%3Dc')
  })

  it('still scopes every panel to the league', async () => {
    await CommandPage({ searchParams: Promise.resolve({ league: 'NBA',
                                                        config: 'cfg-x' }) })
    const paths = operatorFetch.mock.calls.map((c) => c[0] as string)
    for (const p of paths.filter((x) => x.includes('league='))) {
      expect(p).toContain('league=NBA')
    }
  })

  it('falls back to NFL for an unknown league rather than passing it through',
    async () => {
      await CommandPage({ searchParams: Promise.resolve({ league: 'MLB' }) })
      expect(indicatorCall()).toContain('league=NFL')
    })
})
