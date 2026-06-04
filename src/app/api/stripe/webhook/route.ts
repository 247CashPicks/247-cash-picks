import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  })
}

function getTierFromPriceId(priceId: string): string | null {
  for (const tier of BRAND.tiers) {
    if (tier.stripePriceId === priceId) return tier.slug
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const clerkUserId    = session.metadata?.clerk_user_id
      const priceId        = session.metadata?.price_id
      const stripeCustomerId = typeof session.customer === 'string'
        ? session.customer : null
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription : null

      if (!clerkUserId || !priceId) break

      const tierSlug = getTierFromPriceId(priceId)
      if (!tierSlug) {
        console.error('Unknown price ID:', priceId)
        break
      }

      await supabase
        .from('picks_wallets')
        .update({
          tier_slug: tierSlug,
          subscription_status: 'active',
          billing_cycle: 'monthly',
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('brand_id', BRAND.slug)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const rawSub = invoice.parent?.subscription_details?.subscription
      const subscriptionId = typeof rawSub === 'string' ? rawSub : null

      if (!subscriptionId) break

      await supabase
        .from('picks_wallets')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)
        .eq('brand_id', BRAND.slug)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const newPriceId = sub.items.data[0]?.price?.id
      const tierSlug   = newPriceId ? getTierFromPriceId(newPriceId) : null

      const updates: Record<string, string> = {
        subscription_status: sub.status === 'active' ? 'active' : 'paused',
        updated_at: new Date().toISOString(),
      }
      if (tierSlug) updates.tier_slug = tierSlug

      await supabase
        .from('picks_wallets')
        .update(updates)
        .eq('stripe_subscription_id', sub.id)
        .eq('brand_id', BRAND.slug)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('picks_wallets')
        .update({
          subscription_status: 'cancelled',
          tier_slug: null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
        .eq('brand_id', BRAND.slug)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
