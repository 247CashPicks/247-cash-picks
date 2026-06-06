import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
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

  const player = req.nextUrl.searchParams.get('player') ?? ''
  const team   = req.nextUrl.searchParams.get('team')   ?? ''

  if (!player || !team) {
    return NextResponse.json({ error: 'player and team params required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('nba_players_reference')
    .select('per36_pts, per36_reb, per36_ast, per36_stl, per36_blk, per36_tpm, avg_minutes, position, team, games_played')
    .eq('brand_id', BRAND.slug)
    .eq('player_name', player)
    .eq('team', team)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Player not found' }, { status: 404 })
  }

  return NextResponse.json({ stats: data })
}
