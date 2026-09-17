import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import type { TierSlug } from '@/lib/picks/types'
import { parseSport } from '@/lib/sport'
import { agentFor } from '@/lib/picks/agents'

const BACKEND_URL = process.env.BACKEND_URL || ''
const CRON_SECRET = process.env.CRON_SECRET || 'cashpicks-cron-2026'

// Vercel's proxy caps around 55s; stop waiting before that and report honestly.
const DISPATCH_TIMEOUT_MS = 45000

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? null) as TierSlug | null
  if (!canAccess(tier, 'nexus')) {
    return NextResponse.json({ error: 'Operator access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const agentKey = String(body.agent ?? '')
  const sport = parseSport(typeof body.sport === 'string' ? body.sport : null)
  const date = typeof body.date === 'string' ? body.date.trim() : ''

  // The registry keyed by (sport, key) is the allowlist: an unknown key OR a
  // key that does not belong to this sport (e.g. 'stats' under NFL, 'nfl-scout'
  // under NBA) resolves to undefined and is rejected. This also guarantees the
  // backend path is one we defined, not one assembled from arbitrary input.
  const def = agentFor(sport, agentKey)
  if (!def) {
    return NextResponse.json(
      { error: `Unknown agent '${agentKey}' for ${sport}` },
      { status: 400 },
    )
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (date && def.liveOnly) {
    return NextResponse.json({
      error: `${def.label} reads a live-only source — running it with a past date ` +
             `would overwrite the current board onto that slate. Run it without a date.`,
    }, { status: 400 })
  }
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'BACKEND_URL not configured' }, { status: 500 })
  }

  const params = new URLSearchParams()
  if (date) params.set(def.dateParam ?? 'date', date)
  if (def.leagueParam) params.set('league', sport)
  if (def.editionType) params.set('edition_type', def.editionType)
  const qs = params.toString()
  const url = `${BACKEND_URL}/agents/${def.backendPath}/run${qs ? `?${qs}` : ''}`
  const started = Date.now()

  /**
   * The same values go in the QUERY STRING and the JSON BODY, because the
   * backend has both kinds of route and this proxy serves all of them.
   *
   * It used to send a Content-Type of application/json and no body at all. The
   * four routes that declare a Pydantic body answered 422 "body: Field
   * required" — rejected at request validation, before run_logged._start, so
   * picks_agent_runs held no row to explain it — and the `!res.ok` branch below
   * turned that into a 502. It read as a timeout on the heavy agents. It was
   * nothing of the kind: the two that "worked" were simply the two whose route
   * takes query parameters, and briefing-writer failed because its two
   * required fields were being sent as query parameters to a route that reads
   * them from the body.
   *
   * Query-only routes ignore a body; Pydantic models ignore unknown fields.
   * Sending both is therefore safe for every route and correct for each.
   */
  const payload: Record<string, string> = {}
  for (const [k, v] of params) payload[k] = v

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    })

    const text = await res.text()
    let result: unknown
    try { result = JSON.parse(text) } catch { result = text }

    if (!res.ok) {
      // Pass the backend's own status through for a 4xx. Reporting a 422 as a
      // 502 is what sent this investigation looking for a Railway timeout: a
      // gateway status says "the upstream failed", and the upstream had in
      // fact answered immediately and correctly that the request was invalid.
      const status = res.status >= 400 && res.status < 500 ? res.status : 502
      return NextResponse.json(
        { ok: false, agent: agentKey, sport, date: date || null,
          status: res.status, detail: result },
        { status },
      )
    }

    return NextResponse.json({
      ok: true, agent: agentKey, sport, date: date || null,
      elapsed_ms: Date.now() - started,
      result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isTimeout = err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError')
    if (isTimeout) {
      // Railway keeps running to completion — we just stopped waiting.
      return NextResponse.json({
        ok: true, agent: agentKey, sport, date: date || null,
        dispatched: true, still_running: true,
        note: 'Agent still running on Railway — exceeded the 45s wait window.',
      })
    }
    return NextResponse.json({ ok: false, agent: agentKey, sport, error: message }, { status: 500 })
  }
}
