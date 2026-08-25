import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
import { sportConfig } from '@/lib/sport'
import { sportFromRequest } from '@/lib/sport/request'
import type { TierSlug } from '@/lib/picks/types'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = await getWalletForUser(userId)
  const tier   = (wallet?.tier_slug ?? null) as TierSlug | null

  if (!canAccess(tier, 'analyst')) {
    return NextResponse.json({ error: 'Analyst tier or higher required' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) {
    return NextResponse.json({ players: [] })
  }

  // Reference tables are per-sport TABLES, not league-filtered rows, so this
  // is a table swap. The rank column swaps with it: nfl_players_reference has
  // no per36_pts, and ordering by a missing column returns an error, not an
  // unordered list.
  const cfg = sportConfig(sportFromRequest(req))
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from(cfg.playersReference)
    .select('player_name, team, position')
    .eq('brand_id', BRAND.slug)
    .ilike('player_name', `${q}%`)
    .order(cfg.playerRankColumn, { ascending: false })
    .limit(8)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ players: data || [] })
}
