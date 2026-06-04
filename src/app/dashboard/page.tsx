import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts

async function getDashboardData() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [projectionsRes, selectionsRes, linesRes] = await Promise.all([
    supabase
      .from('picks_projections')
      .select('*')
      .eq('brand_id', BRAND.slug)
      .eq('game_date', today)
      .order('confidence_score', { ascending: false }),

    supabase
      .from('picks_selections')
      .select('*')
      .eq('brand_id', BRAND.slug)
      .eq('game_date', today)
      .in('status', ['pending', 'confirmed'])
      .order('display_order', { ascending: true }),

    supabase
      .from('picks_lines')
      .select('player_name, stat_type, line, platform, edge_pct, recommended_side')
      .eq('brand_id', BRAND.slug)
      .eq('game_date', today)
      .order('edge_pct', { ascending: false }),
  ])

  return {
    projections: projectionsRes.data || [],
    selections:  selectionsRes.data  || [],
    lines:       linesRes.data       || [],
  }
}

const AGENTS = [
  { key: 'scout',     label: 'Scout',     icon: '🔍', time: '6:00 AM ET' },
  { key: 'stats',     label: 'Stats',     icon: '📊', time: '8:00 AM ET' },
  { key: 'matchup',   label: 'Matchup',   icon: '🔀', time: '9:00 AM ET' },
  { key: 'defense',   label: 'Defense',   icon: '🛡',  time: '9:30 AM ET' },
  { key: 'projector', label: 'Projector', icon: '⚡', time: '10:00 AM ET' },
  { key: 'lines',     label: 'Lines',     icon: '📈', time: '2:00 PM ET' },
  { key: 'selector',  label: 'Selector',  icon: '✓',  time: '2:30 PM ET' },
]

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projections, selections, lines } = await getDashboardData()
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const lineMap = new Map(
    lines.map(l => [`${l.player_name}_${l.stat_type}`, l])
  )

  const pendingCount   = selections.filter(s => s.status === 'pending').length
  const confirmedCount = selections.filter(s => s.status === 'confirmed').length

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '28px 40px',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '2px', marginBottom: '6px',
            }}>
              OPERATOR COMMAND CENTER
            </div>
            <h1 style={{
              fontFamily: F.heading, fontSize: '32px', fontWeight: 900,
              margin: 0, lineHeight: 1,
            }}>
              {today}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 20px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: F.heading, fontSize: '24px', fontWeight: 900, color: C.accentLight }}>
                {projections.length}
              </div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>Projections</div>
            </div>
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 20px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: F.heading, fontSize: '24px', fontWeight: 900, color: C.caution }}>
                {confirmedCount}
              </div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>Ready to Transmit</div>
            </div>
            {confirmedCount > 0 && (
              <a href="/dashboard/publish" style={{
                display: 'inline-block', background: C.accent, color: C.text,
                padding: '12px 28px', borderRadius: '8px',
                fontFamily: F.heading, fontWeight: 800, fontSize: '16px',
                letterSpacing: '0.5px', textDecoration: 'none',
                boxShadow: '0 0 24px rgba(109,40,217,0.3)',
              }}>
                TRANSMIT {confirmedCount} SIGNAL{confirmedCount !== 1 ? 'S' : ''} →
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 40px' }}>

        {/* Agent pipeline status */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', padding: '24px', marginBottom: '28px',
        }}>
          <div style={{
            fontFamily: F.heading, fontSize: '15px', fontWeight: 800,
            color: C.accentLight, letterSpacing: '1px', marginBottom: '16px',
          }}>
            AGENT PIPELINE
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
          }}>
            {AGENTS.map((agent) => (
              <div key={agent.key} style={{
                background: C.surface2, borderRadius: '10px',
                padding: '14px 10px', textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{agent.icon}</div>
                <div style={{
                  fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
                  marginBottom: '4px', color: '#fff',
                }}>
                  {agent.label.toUpperCase()}
                </div>
                <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '8px' }}>
                  {agent.time}
                </div>
                <a
                  href={`/api/cron/${agent.key}`}
                  style={{
                    display: 'block', background: 'rgba(167,139,250,0.1)',
                    border: `1px solid rgba(167,139,250,0.2)`,
                    borderRadius: '6px', padding: '5px 0',
                    fontSize: '11px', color: C.accentLight,
                    fontWeight: 700, textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  RUN
                </a>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>

          {/* Projections table */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.surface2,
            }}>
              <span style={{
                fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
                letterSpacing: '0.5px',
              }}>
                TODAY&apos;S PROJECTIONS
              </span>
              <span style={{ fontSize: '13px', color: C.textMuted }}>
                {projections.length} players — sorted by edge
              </span>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 60px 70px 70px 70px 80px 80px 90px',
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: `1px solid ${C.border}`,
              fontSize: '10px', fontWeight: 700,
              color: C.textMuted, letterSpacing: '1px',
            }}>
              {['PLAYER', 'POS', 'MIN', 'PTS', 'REB', 'AST', 'EDGE', 'ACTION'].map(h => (
                <div key={h}>{h}</div>
              ))}
            </div>

            {projections.length === 0 ? (
              <div style={{
                padding: '48px', textAlign: 'center',
                color: C.textMuted, fontSize: '15px', lineHeight: 1.7,
              }}>
                No projections yet today.<br />
                Run the Scout agent at 6 AM to begin the pipeline.
              </div>
            ) : (
              projections.map((p, i) => {
                const lineData = lineMap.get(`${p.player_name}_pts`)
                const edgePct  = lineData?.edge_pct
                const edgeColor = edgePct
                  ? edgePct >= 10 ? C.confirm
                  : edgePct >= 5  ? C.signal
                  : C.textMuted
                  : C.textMuted

                return (
                  <div key={p.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 60px 70px 70px 70px 80px 80px 90px',
                    padding: '12px 20px',
                    borderBottom: i < projections.length - 1
                      ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    alignItems: 'center', fontSize: '13px',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.player_name}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted }}>
                        {p.team} · {p.is_starter ? 'Starter' : 'Bench'}
                      </div>
                    </div>
                    <div style={{ color: C.textMuted, fontSize: '12px' }}>{p.position || '—'}</div>
                    <div style={{ fontWeight: 600 }}>{p.projected_minutes?.toFixed(0) || '—'}</div>
                    <div style={{ color: C.confirm,     fontWeight: 700 }}>{p.proj_pts?.toFixed(1) || '—'}</div>
                    <div style={{ color: C.signal,      fontWeight: 700 }}>{p.proj_reb?.toFixed(1) || '—'}</div>
                    <div style={{ color: C.accentLight, fontWeight: 700 }}>{p.proj_ast?.toFixed(1) || '—'}</div>
                    <div style={{ color: edgeColor, fontWeight: 700, fontSize: '12px' }}>
                      {edgePct ? `${edgePct > 0 ? '+' : ''}${edgePct.toFixed(1)}%` : '—'}
                    </div>
                    <div>
                      <form action="/api/picks" method="POST">
                        <input type="hidden" name="player_name"    value={p.player_name} />
                        <input type="hidden" name="projection_id"  value={p.id} />
                        <button
                          type="submit"
                          style={{
                            background: 'rgba(167,139,250,0.1)',
                            border: `1px solid rgba(167,139,250,0.25)`,
                            borderRadius: '6px', padding: '5px 10px',
                            color: C.accentLight, fontSize: '11px',
                            fontWeight: 700, cursor: 'pointer',
                            fontFamily: F.body,
                          }}
                        >
                          + ADD
                        </button>
                      </form>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Signal queue */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
              background: C.surface2,
            }}>
              <div style={{
                fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
                letterSpacing: '0.5px', marginBottom: '4px',
              }}>
                SIGNAL QUEUE
              </div>
              <div style={{ fontSize: '12px', color: C.textMuted }}>
                {pendingCount} pending · {confirmedCount} confirmed
              </div>
            </div>

            {selections.length === 0 ? (
              <div style={{
                padding: '32px 20px', textAlign: 'center',
                color: C.textMuted, fontSize: '14px', lineHeight: 1.7,
              }}>
                No signals queued yet.<br />
                Add signals from the projections table.
              </div>
            ) : (
              <div>
                {selections.map((s, i) => (
                  <div key={s.id} style={{
                    padding: '14px 20px',
                    borderBottom: i < selections.length - 1
                      ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: '6px',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.player_name}</div>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
                        color: s.status === 'confirmed' ? C.confirm : C.caution,
                        background: s.status === 'confirmed'
                          ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                        border: `1px solid ${s.status === 'confirmed'
                          ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}`,
                        borderRadius: '4px', padding: '2px 8px',
                        textTransform: 'uppercase' as const,
                      }}>
                        {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px' }}>
                      {s.stat_type?.toUpperCase()} {s.direction?.toUpperCase()} {s.line}
                      {' · '}{s.platform}
                      {s.edge_pct && (
                        <span style={{ color: C.confirm, fontWeight: 600 }}>
                          {' '}(+{s.edge_pct.toFixed(1)}% edge)
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px', color: C.textMuted,
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px', padding: '2px 8px',
                        textTransform: 'capitalize' as const,
                      }}>
                        {s.confidence}
                      </span>
                      <span style={{
                        fontSize: '10px', color: C.textMuted,
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px', padding: '2px 8px',
                      }}>
                        {s.tier_required}+
                      </span>
                    </div>
                  </div>
                ))}

                {confirmedCount > 0 && (
                  <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
                    <a href="/dashboard/publish" style={{
                      display: 'block', textAlign: 'center',
                      background: C.accent, color: C.text,
                      padding: '12px', borderRadius: '8px',
                      fontFamily: F.heading, fontWeight: 800,
                      fontSize: '16px', letterSpacing: '0.5px',
                      textDecoration: 'none',
                    }}>
                      TRANSMIT {confirmedCount} SIGNAL{confirmedCount !== 1 ? 'S' : ''} →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
