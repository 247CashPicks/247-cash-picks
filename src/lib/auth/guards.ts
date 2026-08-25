import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getWalletForUser } from './session'
import { canAccess } from '@/lib/picks/tiers'
import type { TierSlug } from '@/lib/picks/types'

/**
 * Route-handler guards.
 *
 * The auth+wallet+canAccess triple was copy-pasted into every gated route,
 * which is exactly why four routes ended up missing a piece of it: POST
 * /api/picks had no auth() at all and could publish anonymously, GET
 * /api/projections was fully public, and /api/tools/backtester checked login
 * but never the tier it nominally requires.
 *
 * Page guards are deliberately NOT here: redirect() comes from next/navigation
 * and belongs to the server-component world, not the route-handler one. Pages
 * compose sessionTier() with their own redirect.
 */

/** Operator surfaces (dashboard, publish, agent dispatch) require the top tier. */
export const OPERATOR_TIER: TierSlug = 'nexus'

export interface SessionTier {
  userId: string | null
  tier: TierSlug | null
}

/** The signed-in user's tier, or nulls when signed out. Never throws. */
export async function sessionTier(): Promise<SessionTier> {
  const { userId } = await auth()
  if (!userId) return { userId: null, tier: null }
  const wallet = await getWalletForUser(userId)
  return { userId, tier: (wallet?.tier_slug ?? null) as TierSlug | null }
}

/**
 * Returns a response to send back, or null when the caller may proceed.
 *
 *   const denied = await guardRoute('nexus', 'Operator access required')
 *   if (denied) return denied
 */
export async function guardRoute(
  required: TierSlug,
  message?: string,
): Promise<NextResponse | null> {
  const { userId, tier } = await sessionTier()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canAccess(tier, required)) {
    return NextResponse.json(
      { error: message ?? `${required} tier or higher required` },
      { status: 403 },
    )
  }
  return null
}

/** Convenience for the operator-only routes. */
export function guardOperatorRoute(): Promise<NextResponse | null> {
  return guardRoute(OPERATOR_TIER, 'Operator access required')
}
