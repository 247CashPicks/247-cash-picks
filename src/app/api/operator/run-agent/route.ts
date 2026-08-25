import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import type { TierSlug } from '@/lib/picks/types'

const BACKEND_URL = process.env.BACKEND_URL || ''
const CRON_SECRET = process.env.CRON_SECRET || 'cashpicks-cron-2026'

// Allowlist — prevents arbitrary path injection into the backend URL.
const ALLOWED_AGENTS = [
  'scout', 'stats', 'matchup', 'defense', 'projector', 'lines', 'selector',
] as const

// These scrape LIVE-ONLY sources (Court-IQ / RotoWire / DFS boards). Running them
// with a historical date would write today's board onto a past slate. Blocked.
const LIVE_ONLY_AGENTS: string[] = ['stats', 'defense', 'lines']

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
  const agent = String(body.agent ?? '')
  const date = typeof body.date === 'string' ? body.date.trim() : ''

  if (!(ALLOWED_AGENTS as readonly string[]).includes(agent)) {
    return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 })
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (date && LIVE_ONLY_AGENTS.includes(agent)) {
    return NextResponse.json({
      error: `${agent} reads live-only sources — running it with a past date would ` +
             `write today's board onto that slate. Run it without a date.`,
    }, { status: 400 })
  }
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'BACKEND_URL not configured' }, { status: 500 })
  }

  const url = `${BACKEND_URL}/agents/picks-${agent}/run` +
              (date ? `?date=${encodeURIComponent(date)}` : '')
  const started = Date.now()

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    })

    const text = await res.text()
    let result: unknown
    try { result = JSON.parse(text) } catch { result = text }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, agent, date: date || null, status: res.status, detail: result },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true, agent, date: date || null,
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
        ok: true, agent, date: date || null,
        dispatched: true, still_running: true,
        note: 'Agent still running on Railway — exceeded the 45s wait window.',
      })
    }
    return NextResponse.json({ ok: false, agent, error: message }, { status: 500 })
  }
}
