import { BRAND } from '@/config/brand'
import { NAV_LINKS as navLinks } from '@/components/nav/links'

const C = BRAND.colors
const F = BRAND.fonts

const projections = [
  { player: 'Luka Dončić',   team: 'LAL', stat: 'PTS', proj: 31.4, line: 28.5, edge: +2.9 },
  { player: 'Nikola Jokić',  team: 'DEN', stat: 'REB', proj: 13.2, line: 11.5, edge: +1.7 },
  { player: 'SGA',           team: 'OKC', stat: 'PTS', proj: 28.9, line: 31.5, edge: -2.6 },
  { player: 'Jayson Tatum',  team: 'BOS', stat: 'AST', proj:  5.8, line:  4.5, edge: +1.3 },
  { player: 'Giannis A.',    team: 'MIL', stat: 'REB', proj: 11.6, line: 10.5, edge: +1.1 },
  { player: 'Anthony Davis', team: 'LAL', stat: 'BLK', proj:  2.4, line:  1.5, edge: +0.9 },
  { player: "De'Aaron Fox",  team: 'SAC', stat: 'PTS', proj: 24.1, line: 26.5, edge: -2.4 },
]

const instruments = [
  {
    id: '01', name: 'PROJECTION ENGINE', tier: 'analyst+',
    desc: 'Input any player, any game. The model computes Fpace × Fdef × rebound suppression and outputs a projection value with every contributing factor exposed for inspection.',
  },
  {
    id: '02', name: 'MATCHUP MATRIX', tier: 'vector+',
    desc: 'Assign primary defensive matchups via size data and Cleaning the Glass percentile rankings. Blended by matchup-share weighting. Agent-prefilled before each slate.',
  },
  {
    id: '03', name: 'LINEUP CALIBRATOR', tier: 'vector+',
    desc: 'Apply shared-floor adjustments for star combinations with fewer than 20 games of co-play data. Conservative bias applied automatically; override with your conviction.',
  },
  {
    id: '04', name: 'BACKTESTER', tier: 'nexus',
    desc: 'Run the model against any historical slate. Surface accuracy by player, stat category, and matchup type. Export raw output to CSV for external analysis.',
  },
  {
    id: '05', name: 'DAILY SIGNALS', tier: 'core+',
    desc: 'Operator-reviewed model outputs published before each game slate. High-edge projections confirmed against live lines. Delivered to your dashboard before market movement.',
  },
]


const SAMPLE_FEED = [
  { player: 'L. Dončić',      stat: 'PTS', proj: '31.4', line: '28.5', edge: '+10%' },
  { player: 'N. Jokić',       stat: 'REB', proj: '13.8', line: '11.5', edge: '+20%' },
  { player: 'S. Gilgeous-A.', stat: 'PTS', proj: '33.1', line: '30.5', edge: '+8%'  },
  { player: 'A. Edwards',     stat: 'PTS', proj: '28.7', line: '26.5', edge: '+8%'  },
  { player: 'T. Haliburton',  stat: 'AST', proj: '9.1',  line: '9.5',  edge: '-4%'  },
]

// Content duplicated in JSX for seamless translateY(-50%) loop
const DRIFT_COLUMN = `31.4  28.5
fpace 0.847
REB   +1.7
13.8  11.5
0.923 fdef
PTS   33.1
+8%   edge
AST    9.1
 9.5  line
0.762  adj
26.5  base
DEN   +20%
LAL   fdef
 5.3  AST
0.841 pace
+10%   sig
28.5  LINE
PTS   OKC
REB   MIL
 -4%  adj
0.889 blnd
28.7  proj
IND   BASE
33.1   raw
 +8%  conf
`

export default function LandingPage() {
  return (
    <div style={{ background: C.void, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ───────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${C.border}`,
        height: '56px', padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '24px',
      }}>
        {/* Wordmark */}
        <div style={{ fontFamily: F.mono, fontSize: '13px', fontWeight: 500, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span className="cursor-blink" style={{ color: C.signalCyan, marginRight: '2px' }}>▌</span>
          <span style={{ color: C.platinum }}>THE_ANALYTICS_</span>
          <span style={{ color: C.signalCyan }}>COMMUNITY</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '28px' }}>
          {navLinks.map(([label, href]) => (
            <a key={label} href={href} style={{
              fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
              color: C.dim, letterSpacing: '0.12em', textDecoration: 'none',
            }}>
              {label}
            </a>
          ))}
        </div>

        {/* Right side: LIVE indicator + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="amber-pulse" style={{
              display: 'inline-block', width: '5px', height: '5px',
              borderRadius: '50%', background: C.flagAmber,
            }} />
            <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.flagAmber, letterSpacing: '0.1em' }}>
              LIVE · 14 GAMES
            </span>
          </div>
          <a href="/join" style={{
            display: 'inline-block',
            background: C.signalCyan, color: '#000000',
            padding: '7px 18px', fontFamily: F.mono,
            fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em',
            textDecoration: 'none',
          }}>
            REQUEST ACCESS →
          </a>
        </div>
      </nav>

      {/* ── SECTION 1: HERO (split) ───────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        paddingTop: '56px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch',
      }}>

        {/* Background: hairline grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: [
            'linear-gradient(rgba(60,180,210,0.04) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(60,180,210,0.04) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '48px 48px',
        }} />

        {/* Background: drifting model-output data streams */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {[
            { left: '7%',  dur: '52s', delay: '0s'   },
            { left: '22%', dur: '38s', delay: '-14s'  },
            { left: '46%', dur: '62s', delay: '-8s'   },
            { left: '68%', dur: '44s', delay: '-22s'  },
            { left: '88%', dur: '36s', delay: '-5s'   },
          ].map((col, i) => (
            <div key={i} style={{ position: 'absolute', left: col.left, top: 0, opacity: 0.04 }}>
              <div
                className="data-drift"
                style={{
                  fontFamily: F.mono,
                  fontSize: '11px',
                  color: C.faint,
                  whiteSpace: 'pre',
                  lineHeight: '2.2em',
                  userSelect: 'none',
                  animationDuration: col.dur,
                  animationDelay: col.delay,
                }}
              >
                {DRIFT_COLUMN + DRIFT_COLUMN}
              </div>
            </div>
          ))}
        </div>

        {/* Split content grid */}
        <div
          className="hero-columns"
          style={{
            position: 'relative', zIndex: 1,
            maxWidth: '1600px', width: '100%',
            margin: '0 auto',
            padding: '0 clamp(32px, 4vw, 64px)',
          }}
        >
          {/* ── LEFT: manifesto ─────────────────────────────── */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: 'clamp(64px, 8vh, 96px) clamp(32px, 3vw, 52px) clamp(64px, 8vh, 96px) 0',
          }}>

            {/* Section comment — cyan per spec */}
            <div style={{
              fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
              color: C.signalCyan, letterSpacing: '0.12em',
              marginBottom: '12px',
            }}>
              // PRIVATE NBA QUANTITATIVE DESK
            </div>

            {/* Terminal prompt */}
            <div style={{
              fontFamily: F.mono, fontSize: '12px', fontWeight: 400,
              color: C.faint, marginBottom: '48px',
            }}>
              &gt; init_session --access=by_membership
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: F.sans,
              fontSize: 'clamp(40px, 5.5vw, 82px)',
              fontWeight: 500, lineHeight: 1.0, letterSpacing: '-0.03em',
              margin: '0', color: C.platinum,
            }}>
              Run the model.
            </h1>
            <h1 style={{
              fontFamily: F.sans,
              fontSize: 'clamp(40px, 5.5vw, 82px)',
              fontWeight: 500, lineHeight: 1.0, letterSpacing: '-0.03em',
              margin: '0 0 40px', color: C.signalCyan,
            }}>
              Beat the line.
            </h1>

            {/* Subcopy */}
            <p style={{
              fontFamily: F.sans, fontSize: '17px', fontWeight: 400,
              color: C.muted, lineHeight: 1.65,
              maxWidth: '460px', margin: '0 0 40px',
            }}>
              Not a pick service — the engine itself. Direct access to the
              projection model, matchup matrix, lineup calibrator, and backtester.
              By membership.
            </p>

            {/* CTAs */}
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'center',
              flexWrap: 'wrap', marginBottom: '28px',
            }}>
              <a href="/join" style={{
                display: 'inline-block',
                background: C.signalCyan, color: '#000000',
                padding: '12px 28px', fontFamily: F.mono,
                fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em',
                textDecoration: 'none',
              }}>
                REQUEST ACCESS →
              </a>
              <a href="#engine" style={{
                display: 'inline-block',
                background: 'transparent', color: C.platinum,
                padding: '11px 28px', fontFamily: F.mono,
                fontSize: '11px', fontWeight: 400, letterSpacing: '0.1em',
                textDecoration: 'none',
                border: `1px solid ${C.border}`,
              }}>
                VIEW THE ENGINE
              </a>
            </div>

            {/* Spec line */}
            <div style={{
              fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
              color: C.dim, letterSpacing: '0.1em',
            }}>
              07-AGENT PIPELINE · 05 INSTRUMENTS · 240+ PTS/SLATE · 06:00 REFRESH
            </div>
          </div>

          {/* ── RIGHT: sample projection feed ───────────────── */}
          <div
            className="hero-right-panel"
            style={{
              background: 'rgba(6,8,9,0.6)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: 'clamp(48px, 6vh, 80px) clamp(28px, 3vw, 52px)',
            }}
          >
            {/* Feed header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint }}>
                &gt; sample_feed --slate=tonight
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <span style={{
                  display: 'inline-block', width: '5px', height: '5px',
                  borderRadius: '50%', background: C.flagAmber,
                }} />
                <span style={{
                  fontFamily: F.mono, fontSize: '10px',
                  color: C.flagAmber, letterSpacing: '0.1em',
                }}>
                  SAMPLE
                </span>
              </div>
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${C.border}` }}>

              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 40px 56px 56px 54px',
                padding: '8px 16px',
                borderBottom: `1px solid ${C.borderEmphasis}`,
                fontFamily: F.mono, fontSize: '9px', fontWeight: 400,
                color: C.dim, letterSpacing: '0.14em',
                background: 'rgba(6,8,9,0.8)',
              }}>
                <span>PLAYER</span>
                <span style={{ textAlign: 'center' }}>STAT</span>
                <span style={{ textAlign: 'right' }}>PROJ</span>
                <span style={{ textAlign: 'right' }}>LINE</span>
                <span style={{ textAlign: 'right' }}>EDGE</span>
              </div>

              {/* Static sample rows */}
              {SAMPLE_FEED.map((row, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 40px 56px 56px 54px',
                  padding: '10px 16px',
                  borderBottom: i < SAMPLE_FEED.length - 1 ? `1px solid ${C.border}` : 'none',
                  fontFamily: F.mono, fontSize: '12px', fontWeight: 400,
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                }}>
                  <span style={{ color: C.platinum }}>{row.player}</span>
                  <span style={{ color: C.dim, textAlign: 'center' }}>{row.stat}</span>
                  <span style={{ color: C.signalCyan, textAlign: 'right' }}>{row.proj}</span>
                  <span style={{ color: C.muted, textAlign: 'right' }}>{row.line}</span>
                  <span style={{
                    textAlign: 'right', fontWeight: 500,
                    color: row.edge.startsWith('-') ? C.flagAmber : C.signalCyan,
                  }}>
                    {row.edge}
                  </span>
                </div>
              ))}
            </div>

            {/* Honest footer */}
            <div style={{
              fontFamily: F.mono, fontSize: '9px', fontWeight: 400,
              color: C.faint, letterSpacing: '0.08em',
              textAlign: 'right', marginTop: '10px',
            }}>
              sample slate · representative output
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: LIVE PROJECTION FEED ──────────────────────── */}
      <section style={{
        padding: '100px 40px',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Terminal prompt header */}
          <div style={{
            fontFamily: F.mono, fontSize: '13px', fontWeight: 400,
            color: C.faint, marginBottom: '6px',
          }}>
            &gt; live_projection_feed --slate=tonight --source=model_v4
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
            color: C.dim, marginBottom: '32px', letterSpacing: '0.04em',
          }}>
            [06:14:23] fetching... done. 14 games loaded. 7 high-edge projections.
          </div>

          {/* Table container */}
          <div style={{ border: `1px solid ${C.border}` }}>

            {/* Table header bar */}
            <div style={{
              background: C.panel,
              borderBottom: `1px solid ${C.borderEmphasis}`,
              padding: '10px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.12em' }}>
                MODEL OUTPUT · projection_feed.log
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="amber-pulse" style={{
                  display: 'inline-block', width: '5px', height: '5px',
                  borderRadius: '50%', background: C.flagAmber,
                }} />
                <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.flagAmber, letterSpacing: '0.1em' }}>
                  LIVE
                </span>
              </div>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 52px 52px 68px 68px 72px',
              padding: '8px 20px',
              borderBottom: `1px solid ${C.border}`,
              fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
              color: C.dim, letterSpacing: '0.12em',
            }}>
              <span>PLAYER</span>
              <span>TEAM</span>
              <span>STAT</span>
              <span style={{ textAlign: 'right' }}>PROJ</span>
              <span style={{ textAlign: 'right' }}>LINE</span>
              <span style={{ textAlign: 'right' }}>EDGE</span>
            </div>

            {/* Projection rows */}
            {projections.map((row, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 52px 52px 68px 68px 72px',
                padding: '11px 20px',
                borderBottom: i < projections.length - 1 ? `1px solid ${C.border}` : 'none',
                fontFamily: F.mono, fontSize: '13px', fontWeight: 400,
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)',
              }}>
                <span style={{ color: C.platinum }}>{row.player}</span>
                <span style={{ color: C.muted }}>{row.team}</span>
                <span style={{ color: C.dim }}>{row.stat}</span>
                <span style={{ color: C.muted, textAlign: 'right' }}>{row.proj.toFixed(1)}</span>
                <span style={{ color: C.dim, textAlign: 'right' }}>{row.line.toFixed(1)}</span>
                <span style={{
                  textAlign: 'right', fontWeight: 500,
                  color: row.edge > 0 ? C.signalCyan : C.flagAmber,
                }}>
                  {row.edge > 0 ? '+' : ''}{row.edge.toFixed(1)}
                </span>
              </div>
            ))}

            {/* Footer note */}
            <div style={{
              padding: '10px 20px',
              borderTop: `1px solid ${C.border}`,
              fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
              color: C.faint, letterSpacing: '0.08em',
              background: C.panel,
            }}>
              SAMPLE DATA · ILLUSTRATIVE MODEL OUTPUT · ACTUAL SLATE VARIES
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: STAT STRIP ─────────────────────────────────── */}
      <section style={{
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        background: C.panel,
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            { value: '05', label: 'INSTRUMENTS' },
            { value: '07', label: 'AGENT PIPELINE' },
            { value: '240+', label: 'PTS / SLATE' },
            { value: '06:00', label: 'DAILY REFRESH' },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '44px 40px',
              borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: '44px', fontWeight: 500,
                color: C.signalCyan, letterSpacing: '-0.02em',
                lineHeight: 1, marginBottom: '12px',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                color: C.dim, letterSpacing: '0.16em',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: INSTRUMENTS ────────────────────────────────── */}
      <section id="engine" style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Section header */}
          <div style={{
            fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
            color: C.dim, letterSpacing: '0.1em', marginBottom: '8px',
          }}>
            // THE ENGINE
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: '13px', fontWeight: 400,
            color: C.faint, marginBottom: '56px',
          }}>
            &gt; list_instruments --status=active --count=5
          </div>

          {/* Instruments list */}
          <div>
            {instruments.map((inst, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 100px',
                gap: '28px', alignItems: 'start',
                padding: '32px 0',
                borderBottom: i < instruments.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                {/* Index */}
                <div style={{
                  fontFamily: F.mono, fontSize: '12px', fontWeight: 400,
                  color: C.dim, letterSpacing: '0.08em', paddingTop: '3px',
                }}>
                  {inst.id}
                </div>

                {/* Name + description */}
                <div>
                  <div style={{
                    fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
                    color: C.platinum, letterSpacing: '0.08em',
                    marginBottom: '10px',
                  }}>
                    {inst.name}
                  </div>
                  <div style={{
                    fontFamily: F.sans, fontSize: '15px', fontWeight: 400,
                    color: C.muted, lineHeight: 1.65,
                  }}>
                    {inst.desc}
                  </div>
                </div>

                {/* Tier badge */}
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                  color: C.faint, letterSpacing: '0.08em',
                  border: `1px solid ${C.border}`,
                  padding: '5px 10px',
                  textAlign: 'center',
                  alignSelf: 'start',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                }}>
                  {inst.tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: MEMBERSHIP CTA ─────────────────────────────── */}
      <section style={{
        padding: '100px 40px',
        borderTop: `1px solid ${C.border}`,
        background: C.panel,
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          {/* Section header */}
          <div style={{
            fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
            color: C.dim, letterSpacing: '0.1em', marginBottom: '8px',
          }}>
            // ACCESS
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: '13px', fontWeight: 400,
            color: C.faint, marginBottom: '52px',
          }}>
            &gt; request_access --type=membership --desk=private
          </div>

          {/* Headline */}
          <h2 style={{
            fontFamily: F.sans, fontSize: 'clamp(36px, 5.5vw, 68px)',
            fontWeight: 500, letterSpacing: '-0.025em',
            lineHeight: 1.05, margin: '0 0 24px', color: C.platinum,
          }}>
            Private quantitative desk.
          </h2>

          {/* Copy */}
          <p style={{
            fontFamily: F.sans, fontSize: '17px', fontWeight: 400,
            color: C.muted, lineHeight: 1.65,
            margin: '0 0 52px', maxWidth: '560px',
          }}>
            The Analytics Community is a private membership for serious NBA analysts.
            Access to the engine is granted by tier — from daily signals through full
            model operator access with backtesting and raw data export.
          </p>

          {/* Tier reference table */}
          <div style={{ border: `1px solid ${C.border}`, marginBottom: '40px' }}>
            {BRAND.tiers.map((tier, i) => (
              <div key={tier.slug} style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 90px',
                gap: '20px', alignItems: 'center',
                padding: '16px 20px',
                borderBottom: i < BRAND.tiers.length - 1 ? `1px solid ${C.border}` : 'none',
                background: tier.mostPopular ? 'rgba(47,212,232,0.025)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {tier.mostPopular && (
                    <span style={{ width: '3px', height: '14px', background: C.signalCyan, display: 'inline-block', flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                    color: tier.mostPopular ? C.signalCyan : C.platinum,
                    letterSpacing: '0.08em',
                  }}>
                    {tier.label.toUpperCase()}
                  </span>
                </div>
                <div style={{
                  fontFamily: F.sans, fontSize: '13px', fontWeight: 400,
                  color: C.muted, lineHeight: 1.4,
                }}>
                  {tier.description}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: '14px', fontWeight: 500,
                    color: tier.mostPopular ? C.signalCyan : C.platinum,
                  }}>
                    ${tier.priceMonthly}
                  </span>
                  <span style={{
                    fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                    color: C.dim,
                  }}>
                    /mo
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/join" style={{
              display: 'inline-block',
              background: C.signalCyan, color: '#000000',
              padding: '13px 32px', fontFamily: F.mono,
              fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em',
              textDecoration: 'none',
            }}>
              REQUEST ACCESS →
            </a>
            <a href="/picks" style={{
              display: 'inline-block',
              background: 'transparent', color: C.platinum,
              padding: '12px 32px', fontFamily: F.mono,
              fontSize: '12px', fontWeight: 400, letterSpacing: '0.1em',
              textDecoration: 'none',
              border: `1px solid ${C.border}`,
            }}>
              VIEW DAILY SIGNALS
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{
        padding: '48px 40px',
        borderTop: `1px solid ${C.borderEmphasis}`,
        background: C.panel,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Top row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', flexWrap: 'wrap', gap: '40px',
            marginBottom: '40px',
          }}>
            {/* Wordmark + domain */}
            <div>
              <div style={{
                fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
                letterSpacing: '0.04em', marginBottom: '8px',
              }}>
                <span style={{ color: C.platinum }}>▌ THE_ANALYTICS_</span>
                <span style={{ color: C.signalCyan }}>COMMUNITY</span>
              </div>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint }}>
                {BRAND.domain}
              </div>
            </div>

            {/* Nav columns */}
            <div style={{ display: 'flex', gap: '56px' }}>
              <div>
                <div style={{
                  fontFamily: F.mono, fontSize: '9px', fontWeight: 400,
                  color: C.dim, letterSpacing: '0.16em', marginBottom: '14px',
                  textTransform: 'uppercase',
                }}>
                  Platform
                </div>
                {[['Daily Signals', '/picks'], ['Accuracy Index', '/tracker'], ['Membership', '/join']].map(([label, href]) => (
                  <div key={label} style={{ marginBottom: '10px' }}>
                    <a href={href} style={{
                      fontFamily: F.sans, fontSize: '13px', fontWeight: 400,
                      color: C.muted, textDecoration: 'none',
                    }}>
                      {label}
                    </a>
                  </div>
                ))}
              </div>
              <div>
                <div style={{
                  fontFamily: F.mono, fontSize: '9px', fontWeight: 400,
                  color: C.dim, letterSpacing: '0.16em', marginBottom: '14px',
                  textTransform: 'uppercase',
                }}>
                  Engine
                </div>
                {[
                  ['Projection Engine', '/tools/projection-runner'],
                  ['Matchup Matrix', '/tools/matchup-builder'],
                  ['Lineup Calibrator', '/tools/lineup-adjuster'],
                  ['Backtester', '/tools/backtester'],
                ].map(([label, href]) => (
                  <div key={label} style={{ marginBottom: '10px' }}>
                    <a href={href} style={{
                      fontFamily: F.sans, fontSize: '13px', fontWeight: 400,
                      color: C.muted, textDecoration: 'none',
                    }}>
                      {label}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{
            borderTop: `1px solid ${C.border}`, paddingTop: '24px',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '12px',
          }}>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint }}>
              © 2025 The Analytics Community
            </div>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint }}>
              {BRAND.supportEmail}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            marginTop: '20px',
            fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
            color: C.faint, lineHeight: 1.7, letterSpacing: '0.02em',
          }}>
            All memberships are billed on a recurring monthly basis. Membership grants access to analytical
            modeling tools and data outputs — not investment advice. Past model accuracy does not guarantee
            future results. Contact {BRAND.supportEmail} for support or cancellations at least 48 hours before your billing date.
          </div>
        </div>
      </footer>

    </div>
  )
}
