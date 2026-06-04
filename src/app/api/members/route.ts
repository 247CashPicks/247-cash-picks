import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

// POST /api/members — Clerk webhook handler
export async function POST(req: NextRequest) {
  let event
  try {
    event = await verifyWebhook(req)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  // TODO(deletion policy): user.deleted not handled yet. Decide: cancel active
  // Stripe subscription? retain member row for re-signup vs purge for privacy?

  const supabase = createServiceClient()

  if (event.type === 'user.created') {
    const { id: clerkUserId, email_addresses, first_name, last_name } = event.data
    const email = email_addresses?.[0]?.email_address

    if (!clerkUserId || !email) {
      return NextResponse.json({ error: 'Missing user data' }, { status: 400 })
    }

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
      brand_id: BRAND.slug,
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

  if (event.type === 'user.updated') {
    const { id: clerkUserId, email_addresses, first_name, last_name } = event.data
    const email = email_addresses?.[0]?.email_address

    if (!clerkUserId || !email) {
      return NextResponse.json({ error: 'Missing user data' }, { status: 400 })
    }

    // Try to update the existing row first
    const { data: updated } = await supabase
      .from('members')
      .update({
        email,
        first_name: first_name || null,
        last_name: last_name || null,
      })
      .eq('clerk_user_id', clerkUserId)
      .select('id')

    // No row existed — create the member so we don't lose the user
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from('members')
        .insert({
          clerk_user_id: clerkUserId,
          email,
          first_name: first_name || null,
          last_name: last_name || null,
          role: 'member',
          status: 'active',
        })

      if (insertError) {
        console.error('Member upsert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ upserted: true })
    }

    return NextResponse.json({ updated: true })
  }

  // All other event types are ignored cleanly
  return NextResponse.json({ received: true })
}
