import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { canAccess } from '@/lib/picks/tiers'
import type { TierSlug, PickPublished } from '@/lib/picks/types'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

async function getSubscriberTier(clerkUserId: string): Promise<TierSlug | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('picks_wallets')
    .select('tier_slug, subscription_status')
    .eq('clerk_user_id', clerkUserId)
    .eq('brand_id', '247cashpicks')
    .single()
  if (!data || data.subscription_status !== 'active') return null
  return data.tier_slug as TierSlug
}

async function getTodaysPicks(): Promise<PickPublished[]> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('picks_published')
    .select('*')
    .eq('brand_id', '247cashpicks')
    .eq('game_date', today)
    .eq('status', 'published')
    .order('display_order', { ascending: true })
  return (data || []) as PickPublished[]
}

function UpgradeWall({ message, tier, price }: { message: string; tier: string; price: string }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: '20px', padding: '48px', textAlign: 'center',
        maxWidth: '480px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{
          fontFamily: F.heading, fontSize: '32px', fontWeight: 700,
          margin: '0 0 12px', color: C.text,
        }}>
          UPGRADE REQUIRED
        </h2>
        <p style={{ color: C.textMuted, fontSize: '16px', lineHeight: 1.6, margin: '0 0 28px' }}>
          {message}
        </p>
        <a href={`/join?tier=${tier}`} style={{
          display: 'inline-block', background: C.accent, color: C.text,
          padding: '14px 32px', borderRadius: '8px', fontFamily: F.heading,
          fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px',
          textDecoration: 'none',
        }}>
          UPGRADE TO {tier.toUpperCase()} — {price}/mo
        </a>
      </div>
    </div>
  )
}

function PickCard({ pick, locked }: { pick: PickPublished; locked?: boolean }) {
  const confColor = pick.confidence === 'high' ? C.confirm
    : pick.confidence === 'medium' ? C.signal : C.textMuted
  const dirColor = pick.direction === 'over' ? C.confirm : C.signal
  const resultColor = pick.result === 'hit' ? C.confirm
    : pick.result === 'miss' ? C.alert : C.textMuted

  return (
    <div style={{
      background: C.surface, borderRadius: '16px', padding: '24px',
      border: `1px solid ${pick.confidence === 'high'
        ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`,
      position: 'relative', overflow: 'hidden',
      opacity: locked ? 0.4 : 1,
      filter: locked ? 'blur(2px)' : 'none',
    }}>
      {pick.confidence === 'high' && !locked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent, ${C.confirm}, transparent)`,
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '16px', color: C.text }}>{pick.player_name}</div>
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
            {pick.team} · {pick.platform}
          </div>
        </div>
        <div style={{
          background: `rgba(${pick.confidence === 'high' ? '52,211,153'
            : pick.confidence === 'medium' ? '56,189,248' : '148,163,184'},0.1)`,
          border: `1px solid ${confColor}`,
          borderRadius: '100px', padding: '4px 12px',
          fontSize: '11px', fontWeight: 700, color: confColor,
          letterSpacing: '0.5px', alignSelf: 'flex-start',
          textTransform: 'uppercase' as const,
        }}>
          {pick.confidence}
        </div>
      </div>

      {/* Stat + Line */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '16px',
      }}>
        <div>
          <div style={{
            fontSize: '12px', color: C.textMuted, marginBottom: '4px',
            textTransform: 'uppercase' as const, letterSpacing: '0.5px',
          }}>
            {pick.stat_type.toUpperCase()} Line
          </div>
          <div style={{
            fontFamily: F.heading, fontSize: '36px', fontWeight: 700, lineHeight: 1,
          }}>
            {pick.line}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: F.heading, fontSize: '28px', fontWeight: 700,
            color: dirColor, letterSpacing: '1px',
          }}>
            {pick.direction.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: C.textMuted }}>
            Proj: {pick.our_projection}
          </div>
        </div>
      </div>

      {/* Result badge if resolved */}
      {pick.result !== 'pending' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '8px',
          background: `rgba(${pick.result === 'hit' ? '52,211,153' : '248,113,113'},0.1)`,
          border: `1px solid rgba(${pick.result === 'hit' ? '52,211,153' : '248,113,113'},0.3)`,
        }}>
          <span style={{ color: resultColor, fontWeight: 700, fontSize: '14px' }}>
            {pick.result === 'hit' ? '✓ HIT' : pick.result === 'miss' ? '✗ MISS' : pick.result.toUpperCase()}
          </span>
          {pick.actual_value && (
            <span style={{ color: C.textMuted, fontSize: '13px' }}>
              · Actual: {pick.actual_value}
            </span>
          )}
        </div>
      )}

      {pick.operator_notes && (
        <div style={{
          marginTop: '12px', fontSize: '13px', color: C.textMuted,
          fontStyle: 'italic', borderTop: `1px solid rgba(255,255,255,0.06)`,
          paddingTop: '12px',
        }}>
          {pick.operator_notes}
        </div>
      )}
    </div>
  )
}

export default async function PicksPage() {
  const { userId } = await auth()
  if (!userId) redirect('/join?redirect=/picks')

  const tier = await getSubscriberTier(userId)

  if (!tier) {
    return (
      <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>
        <UpgradeWall
          message="You need an active membership to access daily signals. Start with Core at $199/month."
          tier="core"
          price="$199"
        />
      </div>
    )
  }

  void canAccess

  const picks = await getTodaysPicks()
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const visibleLimit = tier === 'core' ? 3 : picks.length
  const hasEarlyAccess = tier === 'vector' || tier === 'nexus'

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        background: C.surface, padding: '32px 40px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px',
          }}>
            <div>
              <div style={{
                fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
                color: C.accentLight, letterSpacing: '2px', marginBottom: '8px',
              }}>
                DAILY SIGNALS
              </div>
              <h1 style={{
                fontFamily: F.heading, fontSize: '36px', fontWeight: 700,
                margin: 0, lineHeight: 1,
              }}>
                {today}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              {hasEarlyAccess && (
                <div style={{
                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
                  borderRadius: '100px', padding: '6px 16px',
                  fontSize: '12px', fontWeight: 700, color: C.accentLight, letterSpacing: '0.5px',
                }}>
                  ⚡ EARLY ACCESS
                </div>
              )}
              <div style={{
                background: 'rgba(167,139,250,0.08)', border: `1px solid ${C.border}`,
                borderRadius: '100px', padding: '6px 16px',
                fontSize: '12px', color: C.textMuted,
              }}>
                {picks.length} signals today
              </div>
              <div style={{
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: '100px', padding: '6px 16px',
                fontSize: '12px', fontWeight: 600,
                color: BRAND.tiers.find(t => t.slug === tier)?.color || C.accentLight,
              }}>
                {BRAND.tiers.find(t => t.slug === tier)?.gem} {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
        {picks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            background: C.surface, borderRadius: '16px',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <h2 style={{
              fontFamily: F.heading, fontSize: '28px', fontWeight: 700,
              margin: '0 0 12px',
            }}>
              SIGNALS PROCESSING
            </h2>
            <p style={{ color: C.textMuted, fontSize: '16px', margin: 0 }}>
              Today&apos;s signals will be published by 3:30 PM ET.
              {hasEarlyAccess && " You'll see them before everyone else."}
            </p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}>
              {picks.map((pick, i) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  locked={i >= visibleLimit}
                />
              ))}
            </div>

            {tier === 'core' && picks.length > 3 && (
              <div style={{
                marginTop: '32px', background: C.surface,
                border: `1px solid ${C.border}`, borderRadius: '16px',
                padding: '32px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔒</div>
                <h3 style={{
                  fontFamily: F.heading, fontSize: '24px', fontWeight: 700,
                  margin: '0 0 8px',
                }}>
                  ADDITIONAL SIGNALS AVAILABLE
                </h3>
                <p style={{ color: C.textMuted, fontSize: '15px', margin: '0 0 20px' }}>
                  Upgrade to Signal tier for the full daily output slate.
                </p>
                <a href="/join?tier=signal" style={{
                  display: 'inline-block', background: C.signal, color: '#07080E',
                  padding: '12px 28px', borderRadius: '8px', fontFamily: F.heading,
                  fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px',
                  textDecoration: 'none',
                }}>
                  UPGRADE TO SIGNAL — $349/mo
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
