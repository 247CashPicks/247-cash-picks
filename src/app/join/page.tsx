'use client'

import { useState } from 'react'
import { BRAND } from '@/config/brand'
import { NAV_LINKS as navLinks } from '@/components/nav/links'

const C = BRAND.colors
const F = BRAND.fonts

const FEATURE_LABELS: Record<string, string> = {
  daily_signals:       'Signals delivered for each active slate',
  full_signal_slate:   'Full signal slate',
  accuracy_index:      'Accuracy Index access',
  projection_viewer:   'Projection viewer (read-only)',
  projection_runner:   'Projection Engine — run the model',
  matchup_builder:     'Matchup Matrix',
  lineup_adjuster:     'Lineup Calibrator',
  backtester:          'Historical Accuracy Index',
  early_access:        'Early access signals',
  guarantee:           'Published accuracy record',
  consulting:          'Personalized consulting',
  insider_group:       'Private insider group',
  raw_export:          'Raw data export',
  custom_league_avgs:  'Custom league avg overrides',
}

const KEY_FEATURES = [
  'daily_signals',
  'full_signal_slate',
  'accuracy_index',
  'projection_viewer',
  'projection_runner',
  'matchup_builder',
  'lineup_adjuster',
  'backtester',
  'early_access',
  'guarantee',
  'insider_group',
]

const TIER_FEATURE_MAP: Record<string, Record<string, boolean>> = {
  free:    {},
  core:    { daily_signals: true, guarantee: true },
  signal:  { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, guarantee: true },
  analyst: { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, projection_runner: true, guarantee: true },
  vector:  { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, projection_runner: true, matchup_builder: true, lineup_adjuster: true, early_access: true, guarantee: true, insider_group: true },
  nexus:   { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, projection_runner: true, matchup_builder: true, lineup_adjuster: true, backtester: true, early_access: true, guarantee: true, insider_group: true },
}


export default function JoinPage() {
  const [selected, setSelected] = useState<string>('vector')
  const selectedTier = BRAND.tiers.find(t => t.slug === selected)!

  const handleCheckout = async (tierSlug: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierSlug }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Checkout unavailable. Please try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
  }

  return (
    <div style={{ background: C.void, minHeight: '100vh', position: 'relative' }}>

      {/* Faint grid texture — fixed behind all content */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: [
          'linear-gradient(rgba(60,180,210,0.04) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(60,180,210,0.04) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '48px 48px',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── NAV ─────────────────────────────────────────────────── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${C.border}`,
          height: '56px', padding: '0 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '24px',
        }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: F.mono, fontSize: '13px', fontWeight: 500, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <span className="cursor-blink" style={{ color: C.signalCyan, marginRight: '2px' }}>▌</span>
              <span style={{ color: C.platinum }}>THE_ANALYTICS_</span>
              <span style={{ color: C.signalCyan }}>COMMUNITY</span>
            </div>
          </a>
          <div style={{ display: 'flex', gap: '28px' }}>
            {navLinks.map(([label, href]) => (
              <a key={label} href={href} style={{
                fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                color: label === 'TIERS' ? C.signalCyan : C.dim,
                letterSpacing: '0.12em', textDecoration: 'none',
              }}>
                {label}
              </a>
            ))}
          </div>
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

        {/* ── PAGE HEADER ─────────────────────────────────────────── */}
        <div style={{
          maxWidth: '1440px', margin: '0 auto',
          padding: 'clamp(80px, 10vh, 112px) clamp(24px, 3vw, 48px) clamp(40px, 5vh, 56px)',
          paddingTop: 'calc(56px + clamp(48px, 6vh, 80px))',
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
            color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '12px',
          }}>
            // MEMBERSHIP TIERS
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: '12px', fontWeight: 400,
            color: C.faint, marginBottom: '24px',
          }}>
            &gt; select_tier --billing=monthly
          </div>
          <h1 style={{
            fontFamily: F.sans, fontSize: 'clamp(36px, 5vw, 72px)',
            fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.0,
            margin: '0 0 16px', color: C.platinum,
          }}>
            Choose your{' '}
            <span style={{ color: C.signalCyan }}>access.</span>
          </h1>
          <p style={{
            fontFamily: F.sans, fontSize: '16px', fontWeight: 400,
            color: C.muted, lineHeight: 1.6, maxWidth: '460px', margin: 0,
          }}>
            Not a pick subscription — access to the engine itself.
            Monthly billing. Published accuracy record on all tiers.
          </p>
        </div>

        {/* ── TIER CARDS ──────────────────────────────────────────── */}
        <div style={{
          maxWidth: '1440px', margin: '0 auto',
          padding: '0 clamp(24px, 3vw, 48px)',
        }}>
          <div className="tier-grid">
            {BRAND.tiers.filter(t => t.slug !== 'free').map((tier, i) => {
              const isSelected    = selected === tier.slug
              const isRecommended = tier.mostPopular
              const includedFeats = KEY_FEATURES.filter(f => TIER_FEATURE_MAP[tier.slug]?.[f])
              const excludedCount = KEY_FEATURES.length - includedFeats.length

              const borderColor = isRecommended
                ? C.signalCyan
                : isSelected
                ? C.borderEmphasis
                : C.border

              return (
                <div
                  key={tier.slug}
                  onClick={() => setSelected(tier.slug)}
                  style={{
                    background: C.panel,
                    border: `1px solid ${borderColor}`,
                    padding: '24px 20px 20px',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  {/* Recommended badge — occupies space even when absent so alignment holds */}
                  <div style={{ height: '20px', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                    {isRecommended && (
                      <div style={{
                        fontFamily: F.mono, fontSize: '9px', fontWeight: 500,
                        color: C.signalCyan, letterSpacing: '0.14em',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}>
                        <span>●</span> RECOMMENDED
                      </div>
                    )}
                  </div>

                  {/* Index */}
                  <div style={{
                    fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                    color: C.dim, letterSpacing: '0.1em', marginBottom: '6px',
                  }}>
                    0{i + 1}
                  </div>

                  {/* Tier name */}
                  <div style={{
                    fontFamily: F.mono, fontSize: '15px', fontWeight: 500,
                    color: C.platinum, letterSpacing: '0.08em', marginBottom: '20px',
                  }}>
                    {tier.label.toUpperCase()}
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{
                      fontFamily: F.mono, fontSize: '34px', fontWeight: 500,
                      color: C.platinum, letterSpacing: '-0.02em', lineHeight: 1,
                    }}>
                      ${tier.priceMonthly}
                    </span>
                    <span style={{
                      fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                      color: C.dim, marginLeft: '4px',
                    }}>
                      /month
                    </span>
                  </div>

                  {/* Hairline divider */}
                  <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: '16px' }} />

                  {/* Included features — flex:1 ensures uniform card height in grid */}
                  <div style={{ flex: 1, marginBottom: '20px' }}>
                    {includedFeats.map(feat => (
                      <div key={feat} style={{
                        display: 'flex', gap: '7px', alignItems: 'baseline',
                        marginBottom: '7px',
                      }}>
                        <span style={{
                          fontFamily: F.mono, fontSize: '10px',
                          color: C.signalCyan, flexShrink: 0, lineHeight: '1.5',
                        }}>›</span>
                        <span style={{
                          fontFamily: F.sans, fontSize: '11px', fontWeight: 400,
                          color: C.muted, lineHeight: 1.4,
                        }}>
                          {FEATURE_LABELS[feat]}
                        </span>
                      </div>
                    ))}
                    {excludedCount > 0 && (
                      <div style={{
                        fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                        color: C.faint, letterSpacing: '0.06em', marginTop: '10px',
                      }}>
                        +{excludedCount} not included
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCheckout(tier.slug)
                    }}
                    style={{
                      width: '100%',
                      background: isRecommended ? C.signalCyan : 'transparent',
                      color: isRecommended ? '#000000' : C.platinum,
                      border: isRecommended ? 'none' : `1px solid ${C.border}`,
                      padding: '10px 12px',
                      fontFamily: F.mono, fontSize: '10px', fontWeight: 500,
                      letterSpacing: '0.1em', cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    REQUEST ACCESS →
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SELECTED TIER DETAIL ────────────────────────────────── */}
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          padding: 'clamp(40px, 5vh, 60px) clamp(24px, 3vw, 48px) clamp(60px, 8vh, 96px)',
        }}>

          {/* Section label */}
          <div style={{
            fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
            color: C.dim, letterSpacing: '0.1em', marginBottom: '8px',
          }}>
            // SELECTED TIER DETAILS
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: '12px', fontWeight: 400,
            color: C.faint, marginBottom: '28px',
          }}>
            &gt; inspect_tier --slug={selectedTier.slug}
          </div>

          <div className="checkout-grid">

            {/* ── Feature list ─────────────────────────────── */}
            <div style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              padding: '28px 24px',
            }}>
              {/* Tier identity header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                  color: C.dim, letterSpacing: '0.12em', marginBottom: '8px',
                }}>
                  // INCLUDED IN {selectedTier.label.toUpperCase()}
                </div>
                <div style={{
                  fontFamily: F.sans, fontSize: '22px', fontWeight: 500,
                  color: C.platinum, letterSpacing: '-0.02em', marginBottom: '6px',
                }}>
                  {selectedTier.label}
                </div>
                <div style={{
                  fontFamily: F.sans, fontSize: '13px', fontWeight: 400,
                  color: C.muted, lineHeight: 1.55,
                }}>
                  {selectedTier.description}
                </div>
              </div>

              {/* Feature rows */}
              <div>
                {KEY_FEATURES.map((feat, idx) => {
                  const hasIt = !!(TIER_FEATURE_MAP[selectedTier.slug]?.[feat])
                  return (
                    <div key={feat} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 0',
                      borderBottom: idx < KEY_FEATURES.length - 1
                        ? `1px solid ${C.border}` : 'none',
                      opacity: hasIt ? 1 : 0.28,
                    }}>
                      <span style={{
                        fontFamily: F.mono, fontSize: '12px',
                        color: hasIt ? C.signalCyan : C.dim,
                        flexShrink: 0, width: '14px', textAlign: 'center',
                      }}>
                        {hasIt ? '›' : '—'}
                      </span>
                      <span style={{
                        fontFamily: F.sans, fontSize: '13px', fontWeight: 400,
                        color: hasIt ? C.platinum : C.dim,
                        lineHeight: 1.4,
                      }}>
                        {FEATURE_LABELS[feat]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Checkout panel ───────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Main checkout block */}
              <div style={{
                background: C.panel,
                border: `1px solid ${C.borderEmphasis}`,
                padding: '28px 24px',
              }}>
                {/* Prompt */}
                <div style={{
                  fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
                  color: C.faint, marginBottom: '20px',
                }}>
                  &gt; checkout --tier={selectedTier.slug} --billing=monthly
                </div>

                {/* Selected plan */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                    color: C.dim, letterSpacing: '0.12em', marginBottom: '8px',
                  }}>
                    SELECTED PLAN
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{
                      fontFamily: F.mono, fontSize: '26px', fontWeight: 500,
                      color: C.platinum, letterSpacing: '-0.01em', lineHeight: 1,
                    }}>
                      {selectedTier.label}
                    </span>
                    <span style={{
                      fontFamily: F.mono, fontSize: '14px', fontWeight: 400,
                      color: C.dim,
                    }}>
                      ${selectedTier.priceMonthly}/mo
                    </span>
                  </div>
                </div>

                {/* Accuracy transparency */}
                <div style={{
                  border: `1px solid ${C.border}`,
                  padding: '12px 14px',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '9px', fontWeight: 400,
                    color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '4px',
                  }}>
                    // ACCURACY TRANSPARENCY
                  </div>
                  <div style={{
                    fontFamily: F.sans, fontSize: '12px', fontWeight: 400,
                    color: C.muted, lineHeight: 1.5,
                  }}>
                    Every published projection is scored against the final box score and shown
                    in the public Accuracy Index — including the misses. Cancel any time.
                  </div>
                </div>

                {/* 50% off promo — amber is correct here: it's an attention/promo flag */}
                <div style={{
                  border: `1px solid rgba(232,163,61,0.22)`,
                  padding: '10px 14px',
                  marginBottom: '22px',
                  background: 'rgba(232,163,61,0.03)',
                }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: '11px', fontWeight: 400,
                    color: C.flagAmber, letterSpacing: '0.08em',
                  }}>
                    50% OFF — new members only
                  </span>
                </div>

                {/* Checkout button — free tier has no Stripe price, redirect to sign-up instead */}
                {selectedTier.stripePriceId ? (
                  <button
                    style={{
                      width: '100%',
                      background: C.signalCyan, color: '#000000',
                      border: 'none', padding: '14px',
                      fontFamily: F.mono, fontWeight: 500, fontSize: '12px',
                      letterSpacing: '0.1em', cursor: 'pointer',
                    }}
                    onClick={() => handleCheckout(selectedTier.slug)}
                  >
                    ACTIVATE {selectedTier.label.toUpperCase()} →
                  </button>
                ) : (
                  <a
                    href="/sign-up"
                    style={{
                      display: 'block', textAlign: 'center',
                      background: C.panel, color: C.signalCyan,
                      border: `1px solid ${C.borderEmphasis}`, padding: '14px',
                      fontFamily: F.mono, fontWeight: 500, fontSize: '12px',
                      letterSpacing: '0.1em', textDecoration: 'none',
                    }}
                  >
                    CREATE FREE ACCOUNT →
                  </a>
                )}

                <div style={{
                  textAlign: 'center', marginTop: '10px',
                  fontFamily: F.mono, fontSize: '10px', fontWeight: 400,
                  color: C.faint, letterSpacing: '0.06em',
                }}>
                  Secure payment via Stripe · Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
