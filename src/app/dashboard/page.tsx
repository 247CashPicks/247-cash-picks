import { redirect } from 'next/navigation'
import { sessionTier, OPERATOR_TIER } from '@/lib/auth/guards'
import { canAccess } from '@/lib/picks/tiers'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'
import { statLabel, PROJECTION_COLUMNS } from '@/lib/picks/stats'
import { getSport } from '@/lib/sport/server'
import type { Sport } from '@/lib/sport'
import AgentPipeline from './AgentPipeline'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts


async function getDashboardData(sport: Sport) {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [projectionsRes, selectionsRes, linesRes] = await Promise.all([
    supabase
      .from('picks_projections')
      .select('*')
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .eq('game_date', today)
      .order('confidence_score', { ascending: false }),

    supabase
      .from('picks_selections')
      .select('*')
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .eq('game_date', today)
      .in('status', ['pending', 'confirmed'])
      .order('display_order', { ascending: true }),

    supabase
      .from('picks_lines')
      .select('player_name, stat_type, line, platform, edge_pct, recommended_side')
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
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
  { key: 'scout',     label: 'Scout',     time: '6:00 AM ET',  glyph: '◈' },
  { key: 'stats',     label: 'Stats',     time: '8:00 AM ET',  glyph: 'Σ' },
  { key: 'matchup',   label: 'Matchup',   time: '9:00 AM ET',  glyph: '⬡' },
  { key: 'defense',   label: 'Defense',   time: '9:30 AM ET',  glyph: '◉' },
  { key: 'projector', label: 'Projector', time: '10:00 AM ET', glyph: '◆' },
  { key: 'lines',     label: 'Lines',     time: '2:00 PM ET',  glyph: '↗' },
  { key: 'selector',  label: 'Selector',  time: '2:30 PM ET',  glyph: '›' },
]

export default async function DashboardPage() {
  // Was login-only: ANY signed-in member, including a free-tier account,
  // could read the operator command centre — the full unpublished slate,
  // every projection and line before it is released to paying tiers.
  const { userId, tier } = await sessionTier()
  if (!userId) redirect('/sign-in')
  if (!canAccess(tier, OPERATOR_TIER)) redirect('/tools')

  const sport = await getSport()
  const { projections, selections, lines } = await getDashboardData(sport)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // The headline line for each player, i.e. the one the EDGE column reports.
  //
  // This used to be a `${player}_pts` lookup. NBA has a canonical headline
  // stat, so that worked there — and can never match under NFL, where no
  // 'pts' line exists and the column would read '—' for every row.
  //
  // NBA keeps the pts line, so nothing an operator is used to changes. NFL has
  // no single headline stat (a WR's is rec_yds, a RB's rush_yds), so it shows
  // the strongest edge available for that player, which is the one worth
  // acting on.
  const headline = new Map<string, typeof lines[number]>()
  for (const l of lines) {
    if (sport === 'NBA') {
      if (l.stat_type === 'pts') headline.set(l.player_name, l)
      continue
    }
    const held = headline.get(l.player_name)
    const better = held == null
      || Math.abs(l.edge_pct ?? 0) > Math.abs(held.edge_pct ?? 0)
    if (better) headline.set(l.player_name, l)
  }

  const cols = PROJECTION_COLUMNS[sport]
  // Header and body share one template so they cannot drift as the column
  // count changes between sports (4 for NBA, 5 for NFL).
  const grid = `2fr 60px ${cols.map(() => '80px').join(' ')} 80px 90px`

  const pendingCount   = selections.filter(s => s.status === 'pending').length
  const confirmedCount = selections.filter(s => s.status === 'confirmed').length

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
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '10px' }}>
                // OPERATOR COMMAND CENTER
              </div>
              <h1 style={{
                fontFamily: F.sans, fontSize: 'clamp(18px,2.2vw,26px)', fontWeight: 500,
                color: C.platinum, margin: '0 0 6px', lineHeight: 1, letterSpacing: '-0.03em',
              }}>
                {today.toUpperCase()}
              </h1>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
                {'> dashboard --operator=true --live=true'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: F.mono, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 500, color: C.platinum, lineHeight: 1 }}>
                  {projections.length}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, marginTop: '4px', letterSpacing: '0.08em' }}>PROJECTIONS</div>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: F.mono, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 500, color: confirmedCount > 0 ? C.signalCyan : C.muted, lineHeight: 1 }}>
                  {confirmedCount}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, marginTop: '4px', letterSpacing: '0.08em' }}>READY TO TRANSMIT</div>
              </div>
              {confirmedCount > 0 && (
                <a href="/dashboard/publish" style={{
                  display: 'inline-block', background: C.signalCyan, color: C.void,
                  padding: '12px 24px', fontFamily: F.mono, fontWeight: 500,
                  fontSize: '13px', letterSpacing: '0.12em',
                }}>
                  TRANSMIT {confirmedCount} SIGNAL{confirmedCount !== 1 ? 'S' : ''} →
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(24px,2.5vw,36px) clamp(24px,4vw,48px)' }}>

          <AgentPipeline agents={AGENTS} />

          <div className="dashboard-layout">

            {/* Projections table */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{
                padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em' }}>
                  // TODAY&apos;S PROJECTIONS
                </div>
                <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
                  {projections.length} PLAYERS — SORTED BY EDGE
                </span>
              </div>

              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: grid,
                padding: '9px 20px', borderBottom: `1px solid ${C.border}`,
                fontFamily: F.mono, fontSize: '10px', fontWeight: 500,
                color: C.dim, letterSpacing: '0.1em',
              }}>
                {['PLAYER', 'POS', ...cols.map(c => c.label), 'EDGE', 'ACTION'].map(h => (
                  <div key={h}>{h}</div>
                ))}
              </div>

              {projections.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
                  No projections yet today.<br />
                  Run the Scout agent at 6 AM to begin the pipeline.
                </div>
              ) : (
                projections.map((p, i) => {
                  const lineData = headline.get(p.player_name)
                  const edgePct  = lineData?.edge_pct
                  const edgeColor = edgePct != null
                    ? edgePct >= 10 ? C.signalCyan
                    : edgePct >= 5  ? C.platinum
                    : edgePct < 0   ? C.flagAmber
                    : C.muted
                    : C.muted

                  return (
                    <div key={p.id} style={{
                      display: 'grid',
                      gridTemplateColumns: grid,
                      padding: '11px 20px',
                      borderBottom: i < projections.length - 1 ? `1px solid ${C.border}` : 'none',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '13px', color: C.platinum }}>
                          {p.player_name}
                        </div>
                        <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim }}>
                          {p.team} · {p.is_starter ? 'Starter' : 'Bench'}
                        </div>
                      </div>
                      <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px' }}>{p.position || '—'}</div>
                      {cols.map((c, ci) => {
                        const v = (p as Record<string, unknown>)[c.key]
                        return (
                          <div key={c.key} style={{
                            fontFamily: F.mono, fontWeight: 500, fontSize: '13px',
                            color: ci === 0 ? C.platinum
                              : ci === 1 ? C.signalCyan
                              : ci === 2 ? C.platinum : C.muted,
                          }}>
                            {typeof v === 'number' ? v.toFixed(c.digits) : '—'}
                          </div>
                        )
                      })}
                      <div style={{ fontFamily: F.mono, color: edgeColor, fontWeight: 500, fontSize: '12px' }}>
                        {edgePct != null ? `${edgePct > 0 ? '+' : ''}${edgePct.toFixed(1)}%` : '—'}
                      </div>
                      <div>
                        <form action="/api/picks" method="POST">
                          <input type="hidden" name="player_name"   value={p.player_name} />
                          <input type="hidden" name="projection_id" value={p.id} />
                          <button
                            type="submit"
                            style={{
                              background: 'transparent', border: `1px solid ${C.borderEmphasis}`,
                              padding: '5px 10px', color: C.signalCyan,
                              fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                              letterSpacing: '0.08em', cursor: 'pointer',
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
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '4px' }}>
                  // SIGNAL QUEUE
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
                  {pendingCount} PENDING · {confirmedCount} CONFIRMED
                </div>
              </div>

              {selections.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
                  No signals queued yet.<br />
                  Add signals from the projections table.
                </div>
              ) : (
                <div>
                  {selections.map((s, i) => (
                    <div key={s.id} style={{
                      padding: '14px 20px',
                      borderBottom: i < selections.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '14px', color: C.platinum }}>
                          {s.player_name}
                        </div>
                        <span style={{
                          fontFamily: F.mono, fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em',
                          color: s.status === 'confirmed' ? C.signalCyan : C.flagAmber,
                          border: `1px solid ${s.status === 'confirmed' ? C.borderEmphasis : 'rgba(232,163,61,0.3)'}`,
                          padding: '2px 8px',
                          textTransform: 'uppercase' as const,
                        }}>
                          {s.status}
                        </span>
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, marginBottom: '8px', letterSpacing: '0.04em' }}>
                        {statLabel(s.stat_type ?? '')} {s.direction?.toUpperCase()} {s.line}
                        {' · '}{s.platform}
                        {s.edge_pct && (
                          <span style={{ color: C.signalCyan, fontWeight: 500 }}>
                            {' '}(+{s.edge_pct.toFixed(1)}% edge)
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          fontFamily: F.mono, fontSize: '10px', color: C.dim,
                          border: `1px solid ${C.border}`, padding: '2px 8px',
                          textTransform: 'capitalize' as const, letterSpacing: '0.06em',
                        }}>
                          {s.confidence}
                        </span>
                        <span style={{
                          fontFamily: F.mono, fontSize: '10px', color: C.dim,
                          border: `1px solid ${C.border}`, padding: '2px 8px',
                          letterSpacing: '0.06em',
                        }}>
                          {s.tier_required}+
                        </span>
                      </div>
                    </div>
                  ))}

                  {confirmedCount > 0 && (
                    <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
                      <a href="/dashboard/publish" style={{
                        display: 'block', textAlign: 'center',
                        background: C.signalCyan, color: C.void,
                        padding: '12px', fontFamily: F.mono, fontWeight: 500,
                        fontSize: '13px', letterSpacing: '0.12em',
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
    </div>
  )
}
