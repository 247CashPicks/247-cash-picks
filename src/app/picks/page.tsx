import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import type { TierSlug, PickPublished } from '@/lib/picks/types'
import { BRAND } from '@/config/brand'
import { getSport } from '@/lib/sport/server'
import type { Sport } from '@/lib/sport'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts

const NAV = [
  ['SIGNALS',  '/picks'],
  ['ENGINE',   '/tools'],
  ['PIPELINE', '/dashboard'],
  ['TIERS',    '/join'],
] as [string, string][]

async function getTodaysPicks(sport: Sport): Promise<PickPublished[]> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('picks_published')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
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

function PickCard({ pick, locked }: { pick: PickPublished; locked?: boolean }) {
  const confColor = pick.confidence === 'high' ? C.signalCyan
    : pick.confidence === 'medium' ? C.platinum : C.muted
  const dirColor  = pick.direction === 'over' ? C.signalCyan : C.platinum
  const resultColor = pick.result === 'hit' ? C.signalCyan
    : pick.result === 'miss' ? C.flagAmber : C.muted

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${pick.confidence === 'high' ? C.borderEmphasis : C.border}`,
      position: 'relative', overflow: 'hidden',
      opacity: locked ? 0.35 : 1,
      filter: locked ? 'blur(3px)' : 'none',
      padding: '24px',
    }}>
      {pick.confidence === 'high' && !locked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: C.signalCyan,
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
            {pick.player_name}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, marginTop: '3px', letterSpacing: '0.05em' }}>
            {pick.team} · {pick.platform}
          </div>
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: '10px', color: confColor,
          border: `1px solid ${confColor}`, padding: '3px 9px', letterSpacing: '0.1em',
        }}>
          {pick.confidence.toUpperCase()}
        </div>
      </div>

      {/* Stat line */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        padding: '16px 0', marginBottom: '20px',
      }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.1em', marginBottom: '6px' }}>
            {pick.stat_type.toUpperCase()} LINE
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '38px', fontWeight: 500, color: C.platinum, lineHeight: 1 }}>
            {pick.line}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: F.mono, fontSize: '26px', fontWeight: 500, color: dirColor, letterSpacing: '0.05em' }}>
            {pick.direction.toUpperCase()}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '4px' }}>
            PROJ: {pick.our_projection}
          </div>
        </div>
      </div>

      {/* Result */}
      {pick.result !== 'pending' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          background: pick.result === 'hit' ? 'rgba(47,212,232,0.05)' : 'rgba(232,163,61,0.05)',
          border: `1px solid ${resultColor}`,
        }}>
          <span style={{ fontFamily: F.mono, color: resultColor, fontWeight: 500, fontSize: '13px', letterSpacing: '0.08em' }}>
            {pick.result === 'hit' ? '✓ HIT' : pick.result === 'miss' ? '✗ MISS' : pick.result.toUpperCase()}
          </span>
          {pick.actual_value && (
            <span style={{ fontFamily: F.mono, color: C.dim, fontSize: '12px' }}>
              · ACTUAL: {pick.actual_value}
            </span>
          )}
        </div>
      )}

      {pick.operator_notes && (
        <div style={{
          marginTop: '12px', fontFamily: F.sans, fontSize: '13px', color: C.muted,
          borderTop: `1px solid ${C.border}`, paddingTop: '12px', lineHeight: 1.5,
        }}>
          {pick.operator_notes}
        </div>
      )}
    </div>
  )
}

export default async function PicksPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? 'core') as TierSlug

  const sport = await getSport()
  const picks = await getTodaysPicks(sport)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const visibleLimit   = tier === 'core' ? 3 : picks.length
  const hasEarlyAccess = tier === 'vector' || tier === 'nexus'
  const tierConfig     = BRAND.tiers.find(t => t.slug === tier)

  return (
    <div style={{ background: C.void, minHeight: '100vh' }}>

      {/* Fixed grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(47,212,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(47,212,232,0.04) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '56px', background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(24px,4vw,48px)', gap: '32px',
      }}>
        <a href="/" style={{
          fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
          color: C.signalCyan, letterSpacing: '0.05em', marginRight: 'auto',
        }}>
          {BRAND.name}
        </a>
        {NAV.map(([label, href]) => (
          <a key={href} href={href} style={{
            fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.1em',
            color: href === '/picks' ? C.signalCyan : C.dim,
          }}>
            {label}
          </a>
        ))}
      </nav>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>

        {/* Header */}
        <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '22px clamp(24px,4vw,48px)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '10px' }}>
                  // DAILY SIGNALS
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 8px', lineHeight: 1, letterSpacing: '-0.03em',
                }}>
                  {today.toUpperCase()}
                </h1>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
                  {'> fetch_signals --date=today --status=published'}
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
                Today&apos;s signals will be published by 3:30 PM ET.
                {hasEarlyAccess && " You'll see them before everyone else."}
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}>
                {picks.map((pick, i) => (
                  <PickCard key={pick.id} pick={pick} locked={i >= visibleLimit} />
                ))}
              </div>

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
                    Upgrade to Signal tier for the full daily output slate.
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
