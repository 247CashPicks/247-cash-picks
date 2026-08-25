import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { sessionTier, OPERATOR_TIER } from '@/lib/auth/guards'
import { canAccess } from '@/lib/picks/tiers'
import { BRAND } from '@/config/brand'
import { statLabel } from '@/lib/picks/stats'
import { getSport } from '@/lib/sport/server'
import type { Sport } from '@/lib/sport'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts


// Both halves of the operator loop: what is staged and awaiting a decision,
// and what has been confirmed and is ready to transmit.
//
// No `game_date = today` filter. NFL stages a whole week at once (a Week 1 run
// writes 09-09 through 09-14), so a same-day filter showed an empty queue on
// five days out of six while selections sat waiting. Bounded below by today
// instead, so settled past slates do not accumulate in the queue.
async function getSelections(sport: Sport) {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('picks_selections')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .gte('game_date', today)
    .in('status', ['pending', 'confirmed'])
    .order('game_date', { ascending: true })
    .order('display_order', { ascending: true })

  const rows = data || []
  return {
    pending: rows.filter(r => r.status === 'pending'),
    picks:   rows.filter(r => r.status === 'confirmed'),
  }
}

export default async function PublishPage() {
  // This page had no auth() at ALL — not even the login check the recon
  // credited to middleware. Middleware does protect /dashboard/*, so it was
  // not anonymous in practice, but the page asserted nothing itself and the
  // publish button posts to an operator endpoint.
  const { userId, tier } = await sessionTier()
  if (!userId) redirect('/sign-in')
  if (!canAccess(tier, OPERATOR_TIER)) redirect('/tools')

  const sport = await getSport()
  const { pending, picks } = await getSelections(sport)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

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
          <div style={{
            maxWidth: '900px', margin: '0 auto',
            display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          }}>
            <a href="/dashboard" style={{ fontFamily: F.mono, fontSize: '12px', color: C.muted, letterSpacing: '0.08em' }}>
              ← DASHBOARD
            </a>
            <span style={{ color: C.border }}>|</span>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em' }}>
              // TRANSMIT SIGNALS
            </div>
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginLeft: 'auto' }}>
              {today.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(28px,3vw,44px) clamp(24px,4vw,48px)' }}>

          {picks.length === 0 ? (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '64px', textAlign: 'center' }}>
              <div style={{
                fontFamily: F.mono, fontSize: '12px', color: C.dim,
                letterSpacing: '0.12em', marginBottom: '16px',
              }}>
                [ NO SIGNALS QUEUED ]
              </div>
              <h2 style={{
                fontFamily: F.sans, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 500,
                color: C.platinum, margin: '0 0 10px', letterSpacing: '-0.02em',
              }}>
                NO SIGNALS QUEUED
              </h2>
              <p style={{ fontFamily: F.mono, color: C.muted, fontSize: '13px', margin: '0 0 24px', lineHeight: 1.6 }}>
                Confirm signals in the dashboard before transmitting.
              </p>
              <a href="/dashboard" style={{
                display: 'inline-block', background: C.signalCyan, color: C.void,
                padding: '11px 24px', fontFamily: F.mono, fontWeight: 500,
                fontSize: '12px', letterSpacing: '0.12em',
              }}>
                ← BACK TO DASHBOARD
              </a>
            </div>
          ) : (
            <>
              {/* Warning */}
              <div style={{
                background: 'rgba(232,163,61,0.05)',
                border: '1px solid rgba(232,163,61,0.3)',
                padding: '16px 20px', marginBottom: '24px',
                fontFamily: F.sans, fontSize: '14px', color: C.flagAmber,
                lineHeight: 1.6, display: 'flex', gap: '12px', alignItems: 'flex-start',
              }}>
                <span style={{ fontFamily: F.mono, fontSize: '13px', flexShrink: 0, letterSpacing: '0.08em' }}>
                  [!]
                </span>
                <div>
                  <strong>Review carefully before transmitting.</strong> Once transmitted,
                  signals are sent to all qualifying subscribers via dashboard, SMS, and email.
                  This action cannot be undone.
                </div>
              </div>

              {/* ── Staged, awaiting the operator's decision ─────────────
                  A selection the backend selector wrote sits at status
                  'pending' until a human confirms it. picks_publisher only
                  ever promotes 'confirmed', so without this queue an NFL slate
                  staged itself and then stopped, with nothing in the UI able
                  to move it forward. */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{
                  padding: '14px 24px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.flagAmber, letterSpacing: '0.12em' }}>
                    // {pending.length} STAGED · AWAITING CONFIRMATION
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
                    {sport}
                  </span>
                </div>

                {pending.length === 0 ? (
                  <div style={{ padding: '32px 24px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
                    Nothing staged for an upcoming {sport} slate.<br />
                    Run the selector to stage selections.
                  </div>
                ) : pending.map((pick, i) => (
                  <div key={pick.id} style={{
                    padding: '16px 24px',
                    borderBottom: i < pending.length - 1 ? `1px solid ${C.border}` : 'none',
                    display: 'grid',
                    gridTemplateColumns: '2fr 90px 90px 90px 80px 90px 90px 110px',
                    alignItems: 'center', gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
                        {pick.player_name}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, marginTop: '2px' }}>
                        {pick.team} · {pick.platform}
                      </div>
                    </div>

                    {/* game_date — an NFL queue spans several dates at once, so
                        the row is meaningless without it */}
                    <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, letterSpacing: '0.04em' }}>
                      {pick.game_date}
                    </div>

                    <div style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 500, color: C.platinum, letterSpacing: '0.06em' }}>
                      {statLabel(pick.stat_type ?? '')}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: F.mono, fontSize: '16px', fontWeight: 500,
                        color: pick.direction === 'over' ? C.signalCyan : C.platinum,
                      }}>
                        {pick.direction?.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>
                        LINE: {pick.line}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
                        {pick.our_projection}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>PROJ</div>
                    </div>

                    {/* edge_pct — the single number the confirm/skip call turns on */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: F.mono, fontWeight: 500, fontSize: '15px',
                        color: pick.edge_pct == null ? C.muted
                          : pick.edge_pct >= 10 ? C.signalCyan
                          : pick.edge_pct > 0 ? C.platinum : C.flagAmber,
                      }}>
                        {pick.edge_pct == null
                          ? '—'
                          : `${pick.edge_pct > 0 ? '+' : ''}${Number(pick.edge_pct).toFixed(1)}%`}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>EDGE</div>
                    </div>

                    <div style={{
                      textAlign: 'center', padding: '5px 8px',
                      border: `1px solid ${pick.confidence === 'high' ? C.borderEmphasis : C.border}`,
                      fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                      color: pick.confidence === 'high' ? C.signalCyan : C.platinum,
                    }}>
                      {pick.confidence}
                    </div>

                    <form action="/api/picks" method="POST" style={{ textAlign: 'right' }}>
                      <input type="hidden" name="action" value="confirm" />
                      <input type="hidden" name="selection_id" value={pick.id} />
                      <button type="submit" style={{
                        fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.1em',
                        padding: '7px 14px', cursor: 'pointer',
                        background: 'transparent', color: C.signalCyan,
                        border: `1px solid ${C.borderEmphasis}`,
                      }}>
                        CONFIRM
                      </button>
                    </form>
                  </div>
                ))}
              </div>

              {/* Signals to transmit */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{
                  padding: '14px 24px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em' }}>
                    // {picks.length} SIGNAL{picks.length !== 1 ? 'S' : ''} TO TRANSMIT
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
                    SORTED BY DISPLAY ORDER
                  </span>
                </div>

                {picks.map((pick, i) => (
                  <div key={pick.id} style={{
                    padding: '18px 24px',
                    borderBottom: i < picks.length - 1 ? `1px solid ${C.border}` : 'none',
                    display: 'grid',
                    gridTemplateColumns: '2fr 90px 80px 100px 80px 90px 100px 80px',
                    alignItems: 'center', gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
                        {pick.player_name}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, marginTop: '2px' }}>
                        {pick.team} · {pick.platform}
                      </div>
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, letterSpacing: '0.04em' }}>
                      {pick.game_date}
                    </div>
                    <div style={{
                      fontFamily: F.mono, fontSize: '15px', fontWeight: 500,
                      color: C.platinum,
                      letterSpacing: '0.06em',
                    }}>
                      {statLabel(pick.stat_type ?? '')}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: F.mono, fontSize: '20px', fontWeight: 500,
                        color: pick.direction === 'over' ? C.signalCyan : C.platinum,
                        letterSpacing: '0.04em',
                      }}>
                        {pick.direction?.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>
                        LINE: {pick.line}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
                        {pick.our_projection}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>PROJ</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: F.mono, fontWeight: 500, fontSize: '15px',
                        color: pick.edge_pct == null ? C.muted
                          : pick.edge_pct >= 10 ? C.signalCyan
                          : pick.edge_pct > 0 ? C.platinum : C.flagAmber,
                      }}>
                        {pick.edge_pct == null
                          ? '—'
                          : `${pick.edge_pct > 0 ? '+' : ''}${Number(pick.edge_pct).toFixed(1)}%`}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '2px' }}>EDGE</div>
                    </div>
                    <div style={{
                      textAlign: 'center', padding: '5px 8px',
                      border: `1px solid ${pick.confidence === 'high' ? C.borderEmphasis : C.border}`,
                      fontFamily: F.mono, fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em',
                      color: pick.confidence === 'high' ? C.signalCyan : C.platinum,
                      textTransform: 'uppercase' as const,
                    }}>
                      {pick.confidence}
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, textAlign: 'right', letterSpacing: '0.06em' }}>
                      {pick.tier_required}+
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery summary */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`,
                padding: '18px 24px', marginBottom: '24px',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '12px' }}>
                  // DELIVERY CHANNELS
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {[
                    { tag: 'DASH',  label: 'Subscriber dashboard (all tiers)' },
                    { tag: 'SMS',   label: 'SMS — Twilio (all tiers)' },
                    { tag: 'MAIL',  label: 'Email digest — Resend (all tiers)' },
                    { tag: 'POST',  label: 'Herald social post (Instagram + Twitter)' },
                  ].map(d => (
                    <div key={d.tag} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontFamily: F.mono, fontSize: '10px', color: C.signalCyan,
                        border: `1px solid ${C.borderEmphasis}`, padding: '2px 6px', letterSpacing: '0.08em',
                      }}>
                        {d.tag}
                      </span>
                      <span style={{ fontFamily: F.sans, fontSize: '13px', color: C.muted }}>
                        {d.label}
                      </span>
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
                    width: '100%', background: C.signalCyan, color: C.void,
                    border: 'none', padding: '20px',
                    fontFamily: F.mono, fontWeight: 500, fontSize: 'clamp(16px,2vw,22px)',
                    letterSpacing: '0.12em', cursor: 'pointer',
                  }}
                >
                  TRANSMIT ALL SIGNALS NOW →
                </button>
                <p style={{
                  textAlign: 'center', fontFamily: F.mono, fontSize: '11px',
                  color: C.faint, margin: '10px 0 0', lineHeight: 1.6, letterSpacing: '0.04em',
                }}>
                  Signals will be immediately visible to all qualifying subscribers.
                  Herald and Messenger will fire automatically.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
