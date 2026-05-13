import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { canAccess } from '@/lib/picks/tiers'
import type { TierSlug } from '@/lib/picks/types'

const BRAND_ID = '247cashpicks'

// GET /api/projections?date=2026-05-12&player=luka
// Returns agent projections for tool pre-fill (Sharp+ only)
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: wallet } = await supabase
    .from('picks_wallets')
    .select('tier_slug, subscription_status')
    .eq('clerk_user_id', userId)
    .eq('brand_id', BRAND_ID)
    .single()

  if (!wallet || wallet.subscription_status !== 'active') {
    return NextResponse.json({ error: 'No active subscription' }, { status: 403 })
  }

  const tier = wallet.tier_slug as TierSlug
  if (!canAccess(tier, 'signal')) {
    return NextResponse.json({ error: 'Signal tier required' }, { status: 403 })
  }

  const date = req.nextUrl.searchParams.get('date')
    || new Date().toISOString().split('T')[0]
  const playerQuery = req.nextUrl.searchParams.get('player')

  let query = supabase
    .from('picks_projections')
    .select(`
      id, player_name, team, position, is_starter,
      projected_minutes, proj_pts, proj_reb, proj_ast,
      proj_stl, proj_blk, proj_3pm,
      confidence_score, data_quality_flags,
      game_id, game_date
    `)
    .eq('brand_id', BRAND_ID)
    .eq('game_date', date)
    .order('confidence_score', { ascending: false })

  if (playerQuery) {
    query = query.ilike('player_name', `%${playerQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const playerNames = (data || []).map(p => p.player_name)

  const { data: matchups } = await supabase
    .from('picks_matchups')
    .select('*')
    .eq('brand_id', BRAND_ID)
    .eq('game_date', date)
    .in('player_name', playerNames)

  const matchupMap = new Map(
    (matchups || []).map(m => [m.player_name, m])
  )

  const enriched = (data || []).map(proj => ({
    ...proj,
    matchup: matchupMap.get(proj.player_name) || null,
  }))

  return NextResponse.json({ projections: enriched, date })
}
