import type { NextRequest } from 'next/server'
import { parseSport, SPORT_COOKIE, type Sport } from './index'

/**
 * The active sport for a route handler.
 *
 * An explicit ?sport= wins over the cookie, so an API call can name its sport
 * without depending on browser state — this is the escape hatch for the one
 * thing a cookie costs us versus a searchParam.
 */
export function sportFromRequest(req: NextRequest): Sport {
  const explicit = req.nextUrl.searchParams.get('sport')
  if (explicit) return parseSport(explicit)
  return parseSport(req.cookies.get(SPORT_COOKIE)?.value)
}
