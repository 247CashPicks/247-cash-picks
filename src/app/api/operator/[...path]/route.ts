import { NextRequest, NextResponse } from 'next/server'
import { ALLOWED_PREFIX, operatorFetch } from '@/lib/operator/client'

/**
 * Proxy from the browser to the backend's operator API.
 *
 * It attaches the caller's OWN Clerk token and nothing else, so it grants no
 * authority the caller did not already have — the backend still decides whether
 * that person is an operator. What it does provide is that the browser never
 * holds BACKEND_URL and never sees the cron secret.
 *
 * SCOPED, not a catch-all. Only /operator/* is forwarded. A proxy that
 * forwarded any path would let any signed-in subscriber reach every backend
 * route through this app, using this app's network position.
 */

export const dynamic = 'force-dynamic'

async function forward(req: NextRequest, params: { path: string[] }, method: string) {
  const path = `${ALLOWED_PREFIX}${(params.path ?? []).join('/')}`
  if (!path.startsWith(ALLOWED_PREFIX) || path.includes('..')) {
    return NextResponse.json({ detail: 'Refused' }, { status: 400 })
  }
  const search = req.nextUrl.search
  const body = method === 'GET' ? undefined : await req.text()

  const result = await operatorFetch<unknown>(`${path}${search}`, {
    method,
    ...(body ? { body } : {}),
  })

  if (!result.ok) {
    // The backend's own message and rule reach the UI unchanged. A rejection
    // reworded on the way through is a rejection the operator cannot act on.
    return NextResponse.json(
      { detail: { error: result.error, rule: result.rule,
                  indicator_key: result.indicatorKey } },
      { status: result.status },
    )
  }
  return NextResponse.json(result.data, { status: result.status })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params, 'GET')
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params, 'POST')
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params, 'PATCH')
}
