import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const BRAND_ID = '247cashpicks'

// POST /api/members — Clerk webhook creates member + wallet on sign-up
export async function POST(req: NextRequest) {
  const svix_id        = req.headers.get('svix-id')
  const svix_signature = req.headers.get('svix-signature')

  if (!svix_id || !svix_signature) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 })
  }

  const payload = await req.json()
  const { type, data } = payload

  if (type !== 'user.created') {
    return NextResponse.json({ received: true })
  }

  const { id: clerkUserId, email_addresses, first_name, last_name } = data
  const email = email_addresses?.[0]?.email_address

  if (!clerkUserId || !email) {
    return NextResponse.json({ error: 'Missing user data' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({
      clerk_user_id: clerkUserId,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      role: 'member',
      status: 'active',
    })
    .select('id')
    .single()

  if (memberError) {
    console.error('Member insert error:', memberError)
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  const referralCode = `CP${clerkUserId.slice(-6).toUpperCase()}`

  await supabase.from('picks_wallets').insert({
    brand_id: BRAND_ID,
    member_id: member.id,
    clerk_user_id: clerkUserId,
    credits_balance: 0,
    credits_lifetime: 0,
    credits_used: 0,
    tier_slug: null,
    subscription_status: 'inactive',
    referral_code: referralCode,
  })

  return NextResponse.json({ created: true, memberId: member.id })
}
