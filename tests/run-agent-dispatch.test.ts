/**
 * The dashboard must send a request the backend can accept.
 *
 * It posted Content-Type: application/json with NO body. The four backend
 * routes that declare a Pydantic body answered 422 "body: Field required" —
 * rejected at validation, before any agent run row existed to explain it — and
 * this route reported every non-2xx as 502, which read as a Railway timeout on
 * the heavy agents. It was neither heavy nor a timeout.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// The route reads BACKEND_URL at module scope, so it must exist before import.
process.env.BACKEND_URL = 'http://backend.test'
process.env.CRON_SECRET = 'test-cron-secret'

const auth = vi.fn()
const getWalletForUser = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({ auth }))
vi.mock('@/lib/auth/session', () => ({ getWalletForUser }))

const { POST } = await import('@/app/api/operator/run-agent/route')

function request(body: unknown) {
  return new Request('http://x/api/operator/run-agent', {
    method: 'POST', body: JSON.stringify(body),
  }) as never
}

beforeEach(() => {
  auth.mockResolvedValue({ userId: 'user_1' })
  getWalletForUser.mockResolvedValue({ tier_slug: 'nexus' })
  vi.unstubAllGlobals()
})

function stubBackend(status: number, payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('agent dispatch', () => {
  it('sends a JSON body, not just a Content-Type claiming one', async () => {
    const fetchMock = stubBackend(200, { status: 'success' })
    await POST(request({ agent: 'nfl-scout', sport: 'NFL' }))
    const init = fetchMock.mock.calls[0][1]
    expect(init.body).toBeDefined()
    expect(() => JSON.parse(init.body)).not.toThrow()
  })

  it('puts the required fields in the body for briefing-writer', async () => {
    // Its model requires league and edition_type. They were only ever sent as
    // query parameters, to a route that reads them from the body.
    const fetchMock = stubBackend(200, { status: 'success' })
    await POST(request({ agent: 'briefing-writer', sport: 'NFL' }))
    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.league).toBe('NFL')
    expect(body.edition_type).toBe('weekly')
    expect(url).toContain('league=NFL')   // query kept for query-only routes
  })

  it('reports a backend 422 as 422, not as a gateway failure', async () => {
    const detail = [{ type: 'missing', loc: ['body'], msg: 'Field required' }]
    stubBackend(422, { detail })
    const res = await POST(request({ agent: 'nfl-projector', sport: 'NFL' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.detail).toEqual({ detail })
  })

  it('still reports a genuine upstream 5xx as 502', async () => {
    stubBackend(500, { detail: 'boom' })
    const res = await POST(request({ agent: 'nfl-scout', sport: 'NFL' }))
    expect(res.status).toBe(502)
  })

  it('still reports a real timeout as dispatched, not as an error', async () => {
    // Railway keeps running; the proxy just stopped waiting. This is the case
    // the 502 was mistaken for.
    const err = new Error('timeout'); err.name = 'TimeoutError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err))
    const res = await POST(request({ agent: 'nfl-projector', sport: 'NFL' }))
    expect(res.status).toBe(200)
    expect((await res.json()).still_running).toBe(true)
  })
})
