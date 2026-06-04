import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts

async function getConfirmedPicks() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('picks_selections')
    .select('*')
    .eq('brand_id', '247cashpicks')
    .eq('game_date', today)
    .eq('status', 'confirmed')
    .order('display_order', { ascending: true })
  return data || []
}

export default async function PublishPage() {
  const picks = await getConfirmedPicks()
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '28px 40px',
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        }}>
          <a href="/dashboard" style={{ color: C.textMuted, textDecoration: 'none', fontSize: '14px' }}>
            ← Dashboard
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <h1 style={{
            fontFamily: F.heading, fontSize: '28px', fontWeight: 900,
            margin: 0, color: C.accent, letterSpacing: '0.5px',
          }}>
            TRANSMIT SIGNALS
          </h1>
          <span style={{ fontSize: '14px', color: C.textMuted }}>{today}</span>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px' }}>

        {picks.length === 0 ? (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '64px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
            <h2 style={{
              fontFamily: F.heading, fontSize: '28px', fontWeight: 800,
              margin: '0 0 12px',
            }}>
              NO SIGNALS QUEUED
            </h2>
            <p style={{ color: C.textMuted, fontSize: '16px', margin: '0 0 24px' }}>
              Confirm signals in the dashboard before transmitting.
            </p>
            <a href="/dashboard" style={{
              display: 'inline-block', background: C.accent, color: C.text,
              padding: '12px 28px', borderRadius: '8px',
              fontFamily: F.heading, fontWeight: 800,
              fontSize: '15px', letterSpacing: '0.5px',
              textDecoration: 'none',
            }}>
              ← BACK TO DASHBOARD
            </a>
          </div>
        ) : (
          <>
            {/* Warning */}
            <div style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '12px', padding: '16px 20px',
              marginBottom: '28px', fontSize: '14px',
              color: C.caution, lineHeight: 1.6,
              display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
              <div>
                <strong>Review carefully before transmitting.</strong> Once transmitted,
                signals are sent to all qualifying subscribers via dashboard, SMS, and email.
                This action cannot be undone.
              </div>
            </div>

            {/* Signals review */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '16px', overflow: 'hidden', marginBottom: '28px',
            }}>
              <div style={{
                padding: '16px 24px', borderBottom: `1px solid ${C.border}`,
                background: C.surface2, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
                  letterSpacing: '0.5px',
                }}>
                  {picks.length} SIGNAL{picks.length !== 1 ? 'S' : ''} TO TRANSMIT
                </span>
                <span style={{ fontSize: '13px', color: C.textMuted }}>
                  Sorted by display order
                </span>
              </div>

              {picks.map((pick, i) => (
                <div key={pick.id} style={{
                  padding: '20px 24px',
                  borderBottom: i < picks.length - 1
                    ? `1px solid rgba(255,255,255,0.05)` : 'none',
                  display: 'grid',
                  gridTemplateColumns: '2fr 80px 100px 80px 100px 80px',
                  alignItems: 'center', gap: '12px',
                  fontSize: '14px',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{pick.player_name}</div>
                    <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
                      {pick.team} · {pick.platform}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: F.heading, fontSize: '18px', fontWeight: 800,
                    color: pick.stat_type === 'pts' ? C.confirm
                      : pick.stat_type === 'reb' ? C.signal : C.accentLight,
                  }}>
                    {pick.stat_type?.toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: F.heading, fontSize: '24px', fontWeight: 900,
                      color: pick.direction === 'over' ? C.confirm : C.signal,
                    }}>
                      {pick.direction?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: C.textMuted }}>Line: {pick.line}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{pick.our_projection}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted }}>Projection</div>
                  </div>
                  <div style={{
                    textAlign: 'center', padding: '6px 10px',
                    background: pick.confidence === 'high'
                      ? 'rgba(52,211,153,0.1)' : 'rgba(56,189,248,0.08)',
                    border: `1px solid ${pick.confidence === 'high'
                      ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.2)'}`,
                    borderRadius: '8px',
                    fontSize: '12px', fontWeight: 700,
                    color: pick.confidence === 'high' ? C.confirm : C.signal,
                    textTransform: 'uppercase' as const,
                  }}>
                    {pick.confidence}
                  </div>
                  <div style={{
                    fontSize: '11px', color: C.textMuted,
                    textAlign: 'right',
                  }}>
                    {pick.tier_required}+
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery summary */}
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: '14px', padding: '20px 24px',
              marginBottom: '28px', fontSize: '14px',
              color: C.textMuted, lineHeight: 1.8,
            }}>
              <div style={{
                fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
                color: '#fff', letterSpacing: '0.5px', marginBottom: '10px',
              }}>
                DELIVERY CHANNELS
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {[
                  { icon: '📱', label: 'Subscriber dashboard (all tiers)' },
                  { icon: '📲', label: 'SMS — Twilio (all tiers)' },
                  { icon: '📧', label: 'Email digest — Resend (all tiers)' },
                  { icon: '📣', label: 'Herald social post (Instagram + Twitter)' },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{d.icon}</span>
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transmit form */}
            <form action="/api/picks" method="POST">
              <input type="hidden" name="action" value="publish_all" />
              <input type="hidden" name="date"   value={new Date().toISOString().split('T')[0]} />
              <button
                type="submit"
                style={{
                  width: '100%', background: C.accent, color: C.text,
                  border: 'none', padding: '20px', borderRadius: '12px',
                  fontFamily: F.heading, fontWeight: 900, fontSize: '24px',
                  letterSpacing: '1px', cursor: 'pointer',
                  boxShadow: '0 0 48px rgba(109,40,217,0.35)',
                }}
              >
                ⚡ TRANSMIT ALL SIGNALS NOW
              </button>
              <p style={{
                textAlign: 'center', fontSize: '13px',
                color: C.textMuted, margin: '12px 0 0',
              }}>
                Signals will be immediately visible to all qualifying subscribers.
                Herald and Messenger will fire automatically.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
