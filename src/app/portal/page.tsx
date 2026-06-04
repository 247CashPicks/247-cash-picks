import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import type { TierSlug } from '@/lib/picks/types'
import { BRAND } from '@/config/brand'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts

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
  const saved = savedRes.data || []

  const tier = (wallet.tier_slug ?? 'core') as TierSlug
  const tierConfig = BRAND.tiers.find(t => t.slug === tier)

  const usageCounts: Record<string, number> = {}
  sessions.forEach(s => {
    usageCounts[s.tool_used] = (usageCounts[s.tool_used] || 0) + 1
  })

  const toolLinks = [
    { key: 'projection_runner', label: 'Projection Engine',  icon: '⚡', route: '/tools/projection-runner', minTier: 'analyst' },
    { key: 'matchup_builder',   label: 'Matchup Matrix',     icon: '🔀', route: '/tools/matchup-builder',   minTier: 'vector' },
    { key: 'lineup_adjuster',   label: 'Lineup Calibrator',  icon: '🔧', route: '/tools/lineup-adjuster',   minTier: 'vector' },
    { key: 'backtester',        label: 'Accuracy Index',     icon: '📊', route: '/tools/backtester',        minTier: 'nexus' },
  ]

  const tierOrder = ['core', 'signal', 'analyst', 'vector', 'nexus']
  const tierIdx = tierOrder.indexOf(tier)

  const memberSince = wallet.created_at
    ? new Date(wallet.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A'

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '40px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{
                fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
                color: C.accentLight, letterSpacing: '2px', marginBottom: '8px',
              }}>
                MY ACCOUNT
              </div>
              <h1 style={{
                fontFamily: F.heading, fontSize: '36px', fontWeight: 900,
                margin: 0, lineHeight: 1,
              }}>
                SUBSCRIBER PORTAL
              </h1>
            </div>

            {/* Tier badge */}
            <div style={{
              background: C.surface2,
              border: `2px solid ${tierConfig?.color || C.accentLight}`,
              borderRadius: '16px', padding: '20px 28px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{tierConfig?.gem}</div>
              <div style={{
                fontFamily: F.heading, fontSize: '20px', fontWeight: 900,
                color: tierConfig?.color || C.accentLight, letterSpacing: '0.5px',
              }}>
                {tier.toUpperCase()}
              </div>
              <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>
                ${tierConfig?.priceMonthly}/month
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px' }}>

        {/* Subscription info */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '32px',
        }}>
          {[
            { label: 'STATUS',       value: wallet.subscription_status === 'active' ? 'Active' : (wallet.subscription_status ?? 'Inactive'), color: wallet.subscription_status === 'active' ? C.confirm : C.textMuted },
            { label: 'BILLING',      value: wallet.billing_cycle ? wallet.billing_cycle.charAt(0).toUpperCase() + wallet.billing_cycle.slice(1) : '—', color: C.signal },
            { label: 'TIER',         value: tier.charAt(0).toUpperCase() + tier.slice(1), color: tierConfig?.color || C.accentLight },
            { label: 'MEMBER SINCE', value: memberSince, color: C.textMuted },
          ].map(s => (
            <div key={s.label} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '14px', padding: '20px',
            }}>
              <div style={{
                fontSize: '11px', color: C.textMuted,
                letterSpacing: '1px', marginBottom: '8px', fontWeight: 700,
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: F.heading, fontSize: '22px', fontWeight: 900,
                color: s.color,
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          {/* Quick links */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '28px',
          }}>
            <h2 style={{
              fontFamily: F.heading, fontSize: '18px', fontWeight: 800,
              margin: '0 0 20px', letterSpacing: '0.5px',
            }}>
              QUICK ACCESS
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: "Today's Signals", icon: '📬', route: '/picks' },
                { label: 'Accuracy Index',  icon: '🏆', route: '/tracker' },
              ].map(link => (
                <a key={link.label} href={link.route} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: C.surface2, border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '14px 16px',
                  textDecoration: 'none', color: '#fff',
                  fontSize: '15px', fontWeight: 500,
                }}>
                  <span style={{ fontSize: '20px' }}>{link.icon}</span>
                  {link.label}
                  <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: '18px' }}>→</span>
                </a>
              ))}
            </div>

            <div style={{
              fontSize: '12px', color: C.textMuted,
              letterSpacing: '1px', fontWeight: 700, marginBottom: '12px',
            }}>
              ANALYTICS TOOLS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {toolLinks.map(tool => {
                const unlocked = tierIdx >= tierOrder.indexOf(tool.minTier)
                return (
                  <a key={tool.key} href={unlocked ? tool.route : `/join?tier=${tool.minTier}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: unlocked ? C.surface2 : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${unlocked ? C.border : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '10px', padding: '12px 16px',
                      textDecoration: 'none',
                      color: unlocked ? '#fff' : C.textMuted,
                      fontSize: '14px', fontWeight: 500,
                      opacity: unlocked ? 1 : 0.5,
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{tool.icon}</span>
                    <span style={{ flex: 1 }}>{tool.label}</span>
                    {unlocked
                      ? usageCounts[tool.key]
                        ? <span style={{ fontSize: '12px', color: C.accentLight }}>{usageCounts[tool.key]} runs</span>
                        : <span style={{ color: C.textMuted, fontSize: '18px' }}>→</span>
                      : <span style={{ fontSize: '11px', color: C.textMuted }}>🔒 {tool.minTier}</span>
                    }
                  </a>
                )
              })}
            </div>
          </div>

          {/* Tool usage this month */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '28px',
          }}>
            <h2 style={{
              fontFamily: F.heading, fontSize: '18px', fontWeight: 800,
              margin: '0 0 20px', letterSpacing: '0.5px',
            }}>
              THIS MONTH
            </h2>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '12px', marginBottom: '24px',
            }}>
              {[
                { label: 'Projections Run',  count: usageCounts['projection_runner'] || 0, color: C.accentLight },
                { label: 'Matchups Built',   count: usageCounts['matchup_builder']   || 0, color: C.accentLight },
                { label: 'Lineups Adjusted', count: usageCounts['lineup_adjuster']   || 0, color: C.accentLight },
                { label: 'Backtests Run',    count: usageCounts['backtester']        || 0, color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{
                  background: C.surface2, borderRadius: '12px',
                  padding: '16px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: F.heading, fontSize: '36px', fontWeight: 900,
                    color: s.count > 0 ? s.color : 'rgba(255,255,255,0.15)',
                  }}>
                    {s.count}
                  </div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {sessions.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '20px',
                color: C.textMuted, fontSize: '14px', lineHeight: 1.6,
              }}>
                No tool runs yet this month.
                {tierIdx >= 2 && (
                  <><br />
                    <a href="/tools" style={{ color: C.accentLight, textDecoration: 'none', fontWeight: 600 }}>
                      Open the lab →
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Saved analyses */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', padding: '28px', marginBottom: '24px',
        }}>
          <h2 style={{
            fontFamily: F.heading, fontSize: '18px', fontWeight: 800,
            margin: '0 0 20px', letterSpacing: '0.5px',
          }}>
            SAVED TO LAB
          </h2>

          {saved.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: '14px', lineHeight: 1.6 }}>
              No saved analyses yet.{' '}
              {tierIdx >= 2
                ? <a href="/tools/projection-runner" style={{ color: C.accentLight, textDecoration: 'none', fontWeight: 600 }}>Run a projection and save it →</a>
                : <span>Available from Analyst tier.</span>
              }
            </div>
          ) : (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 100px 80px 80px 80px 100px',
                padding: '8px 0', marginBottom: '8px',
                fontSize: '11px', fontWeight: 700,
                color: C.textMuted, letterSpacing: '1px',
                borderBottom: `1px solid ${C.border}`,
              }}>
                {['PLAYER', 'DATE', 'PTS', 'REB', 'AST', 'SAVED'].map(h => (
                  <div key={h}>{h}</div>
                ))}
              </div>
              {saved.map((s, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 100px 80px 80px 80px 100px',
                  padding: '12px 0', fontSize: '14px',
                  borderBottom: i < saved.length - 1
                    ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{ fontWeight: 500 }}>
                    {s.save_name || s.player_name || '—'}
                  </div>
                  <div style={{ color: C.textMuted, fontSize: '12px' }}>{s.game_date}</div>
                  <div style={{ color: C.confirm,     fontWeight: 700 }}>{s.output_proj_pts ?? '—'}</div>
                  <div style={{ color: C.signal,      fontWeight: 700 }}>{s.output_proj_reb ?? '—'}</div>
                  <div style={{ color: C.accentLight, fontWeight: 700 }}>{s.output_proj_ast ?? '—'}</div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manage membership */}
        <div style={{
          background: C.surface2,
          border: `1px solid ${C.border}`,
          borderRadius: '16px', padding: '28px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '20px',
        }}>
          <div>
            <h2 style={{
              fontFamily: F.heading, fontSize: '18px', fontWeight: 800,
              margin: '0 0 6px', letterSpacing: '0.5px',
            }}>
              MANAGE MEMBERSHIP
            </h2>
            <p style={{ color: C.textMuted, fontSize: '14px', margin: 0 }}>
              Update billing, upgrade tier, or cancel via the Stripe portal.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/join" style={{
              display: 'inline-block',
              background: C.accent, color: C.text,
              padding: '12px 24px', borderRadius: '8px',
              fontFamily: F.heading, fontWeight: 800,
              fontSize: '15px', letterSpacing: '0.5px',
              textDecoration: 'none',
            }}>
              UPGRADE TIER
            </a>
            <a
              href={wallet.stripe_customer_id
                ? `https://billing.stripe.com/p/login/test_placeholder`
                : '#'}
              style={{
                display: 'inline-block',
                background: 'transparent', color: C.textMuted,
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '12px 24px', borderRadius: '8px',
                fontFamily: F.heading, fontWeight: 700,
                fontSize: '15px', letterSpacing: '0.5px',
                textDecoration: 'none',
              }}
            >
              BILLING PORTAL
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
