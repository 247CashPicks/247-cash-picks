'use client'

import { useState } from 'react'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      q: 'What is a projection signal?',
      a: "A projection signal is a statistically-derived output from the DataNexus model — a quantified estimate of a player's performance in a specific statistical category (points, rebounds, assists) for a given game, with a directional recommendation relative to the published market line.",
    },
    {
      q: 'Do I need a data science background to use the tools?',
      a: 'No. The lab tools are designed so that serious analysts with basic sports knowledge can operate them effectively. The agent pipeline pre-fills all inputs automatically — you review, override where you have better data, and execute the model.',
    },
    {
      q: "Where does the pre-filled data come from?",
      a: 'Our automated agent pipeline runs every morning ingesting lineup data, per-36 minute statistics, individual pace ratings, and defensive analytics from professional sports data sources. All model inputs are populated before you open the tool.',
    },
    {
      q: "Can I override the model's default inputs?",
      a: "Yes, at Analyst tier and above. Every input field is editable. Your overrides are logged separately from the agent baseline — you can always compare your adjusted projection against the model's default output.",
    },
    {
      q: 'What are Fpace and Fdef?',
      a: "Fpace is a blended pace multiplier that combines the opposing defender's individual pace with the offensive player's team pace, weighted by matchup share (30/70 default). Fdef applies the same blending logic to defensive ratings. Together they transform raw per-36 statistics into game-specific projection values.",
    },
    {
      q: 'When are daily signals published?',
      a: 'Signals are reviewed and published daily before game time — typically by 3:30 PM ET. Vector and Nexus subscribers receive early access.',
    },
    {
      q: 'What sports does the model cover?',
      a: 'The current engine is calibrated for NBA player performance modeling. Additional league modules are in active development.',
    },
    {
      q: 'What is the Signal Guarantee?',
      a: 'Every new DataNexus subscriber receives a Signal Guarantee on their initial membership. If the first set of published signals do not resolve favorably, you receive a full credit toward any future membership tier. No conditions. No delays.',
    },
  ]

  const recentSignals = [
    { player: 'Luka Dončić', team: 'LAL', stat: 'PTS', line: 28.5, proj: 31.2, dir: 'OVER', result: 'hit' },
    { player: 'Nikola Jokić', team: 'DEN', stat: 'REB', line: 11.5, proj: 13.1, dir: 'OVER', result: 'hit' },
    { player: 'SGA', team: 'OKC', stat: 'PTS', line: 31.5, proj: 29.4, dir: 'UNDER', result: 'hit' },
    { player: 'Anthony Davis', team: 'LAL', stat: 'PTS', line: 26.5, proj: 28.9, dir: 'OVER', result: 'miss' },
    { player: 'Jayson Tatum', team: 'BOS', stat: 'AST', line: 4.5, proj: 5.8, dir: 'OVER', result: 'hit' },
  ]

  const tools = [
    {
      key: 'projection_runner',
      icon: '⚡',
      label: 'PROJECTION ENGINE',
      tier: 'Analyst+',
      price: '$549/mo',
      desc: 'Input any player, any game. The model outputs Fpace, Fdef, and projection values. Inspect every computed factor.',
      color: '#818CF8',
    },
    {
      key: 'matchup_builder',
      icon: '⬡',
      label: 'MATCHUP MATRIX',
      tier: 'Vector+',
      price: '$799/mo',
      desc: 'Assign primary defensive matchups using size data and Cleaning the Glass defensive percentile rankings.',
      color: '#A78BFA',
    },
    {
      key: 'lineup_adjuster',
      icon: '↺',
      label: 'LINEUP CALIBRATOR',
      tier: 'Vector+',
      price: '$799/mo',
      desc: 'Apply shared-floor adjustments for star combinations with fewer than 20 games together. Conservative bias applied automatically.',
      color: '#A78BFA',
    },
    {
      key: 'backtester',
      icon: '◎',
      label: 'ACCURACY INDEX',
      tier: 'Nexus',
      price: '$1,199/mo',
      desc: 'Run the model against historical data. Surface accuracy by player, stat category, and matchup type. Export to CSV.',
      color: '#E9D5FF',
    },
  ]

  function toolRgb(color: string): string {
    if (color === '#818CF8') return '129,140,248'
    if (color === '#A78BFA') return '167,139,250'
    if (color === '#E9D5FF') return '233,213,255'
    return '167,139,250'
  }

  return (
    <div style={{ background: C.primary, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(7,8,14,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: F.heading, fontSize: '22px', fontWeight: 700, letterSpacing: '0.5px' }}>
          <span style={{ color: C.accentLight }}>Data</span>
          <span style={{ color: C.text }}>Nexus</span>
        </div>
        <div style={{ display: 'flex', gap: '32px', fontSize: '14px', fontWeight: 500 }}>
          {[['Daily Signals', '/picks'], ['Accuracy Index', '/tracker'], ['Lab Tools', '/#tools'], ['Membership', '/#pricing']].map(([label, href]) => (
            <a key={label} href={href} style={{ color: C.textMuted, textDecoration: 'none' }}>{label}</a>
          ))}
        </div>
        <a href="/join" style={{
          background: C.accent, color: C.text, padding: '10px 24px',
          borderRadius: '8px', fontFamily: F.heading, fontWeight: 700,
          fontSize: '14px', letterSpacing: '0.5px', textDecoration: 'none',
        }}>
          GET STARTED
        </a>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: '64px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(167,139,250,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167,139,250,0.04) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        <div style={{
          position: 'absolute', top: '20%', left: '8%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(109,40,217,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '8%',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ textAlign: 'center', maxWidth: '900px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(109,40,217,0.1)', border: `1px solid ${C.border}`,
            borderRadius: '100px', padding: '8px 20px', marginBottom: '32px',
            fontSize: '13px', fontWeight: 600, color: C.accentLight, letterSpacing: '1px',
          }}>
            ⚡ PRECISION SPORTS ANALYTICS PLATFORM
          </div>

          <h1 style={{
            fontFamily: F.heading,
            fontSize: 'clamp(56px, 10vw, 120px)',
            fontWeight: 700, lineHeight: 0.95,
            letterSpacing: '-1px', margin: '0 0 8px', color: C.text,
          }}>
            MODEL. ANALYZE.
          </h1>
          <h1 style={{
            fontFamily: F.heading,
            fontSize: 'clamp(56px, 10vw, 120px)',
            fontWeight: 700, lineHeight: 0.95,
            letterSpacing: '-1px', margin: '0 0 28px',
            color: C.accentLight,
            textShadow: '0 0 60px rgba(167,139,250,0.3)',
          }}>
            PROJECT.
          </h1>

          <p style={{
            fontSize: '18px', color: C.textMuted,
            maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.6,
          }}>
            The analytics engine serious analysts run on. Built for precision — not guesswork.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/join" style={{
              background: C.accent, color: C.text, padding: '16px 40px',
              borderRadius: '10px', fontFamily: F.heading, fontWeight: 700,
              fontSize: '17px', letterSpacing: '0.5px', textDecoration: 'none',
              boxShadow: '0 0 40px rgba(109,40,217,0.25)',
            }}>
              ACCESS THE LAB →
            </a>
            <a href="#tools" style={{
              background: 'transparent', color: C.text, padding: '16px 40px',
              borderRadius: '10px', fontFamily: F.heading, fontWeight: 600,
              fontSize: '17px', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              EXPLORE THE TOOLS
            </a>
          </div>

          <div style={{
            display: 'flex', gap: '48px', justifyContent: 'center',
            flexWrap: 'wrap', marginTop: '64px',
          }}>
            {[
              { value: '73%', label: 'MODEL ACCURACY', color: C.confirm },
              { value: '2,400+', label: 'SIGNALS OUTPUT', color: C.signal },
              { value: '5', label: 'ACCESS TIERS', color: C.accentLight },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: F.heading, fontSize: '48px', fontWeight: 700,
                  color: s.color, lineHeight: 1,
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: '11px', color: C.textMuted,
                  letterSpacing: '1.5px', marginTop: '6px',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO PRODUCTS */}
      <section style={{ padding: '100px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{
            fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
            color: C.accentLight, letterSpacing: '2px', marginBottom: '12px',
          }}>
            ONE ENGINE. TWO ACCESS LAYERS.
          </div>
          <h2 style={{
            fontFamily: F.heading, fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 700, lineHeight: 1, margin: 0,
          }}>
            SIGNALS DELIVERED.<br />
            <span style={{ color: C.accentLight }}>MODEL UNLOCKED.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Signals card */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '20px', padding: '48px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, transparent, ${C.confirm}, transparent)`,
            }} />
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>◎</div>
            <h3 style={{
              fontFamily: F.heading, fontSize: '28px', fontWeight: 700,
              color: C.confirm, letterSpacing: '0.5px', margin: '0 0 16px',
            }}>
              DAILY SIGNAL OUTPUT
            </h3>
            <p style={{ color: C.textMuted, lineHeight: 1.7, fontSize: '16px', margin: '0 0 24px' }}>
              Operator-reviewed projection outputs published daily before game time. Model-backed,
              data-verified, delivered to your dashboard. Zero research required.
            </p>
            <div style={{
              background: 'rgba(52,211,153,0.08)', borderRadius: '10px',
              padding: '16px 20px', marginBottom: '28px',
              border: '1px solid rgba(52,211,153,0.15)',
            }}>
              <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '4px' }}>Available from</div>
              <div style={{ fontFamily: F.heading, fontSize: '22px', fontWeight: 700, color: C.confirm }}>
                Core — $199/month
              </div>
            </div>
            <a href="/join?tier=core" style={{
              display: 'inline-block', background: C.confirm, color: '#07080E',
              padding: '12px 28px', borderRadius: '8px', fontFamily: F.heading,
              fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px',
              textDecoration: 'none',
            }}>
              ACCESS SIGNALS →
            </a>
          </div>

          {/* Tools card */}
          <div style={{
            background: C.surface2, border: `1px solid rgba(56,189,248,0.3)`,
            borderRadius: '20px', padding: '48px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, transparent, ${C.signal}, transparent)`,
            }} />
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
            <h3 style={{
              fontFamily: F.heading, fontSize: '28px', fontWeight: 700,
              color: C.signal, letterSpacing: '0.5px', margin: '0 0 16px',
            }}>
              THE MODELING TOOLS
            </h3>
            <p style={{ color: C.textMuted, lineHeight: 1.7, fontSize: '16px', margin: '0 0 24px' }}>
              Run the exact projection engine behind every signal. Input any game, any player,
              any matchup. Inspect Fpace, Fdef, and rebound suppression factors. Build your own
              analytical conviction.
            </p>
            <div style={{
              background: 'rgba(56,189,248,0.08)', borderRadius: '10px',
              padding: '16px 20px', marginBottom: '28px',
              border: '1px solid rgba(56,189,248,0.15)',
            }}>
              <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '4px' }}>Available from</div>
              <div style={{ fontFamily: F.heading, fontSize: '22px', fontWeight: 700, color: C.signal }}>
                Analyst — $549/month
              </div>
            </div>
            <a href="/join?tier=analyst" style={{
              display: 'inline-block', background: C.signal, color: '#07080E',
              padding: '12px 28px', borderRadius: '8px', fontFamily: F.heading,
              fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px',
              textDecoration: 'none',
            }}>
              OPEN THE LAB →
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{
        padding: '100px 40px',
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '2px', marginBottom: '12px',
            }}>
              THE PIPELINE
            </div>
            <h2 style={{
              fontFamily: F.heading, fontSize: 'clamp(36px, 5vw, 60px)',
              fontWeight: 700, lineHeight: 1, margin: 0,
            }}>
              HOW THE ENGINE<br /><span style={{ color: C.accentLight }}>PRODUCES SIGNAL</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { n: '01', icon: '⬡', title: 'DATA INGESTION', color: C.accentLight, desc: 'Agent pipeline ingests lineups, per-36 stats, pace data, defensive ratings, and matchup variables across the full game slate every morning.' },
              { n: '02', icon: '⚡', title: 'MODEL EXECUTION', color: C.signal, desc: 'The projection engine runs Fpace × Fdef × rebound suppression across all active players. Lineup combination adjustments applied where flagged.' },
              { n: '03', icon: '◎', title: 'SIGNAL OUTPUT', color: C.confirm, desc: 'Operator reviews model outputs against live lines. High-edge projections confirmed and published as daily signals before market movement.' },
              { n: '04', icon: '◈', title: 'SELF-SERVE ANALYSIS', color: '#E9D5FF', desc: 'Analyst+ subscribers run the same engine independently. Override any input, inspect every factor, develop conviction the model alone cannot give you.' },
            ].map((step) => (
              <div key={step.n} style={{
                background: C.primary, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '32px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '-16px', right: '-8px',
                  fontFamily: F.heading, fontSize: '100px', fontWeight: 700,
                  color: 'rgba(255,255,255,0.03)', lineHeight: 1,
                }}>
                  {step.n}
                </div>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>{step.icon}</div>
                <h3 style={{
                  fontFamily: F.heading, fontSize: '17px', fontWeight: 700,
                  color: step.color, margin: '0 0 12px', letterSpacing: '0.5px',
                }}>
                  {step.title}
                </h3>
                <p style={{ color: C.textMuted, lineHeight: 1.7, fontSize: '14px', margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOOLS SHOWCASE */}
      <section id="tools" style={{ padding: '100px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{
            fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
            color: C.accentLight, letterSpacing: '2px', marginBottom: '12px',
          }}>
            THE LAB
          </div>
          <h2 style={{
            fontFamily: F.heading, fontSize: 'clamp(36px, 5vw, 60px)',
            fontWeight: 700, lineHeight: 1, margin: '0 0 16px',
          }}>
            FOUR INSTRUMENTS.<br />
            <span style={{ color: C.accentLight }}>ONE EDGE.</span>
          </h2>
          <p style={{ color: C.textMuted, fontSize: '16px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
            The same modeling toolkit the operator uses to generate daily signals —
            now available to serious analysts.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {tools.map((tool) => {
            const rgb = toolRgb(tool.color)
            return (
              <div key={tool.key} style={{
                background: C.surface, borderRadius: '16px', padding: '36px',
                border: `1px solid rgba(${rgb},0.2)`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: `rgba(${rgb},0.1)`,
                  border: `1px solid rgba(${rgb},0.25)`,
                  borderRadius: '100px', padding: '4px 12px',
                  fontSize: '12px', fontWeight: 600, color: tool.color,
                  letterSpacing: '0.5px', marginBottom: '20px',
                }}>
                  {tool.tier} · {tool.price}
                </div>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>{tool.icon}</div>
                <h3 style={{
                  fontFamily: F.heading, fontSize: '22px', fontWeight: 700,
                  color: tool.color, margin: '0 0 12px', letterSpacing: '0.5px',
                }}>
                  {tool.label}
                </h3>
                <p style={{ color: C.textMuted, lineHeight: 1.7, fontSize: '15px', margin: 0 }}>
                  {tool.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ACCURACY INDEX PREVIEW */}
      <section style={{
        padding: '100px 40px',
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div>
            <div style={{
              fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '2px', marginBottom: '12px',
            }}>
              MODEL PERFORMANCE
            </div>
            <h2 style={{
              fontFamily: F.heading, fontSize: 'clamp(36px, 4vw, 52px)',
              fontWeight: 700, lineHeight: 1, margin: '0 0 20px',
            }}>
              No Hype.<br /><span style={{ color: C.accentLight }}>Just Data.</span>
            </h2>
            <p style={{ color: C.textMuted, fontSize: '16px', lineHeight: 1.7, margin: '0 0 32px' }}>
              Every signal. Every resolution. Every variance from projection to actual.
              Full transparency — no cherry-picking, no selective reporting.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '32px' }}>
              {[
                { v: '73%', l: 'RESOLUTION ACCURACY', c: C.confirm },
                { v: '4 Mo.', l: 'CONSECUTIVE ACCURACY', c: C.signal },
                { v: '100%', l: 'TRANSPARENT OUTPUT', c: C.accentLight },
              ].map((s) => (
                <div key={s.l} style={{
                  background: C.primary, border: `1px solid ${C.border}`,
                  borderRadius: '12px', padding: '16px', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: F.heading, fontSize: '28px', fontWeight: 700, color: s.c }}>
                    {s.v}
                  </div>
                  <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '4px', letterSpacing: '0.5px' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <a href="/tracker" style={{
              display: 'inline-block', background: C.accent, color: C.text,
              padding: '14px 32px', borderRadius: '8px', fontFamily: F.heading,
              fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px',
              textDecoration: 'none',
            }}>
              VIEW ACCURACY INDEX →
            </a>
          </div>

          {/* Recent signals table */}
          <div style={{
            background: C.primary, border: `1px solid ${C.border}`,
            borderRadius: '16px', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px' }}>
                RECENT SIGNALS
              </span>
              <span style={{ fontSize: '12px', color: C.accentLight }}>● LIVE</span>
            </div>
            {recentSignals.map((p, i) => (
              <div key={i} style={{
                padding: '14px 20px',
                borderBottom: i < recentSignals.length - 1 ? `1px solid rgba(255,255,255,0.06)` : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.player}
                  </div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>
                    {p.team} · {p.stat} {p.dir} {p.line}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: F.heading, fontSize: '16px', fontWeight: 700,
                    color: p.dir === 'OVER' ? C.confirm : C.signal,
                  }}>
                    {p.dir}
                  </div>
                  <div style={{ fontSize: '11px', color: C.textMuted }}>Proj: {p.proj}</div>
                </div>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: p.result === 'hit' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                  border: `1px solid ${p.result === 'hit' ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', color: p.result === 'hit' ? C.confirm : C.alert,
                }}>
                  {p.result === 'hit' ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '2px', marginBottom: '12px',
            }}>
              ACCESS TIERS
            </div>
            <h2 style={{
              fontFamily: F.heading, fontSize: 'clamp(36px, 5vw, 60px)',
              fontWeight: 700, lineHeight: 1, margin: '0 0 16px',
            }}>
              THE HIGHER YOUR TIER —<br />
              <span style={{ color: C.accentLight }}>THE DEEPER YOUR ACCESS</span>
            </h2>
            <p style={{ color: C.textMuted, fontSize: '16px', margin: 0 }}>
              Monthly billing only. Cancel anytime.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {BRAND.tiers.map((tier) => (
              <div key={tier.slug} style={{
                background: tier.mostPopular ? C.surface2 : C.surface,
                border: `2px solid ${tier.mostPopular ? '#A78BFA' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '20px', padding: '28px 20px', textAlign: 'center',
                position: 'relative',
                transform: tier.mostPopular ? 'scale(1.04)' : 'none',
                boxShadow: tier.mostPopular ? '0 0 40px rgba(167,139,250,0.12)' : 'none',
              }}>
                {tier.mostPopular && (
                  <div style={{
                    position: 'absolute', top: '-13px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#A78BFA', color: '#07080E',
                    fontFamily: F.heading, fontWeight: 700, fontSize: '11px',
                    padding: '4px 16px', borderRadius: '100px',
                    whiteSpace: 'nowrap', letterSpacing: '1px',
                  }}>
                    ◈ MOST SELECTED
                  </div>
                )}
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{tier.gem}</div>
                <div style={{
                  fontFamily: F.heading, fontSize: '20px', fontWeight: 700,
                  color: tier.color, letterSpacing: '1px', marginBottom: '4px',
                }}>
                  {tier.label.toUpperCase()}
                </div>
                <div style={{
                  fontFamily: F.heading, fontSize: '44px', fontWeight: 700,
                  lineHeight: 1, margin: '12px 0 4px',
                }}>
                  ${tier.priceMonthly}
                </div>
                <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px' }}>/month</div>
                <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '24px', lineHeight: 1.5, minHeight: '60px' }}>
                  {tier.description}
                </div>
                <a href={`/join?tier=${tier.slug}`} style={{
                  display: 'block', background: tier.mostPopular ? '#A78BFA' : 'transparent',
                  color: tier.slug === 'nexus'
                    ? '#07080E'
                    : tier.mostPopular ? '#07080E' : '#F1F0FF',
                  border: `1px solid ${tier.color}`,
                  padding: '12px', borderRadius: '8px', fontFamily: F.heading,
                  fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px',
                  textDecoration: 'none',
                }}>
                  Activate {tier.label} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          background: C.surface2, borderRadius: '20px',
          border: '1px solid rgba(167,139,250,0.3)',
          padding: '56px', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent, ${C.accentLight}, transparent)`,
          }} />
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>◎</div>
          <h2 style={{
            fontFamily: F.heading, fontSize: '36px', fontWeight: 700,
            margin: '0 0 16px', lineHeight: 1,
          }}>
            THE DATANEXUS SIGNAL GUARANTEE
          </h2>
          <p style={{ color: C.accentLight, fontSize: '16px', margin: '0 0 20px', fontWeight: 600 }}>
            Your first session is protected.
          </p>
          <p style={{ color: C.textMuted, fontSize: '16px', lineHeight: 1.7, margin: '0 0 16px' }}>
            Every new DataNexus member receives our Signal Guarantee on initial access. If your
            first set of published signals do not resolve in your favor, you receive a full credit
            toward any future membership tier.
          </p>
          <p style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: C.text, lineHeight: 1.5 }}>
            We do not gamble with your trust. We model it.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{
        padding: '80px 40px',
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontFamily: F.heading, fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700, margin: 0, color: C.text,
            }}>
              OPERATOR VERIFIED. ANALYST APPROVED.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { name: 'David M.', tier: 'Core Subscriber', initial: 'D', color: C.confirm, quote: "The signal output has been remarkably consistent. I started at Core, verified the accuracy over four months, and never looked back." },
              { name: 'Priya S.', tier: 'Vector Subscriber', initial: 'P', color: C.signal, quote: "The Matchup Matrix changed how I analyze games entirely. I can see exactly why a projection carries edge — not just accept someone else's output." },
              { name: 'Vishal K.', tier: 'Nexus Subscriber', initial: 'V', color: C.accentLight, quote: "The Accuracy Index gave me 30 historical data points to verify before subscribing. The model's variance patterns are exactly what you want to see." },
            ].map((t) => (
              <div key={t.name} style={{
                background: C.primary, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '28px',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${t.color}, ${C.primary})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '16px', color: '#F1F0FF',
                    border: `2px solid ${t.color}`,
                  }}>
                    {t.initial}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: C.text }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: t.color }}>{t.tier}</div>
                  </div>
                </div>
                <div style={{ color: C.accentLight, fontSize: '14px', marginBottom: '12px' }}>★★★★★</div>
                <p style={{ color: C.textMuted, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                  &quot;{t.quote}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM INTEGRATIONS */}
      <section style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontFamily: F.heading, fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: 700, margin: 0,
          }}>
            PLATFORM <span style={{ color: C.accentLight }}>INTEGRATIONS</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {[
            { icon: '⬡', title: 'REFERRAL NETWORK', color: C.confirm, content: 'Earn $50 DataNexus credit every time you refer an analyst who activates a membership tier.', code: null },
            { icon: '◉', title: 'UNDERDOG INTEGRATION', color: C.signal, content: 'Use on Underdog Fantasy.', code: 'XOTICPAPI' },
            { icon: '⚡', title: '50% OFF FIRST MONTH', color: C.accentLight, content: 'New members only. Activate your first tier at half price.', code: null },
            { icon: '◎', title: 'PRIZEPICKS INTEGRATION', color: '#E9D5FF', content: 'Use on PrizePicks.', code: 'PRZX81V5Z' },
          ].map((o) => (
            <div key={o.title} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '14px', padding: '24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{o.icon}</div>
              <div style={{
                fontFamily: F.heading, fontWeight: 700, fontSize: '14px',
                color: o.color, marginBottom: '10px', letterSpacing: '0.5px',
              }}>
                {o.title}
              </div>
              {o.code && (
                <div style={{
                  background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  borderRadius: '8px', padding: '8px',
                  fontFamily: F.heading, fontSize: '20px', fontWeight: 700,
                  color: o.color, letterSpacing: '2px', marginBottom: '10px',
                }}>
                  {o.code}
                </div>
              )}
              <p style={{ color: C.textMuted, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                {o.content}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{
        padding: '80px 40px',
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontFamily: F.heading, fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 700, margin: 0,
            }}>
              FREQUENTLY ASKED <span style={{ color: C.accentLight }}>QUESTIONS</span>
            </h2>
          </div>
          <div>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                border: `1px solid ${C.border}`,
                borderRadius: '12px', marginBottom: '12px', overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', padding: '20px 24px',
                    background: openFaq === i ? C.surface2 : C.primary,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 500, color: C.text }}>
                    {faq.q}
                  </span>
                  <span style={{
                    color: C.accentLight, fontSize: '22px',
                    fontWeight: 300, flexShrink: 0, marginLeft: '16px',
                  }}>
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px', color: C.textMuted, fontSize: '15px', lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '48px 40px',
        borderTop: `1px solid ${C.border}`,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: F.heading, fontSize: '24px', fontWeight: 700,
          marginBottom: '12px', letterSpacing: '0.5px',
        }}>
          <span style={{ color: C.accentLight }}>Data</span>
          <span style={{ color: C.text }}>Nexus</span>
        </div>
        <p style={{ color: C.textMuted, fontSize: '14px', marginBottom: '8px' }}>
          📧 support@datanexus.ai
        </p>
        <p style={{ color: C.textMuted, fontSize: '13px', marginBottom: '24px' }}>
          © 2025 DataNexus
        </p>
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          background: C.surface, borderRadius: '12px',
          padding: '20px 24px', fontSize: '12px',
          color: C.textMuted, lineHeight: 1.6,
        }}>
          <strong style={{ color: C.text }}>Membership Disclaimer: </strong>
          All DataNexus memberships are billed on a recurring monthly basis. Membership grants access
          to analytical modeling tools and data outputs — not investment advice. Past model accuracy
          does not guarantee future results. For support or cancellations contact support@datanexus.ai
          at least 48 hours before your billing date.
        </div>
      </footer>

    </div>
  )
}
