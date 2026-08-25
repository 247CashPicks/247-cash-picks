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
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = await getWalletForUser(userId)
  const tier   = (wallet?.tier_slug ?? null) as TierSlug | null

  if (!canAccess(tier, 'analyst')) {
    return NextResponse.json({ error: 'Analyst tier or higher required' }, { status: 403 })
  }

  const player   = req.nextUrl.searchParams.get('player') ?? ''
  const dateParam = req.nextUrl.searchParams.get('date')  ?? ''
  const date     = dateParam || new Date().toISOString().split('T')[0]

  if (!player) {
    return NextResponse.json({ error: 'player param required' }, { status: 400 })
  }

  const sport = sportFromRequest(req)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('picks_matchups')
    .select(
      'opponent_pace, opponent_def_rating, opp_rebs_allowed, opp_ast_allowed, ' +
      'individual_pace, individual_def_rating, weight_boost_pct, defender_percentile, ' +
      'defender_name, defender_team'
    )
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('player_name', player)
    .eq('game_date', date)
    .single()

  if (error || !data) {
    // No row = player not in today's slate (offseason, rest day, etc.) — not an error
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({ found: true, matchup: data })
}
