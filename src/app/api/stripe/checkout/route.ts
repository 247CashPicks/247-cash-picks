import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

const BRAND_ID = '247cashpicks'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.247cashpicks.live'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  })
}

export async function POST(req: NextRequest) {
  const userId = 'preview-user'

  const { tierSlug, promoCode } = await req.json()

  if (!tierSlug) {
    return NextResponse.json({ error: 'tierSlug required' }, { status: 400 })
  }

  const tier = BRAND.tiers.find(t => t.slug === tierSlug)
  if (!tier) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  if (!tier.stripePriceId) {
    return NextResponse.json({
      error: 'Stripe Price ID not configured for this tier',
      tier: tierSlug,
    }, { status: 503 })
  }

  const supabase = createServiceClient()

  const { data: wallet } = await supabase
    .from('picks_wallets')
    .select('stripe_customer_id, subscription_status, tier_slug')
    .eq('clerk_user_id', userId)
    .eq('brand_id', BRAND_ID)
    .single()

  if (
    wallet?.subscription_status === 'active' &&
    wallet?.tier_slug === tierSlug
  ) {
    return NextResponse.json({ error: 'Already subscribed to this tier' }, { status: 400 })
  }

  const stripe = getStripe()

  const { data: member } = await supabase
    .from('members')
    .select('email, first_name, last_name')
    .eq('clerk_user_id', userId)
    .single()

  let stripeCustomerId = wallet?.stripe_customer_id ?? undefined

  if (!stripeCustomerId && member?.email) {
    const customer = await stripe.customers.create({
      email: member.email,
      name: [member.first_name, member.last_name].filter(Boolean).join(' ') || undefined,
      metadata: {
        clerk_user_id: userId,
        brand_id: BRAND_ID,
      },
    })
    stripeCustomerId = customer.id

    await supabase
      .from('picks_wallets')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('clerk_user_id', userId)
      .eq('brand_id', BRAND_ID)
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: tier.stripePriceId, quantity: 1 }],
    success_url: `${SITE_URL}/portal?checkout=success&tier=${tierSlug}`,
    cancel_url: `${SITE_URL}/join?tier=${tierSlug}&cancelled=true`,
    metadata: {
      clerk_user_id: userId,
      brand_id: BRAND_ID,
      tier_slug: tierSlug,
      price_id: tier.stripePriceId,
    },
    subscription_data: {
      metadata: {
        clerk_user_id: userId,
        brand_id: BRAND_ID,
        tier_slug: tierSlug,
      },
    },
    allow_promotion_codes: true,
  }

  // Apply 50% off coupon for new members
  if (promoCode === 'NEWMEMBER50' || !wallet?.subscription_status) {
    try {
      const couponId = 'NEWMEMBER50PCT'
      try {
        await stripe.coupons.retrieve(couponId)
      } catch {
        await stripe.coupons.create({
          id: couponId,
          percent_off: 50,
          duration: 'once',
          name: '50% Off First Month',
        })
      }
      sessionParams.discounts = [{ coupon: couponId }]
      // Cannot combine discounts with allow_promotion_codes
      delete sessionParams.allow_promotion_codes
    } catch (e) {
      console.error('Coupon error:', e)
      // Non-fatal — proceed without discount
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create(sessionParams)

  return NextResponse.json({ url: checkoutSession.url })
}
