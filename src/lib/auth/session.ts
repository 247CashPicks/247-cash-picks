import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'
import type { TierSlug } from '@/lib/picks/types'

export interface WalletData {
  tier_slug:             TierSlug | null
  subscription_status:   string | null
  billing_cycle:         string | null
  stripe_customer_id:    string | null
  created_at:            string | null
}

/**
 * Fetches the picks_wallet for a Clerk user, scoped to this brand.
 * Always filters on BOTH brand_id AND clerk_user_id to prevent collisions
 * across future frontends that share the same Supabase instance.
 */
export async function getWalletForUser(clerkUserId: string): Promise<WalletData | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('picks_wallets')
    .select('tier_slug, subscription_status, billing_cycle, stripe_customer_id, created_at')
    .eq('brand_id', BRAND.slug)
    .eq('clerk_user_id', clerkUserId)
    .single()

  return data ?? null
}
