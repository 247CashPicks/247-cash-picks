import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import type { TierSlug } from '@/lib/picks/types'
import { BRAND } from '@/config/brand'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts

const NAV = [
  ['SIGNALS',  '/picks'],
  ['ENGINE',   '/tools'],
  ['PIPELINE', '/dashboard'],
  ['TIERS',    '/join'],
] as [string, string][]

export default async function PortalPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wallet = await getWalletForUser(userId)
  if (!wallet) redirect('/join')

  const supabase = createServiceClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [sessionsRes, savedRes] = await Promise.all([
    supabase
      .from('picks_tool_sessions')
      .select('tool_used, created_at')
      .eq('clerk_user_id', userId)
      .eq('brand_id', BRAND.slug)
      .gte('created_at', startOfMonth.toISOString()),

    supabase
      .from('picks_custom_inputs')
      .select('id, player_name, game_date, save_name, output_proj_pts, output_proj_reb, output_proj_ast, created_at')
      .eq('clerk_user_id', userId)
      .eq('brand_id', BRAND.slug)
      .eq('is_saved', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const sessions = sessionsRes.data || []
  const saved    = savedRes.data    || []

  const tier       = (wallet.tier_slug ?? 'core') as TierSlug
  const tierConfig = BRAND.tiers.find(t => t.slug === tier)

  const usageCounts: Record<string, number> = {}
  sessions.forEach(s => {
    usageCounts[s.tool_used] = (usageCounts[s.tool_used] || 0) + 1
  })

  const toolLinks = [
    { key: 'projection_runner', label: 'PROJECTION ENGINE', glyph: '◆', route: '/tools/projection-runner', minTier: 'analyst' },
    { key: 'matchup_builder',   label: 'MATCHUP MATRIX',    glyph: '⬡', route: '/tools/matchup-builder',   minTier: 'vector'  },
    { key: 'lineup_adjuster',   label: 'LINEUP CALIBRATOR', glyph: '◉', route: '/tools/lineup-adjuster',   minTier: 'vector'  },
    { key: 'backtester',        label: 'ACCURACY INDEX',    glyph: '◎', route: '/tools/backtester',        minTier: 'nexus'   },
  ]

  const tierOrder = ['core', 'signal', 'analyst', 'vector', 'nexus']
  const tierIdx   = tierOrder.indexOf(tier)

  const memberSince = wallet.created_at
    ? new Date(wallet.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A'

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
            fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.1em', color: C.dim,
          }}>
            {label}
          </a>
        ))}
      </nav>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>

        {/* Header */}
        <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '22px clamp(24px,4vw,48px)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '10px' }}>
                  // MY ACCOUNT
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 8px', lineHeight: 1, letterSpacing: '-0.03em',
                }}>
                  SUBSCRIBER <span style={{ color: C.signalCyan }}>PORTAL.</span>
                </h1>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
                  {'> query_account --tier='}{tier.toUpperCase()}
                </div>
              </div>

              {/* Tier badge */}
              <div style={{
                background: C.void, border: `2px solid ${C.borderEmphasis}`,
                padding: '14px 22px', textAlign: 'center',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '6px' }}>
                  ACTIVE TIER
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '18px', fontWeight: 500, color: C.platinum, letterSpacing: '0.08em' }}>
                  {tier.toUpperCase()}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, marginTop: '4px' }}>
                  ${tierConfig?.priceMonthly}/month
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(28px,3vw,44px) clamp(24px,4vw,48px)' }}>

          {/* Stats strip */}
          <div className="stats-4-grid" style={{ marginBottom: '24px' }}>
            {[
              {
                label: 'STATUS',
                value: wallet.subscription_status === 'active' ? 'ACTIVE' : (wallet.subscription_status ?? 'INACTIVE').toUpperCase(),
                color: wallet.subscription_status === 'active' ? C.signalCyan : C.muted,
              },
              {
                label: 'BILLING',
                value: wallet.billing_cycle ? wallet.billing_cycle.toUpperCase() : '—',
                color: C.platinum,
              },
              { label: 'TIER',         value: tier.toUpperCase(), color: C.signalCyan },
              { label: 'MEMBER SINCE', value: memberSince,        color: C.muted },
            ].map(s => (
              <div key={s.label} style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '18px 20px' }}>
                <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.1em', marginBottom: '8px' }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 'clamp(14px,1.5vw,18px)', fontWeight: 500, color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div className="two-col-layout" style={{ gap: '16px', marginBottom: '20px' }}>

            {/* Quick access */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '24px' }}>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '16px' }}>
                // QUICK ACCESS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {[
                  { label: "TODAY'S SIGNALS", route: '/picks'   },
                  { label: 'ACCURACY INDEX',  route: '/tracker' },
                ].map(link => (
                  <a key={link.label} href={link.route} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: C.void, border: `1px solid ${C.border}`,
                    padding: '12px 14px', fontFamily: F.mono, fontSize: '12px',
                    color: C.platinum, letterSpacing: '0.06em',
                  }}>
                    <span style={{ color: C.signalCyan }}>›</span>
                    {link.label}
                    <span style={{ marginLeft: 'auto', color: C.signalCyan }}>→</span>
                  </a>
                ))}
              </div>

              <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.1em', marginBottom: '10px' }}>
                ANALYTICS TOOLS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {toolLinks.map(tool => {
                  const unlocked = tierIdx >= tierOrder.indexOf(tool.minTier)
                  return (
                    <a key={tool.key} href={unlocked ? tool.route : `/join?tier=${tool.minTier}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: unlocked ? C.void : 'transparent',
                        border: `1px solid ${unlocked ? C.border : 'rgba(90,102,114,0.3)'}`,
                        padding: '10px 14px', fontFamily: F.mono, fontSize: '11px',
                        color: unlocked ? C.platinum : C.faint,
                        letterSpacing: '0.06em', opacity: unlocked ? 1 : 0.5,
                      }}
                    >
                      <span style={{ color: unlocked ? C.signalCyan : C.faint }}>{tool.glyph}</span>
                      <span style={{ flex: 1 }}>{tool.label}</span>
                      {unlocked
                        ? usageCounts[tool.key]
                          ? <span style={{ fontSize: '10px', color: C.signalCyan }}>{usageCounts[tool.key]} RUNS</span>
                          : <span style={{ color: C.dim }}>→</span>
                        : <span style={{ fontSize: '10px', color: C.faint }}>[ {tool.minTier.toUpperCase()}+ ]</span>
                      }
                    </a>
                  )
                })}
              </div>
            </div>

            {/* This month */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '24px' }}>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '16px' }}>
                // THIS MONTH
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'PROJECTIONS RUN',  count: usageCounts['projection_runner'] || 0 },
                  { label: 'MATCHUPS BUILT',   count: usageCounts['matchup_builder']   || 0 },
                  { label: 'LINEUPS ADJUSTED', count: usageCounts['lineup_adjuster']   || 0 },
                  { label: 'BACKTESTS RUN',    count: usageCounts['backtester']        || 0 },
                ].map(s => (
                  <div key={s.label} style={{
                    background: C.void, border: `1px solid ${C.border}`, padding: '14px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: F.mono, fontSize: 'clamp(24px,2.5vw,32px)', fontWeight: 500,
                      color: s.count > 0 ? C.signalCyan : C.faint, lineHeight: 1,
                    }}>
                      {s.count}
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, marginTop: '6px', letterSpacing: '0.06em' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', fontFamily: F.mono, color: C.muted, fontSize: '12px', lineHeight: 1.6 }}>
                  No tool runs yet this month.
                  {tierIdx >= 2 && (
                    <><br />
                      <a href="/tools" style={{ color: C.signalCyan, fontWeight: 500 }}>
                        {'> open_lab →'}
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Saved analyses */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '16px' }}>
              // SAVED TO LAB
            </div>

            {saved.length === 0 ? (
              <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px', lineHeight: 1.6 }}>
                No saved analyses yet.{' '}
                {tierIdx >= 2
                  ? <a href="/tools/projection-runner" style={{ color: C.signalCyan }}>{'> run_projection --save →'}</a>
                  : <span style={{ color: C.faint }}>Available from Analyst tier.</span>
                }
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 100px 80px 80px 80px 100px',
                  padding: '8px 0', marginBottom: '8px',
                  fontFamily: F.mono, fontSize: '10px', fontWeight: 500,
                  color: C.dim, letterSpacing: '0.1em',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {['PLAYER', 'DATE', 'PTS', 'REB', 'AST', 'SAVED'].map(h => <div key={h}>{h}</div>)}
                </div>
                {saved.map((s, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 100px 80px 80px 80px 100px',
                    padding: '11px 0', alignItems: 'center',
                    borderBottom: i < saved.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '14px', color: C.platinum }}>
                      {s.save_name || s.player_name || '—'}
                    </div>
                    <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px' }}>{s.game_date}</div>
                    <div style={{ fontFamily: F.mono, color: C.signalCyan, fontWeight: 500, fontSize: '14px' }}>{s.output_proj_pts ?? '—'}</div>
                    <div style={{ fontFamily: F.mono, color: C.platinum, fontWeight: 500, fontSize: '14px' }}>{s.output_proj_reb ?? '—'}</div>
                    <div style={{ fontFamily: F.mono, color: C.muted, fontWeight: 500, fontSize: '14px' }}>{s.output_proj_ast ?? '—'}</div>
                    <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manage membership */}
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`, padding: '24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '20px',
          }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '8px' }}>
                // MANAGE MEMBERSHIP
              </div>
              <p style={{ fontFamily: F.sans, color: C.muted, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                Update billing, upgrade tier, or cancel via the Stripe portal.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a href="/join" style={{
                display: 'inline-block', background: C.signalCyan, color: C.void,
                padding: '10px 22px', fontFamily: F.mono, fontWeight: 500,
                fontSize: '12px', letterSpacing: '0.12em',
              }}>
                UPGRADE TIER
              </a>
              <a
                href={wallet.stripe_customer_id ? `https://billing.stripe.com/p/login/test_placeholder` : '#'}
                style={{
                  display: 'inline-block', background: 'transparent', color: C.muted,
                  border: `1px solid ${C.border}`, padding: '10px 22px',
                  fontFamily: F.mono, fontWeight: 500, fontSize: '12px', letterSpacing: '0.12em',
                }}
              >
                BILLING PORTAL
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
