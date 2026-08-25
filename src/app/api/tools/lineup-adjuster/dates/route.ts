import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
import { sportFromRequest } from '@/lib/sport/request'
import type { TierSlug } from '@/lib/picks/types'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? null) as TierSlug | null
  if (!canAccess(tier, 'vector')) {
    return NextResponse.json({ error: 'Vector tier or higher required' }, { status: 403 })
  }

  // NBA-only by construction (per-36 over shared on-court minutes / 1-on-1
  // defender iso). Returns an honest empty result rather than querying NBA
  // reference columns that do not exist on the NFL side. The nav hides this
  // tool under NFL; this is the API-side half of that same rule.
  const sport = sportFromRequest(req)
  if (sport !== 'NBA') {
    return NextResponse.json(
      { dates: [], sport, unsupported: true,
        message: 'This tool is NBA-only — no NFL analogue exists.' })
  }
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('picks_players')
    .select('game_date')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .not('per36_pts', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dates = Array.from(new Set((data ?? []).map(r => r.game_date as string)))
    .sort((a, b) => (a < b ? 1 : -1))   // most recent first

  return NextResponse.json({ dates })
}
