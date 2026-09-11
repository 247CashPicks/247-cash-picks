import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import type { TierSlug, PickPublished } from '@/lib/picks/types'
import { BRAND } from '@/config/brand'
import { getSport } from '@/lib/sport/server'
import type { Sport } from '@/lib/sport'
import PickCard from './PickCard'
import PicksBrowser from './PicksBrowser'
import { visible_selections } from '@/lib/picks/visible_selections'
import { PLATFORM_TIME_ZONE } from '@/lib/time/eastern'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts


async function getVisiblePicks(sport: Sport): Promise<PickPublished[]> {
  const supabase = createServiceClient()
  return visible_selections(supabase, sport)
}

function UpgradeWall({ message, tier, price }: { message: string; tier: string; price: string }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.borderEmphasis}`,
        padding: '48px', textAlign: 'center', maxWidth: '480px',
      }}>
        <div style={{
          fontFamily: F.mono, fontSize: '12px', color: C.flagAmber,
          letterSpacing: '0.12em', marginBottom: '20px',
        }}>
          [ ACCESS RESTRICTED ]
        </div>
        <h2 style={{
          fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
          margin: '0 0 12px', color: C.platinum, letterSpacing: '-0.02em',
        }}>
          UPGRADE REQUIRED
        </h2>
        <p style={{ fontFamily: F.sans, color: C.muted, fontSize: '14px', lineHeight: 1.6, margin: '0 0 28px' }}>
          {message}
        </p>
        <a href={`/join?tier=${tier}`} style={{
          display: 'inline-block', background: C.signalCyan, color: C.void,
          padding: '12px 28px',
          fontFamily: F.mono, fontWeight: 500, fontSize: '12px', letterSpacing: '0.12em',
          textDecoration: 'none',
        }}>
          UPGRADE TO {tier.toUpperCase()} — {price}/mo →
        </a>
      </div>
    </div>
  )
}

export default async function PicksPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? 'core') as TierSlug

  const sport = await getSport()
  const picks = await getVisiblePicks(sport)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: PLATFORM_TIME_ZONE,
  })

  const visibleLimit   = tier === 'core' ? 3 : picks.length
  const hasEarlyAccess = tier === 'vector' || tier === 'nexus'
  const tierConfig     = BRAND.tiers.find(t => t.slug === tier)

  // Split before filtering: the browser only ever receives what this tier may
  // see. Locked picks stay out of it entirely (rows AND derived options), so no
  // filter can surface a pick the viewer hasn't paid for. Locked cards render
  // separately as blurred teasers.
  const visiblePicks = picks.slice(0, visibleLimit)
  const lockedPicks  = picks.slice(visibleLimit)

  return (
    <div style={{ background: C.void, minHeight: '100vh' }}>

      {/* Fixed grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(47,212,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(47,212,232,0.04) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />


      <div style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>

        {/* Header */}
        <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '22px clamp(24px,4vw,48px)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '10px' }}>
                  // SIGNALS
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 8px', lineHeight: 1, letterSpacing: '-0.03em',
                }}>
                  {today.toUpperCase()}
                </h1>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
                  {'> fetch_signals --window=current --status=published'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {hasEarlyAccess && (
                  <div style={{
                    fontFamily: F.mono, fontSize: '10px', color: C.signalCyan,
                    border: `1px solid ${C.borderEmphasis}`, padding: '4px 12px', letterSpacing: '0.1em',
                  }}>
                    EARLY ACCESS
                  </div>
                )}
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  border: `1px solid ${C.border}`, padding: '4px 12px', letterSpacing: '0.08em',
                }}>
                  {picks.length} SIGNALS
                </div>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.signalCyan,
                  border: `1px solid ${C.borderEmphasis}`, padding: '4px 12px', letterSpacing: '0.08em',
                }}>
                  {tierConfig?.badge?.toUpperCase() ?? tier.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(28px,3vw,44px) clamp(24px,4vw,48px)' }}>
          {picks.length === 0 ? (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              padding: '64px 40px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: '12px', color: C.flagAmber,
                letterSpacing: '0.12em', marginBottom: '16px',
              }}>
                [ SIGNALS PROCESSING ]
              </div>
              <h2 style={{
                fontFamily: F.sans, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 500,
                color: C.platinum, margin: '0 0 10px', letterSpacing: '-0.02em',
              }}>
                SIGNALS PROCESSING
              </h2>
              <p style={{ fontFamily: F.mono, color: C.muted, fontSize: '13px', margin: 0, lineHeight: 1.7 }}>
                Signals appear after operator confirmation for the active slate.
                {hasEarlyAccess && " You'll see confirmed signals first."}
              </p>
            </div>
          ) : (
            <>
              <PicksBrowser rows={visiblePicks} sport={sport} />

              {lockedPicks.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px', marginTop: '16px',
                }}>
                  {lockedPicks.map(pick => (
                    <PickCard key={pick.id} pick={pick} locked />
                  ))}
                </div>
              )}

              {tier === 'core' && picks.length > 3 && (
                <div style={{
                  marginTop: '28px', background: C.panel,
                  border: `1px solid rgba(232,163,61,0.3)`,
                  padding: '28px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.flagAmber,
                    letterSpacing: '0.12em', marginBottom: '12px',
                  }}>
                    [ ADDITIONAL SIGNALS LOCKED ]
                  </div>
                  <h3 style={{
                    fontFamily: F.sans, fontSize: 'clamp(16px,2vw,22px)', fontWeight: 500,
                    color: C.platinum, margin: '0 0 8px', letterSpacing: '-0.02em',
                  }}>
                    ADDITIONAL SIGNALS AVAILABLE
                  </h3>
                  <p style={{ fontFamily: F.sans, color: C.muted, fontSize: '13px', margin: '0 0 20px', lineHeight: 1.6 }}>
                    Upgrade to Signal tier for the full output slate.
                  </p>
                  <a href="/join?tier=signal" style={{
                    display: 'inline-block', background: C.signalCyan, color: C.void,
                    padding: '11px 28px',
                    fontFamily: F.mono, fontWeight: 500, fontSize: '12px', letterSpacing: '0.12em',
                  }}>
                    UPGRADE TO SIGNAL — $349/mo →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
