'use client'

import { useState } from 'react'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

const FEATURE_LABELS: Record<string, string> = {
  daily_signals:       'Daily signals delivered',
  full_signal_slate:   'Full signal slate',
  accuracy_index:      'Accuracy Index access',
  projection_viewer:   'Projection viewer (read-only)',
  projection_runner:   'Projection Engine — run the model',
  matchup_builder:     'Matchup Matrix',
  lineup_adjuster:     'Lineup Calibrator',
  backtester:          'Historical Accuracy Index',
  early_access:        'Early access signals',
  guarantee:           'Signal Guarantee',
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
  core:    { daily_signals: true, guarantee: true },
  signal:  { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, guarantee: true },
  analyst: { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, projection_runner: true, guarantee: true },
  vector:  { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, projection_runner: true, matchup_builder: true, lineup_adjuster: true, early_access: true, guarantee: true, insider_group: true },
  nexus:   { daily_signals: true, full_signal_slate: true, accuracy_index: true, projection_viewer: true, projection_runner: true, matchup_builder: true, lineup_adjuster: true, backtester: true, early_access: true, guarantee: true, insider_group: true },
}

function tierRgb(color: string): string {
  if (color === '#34D399') return '52,211,153'
  if (color === '#38BDF8') return '56,189,248'
  if (color === '#818CF8') return '129,140,248'
  if (color === '#E9D5FF') return '233,213,255'
  return '167,139,250'
}

export default function JoinPage() {
  const [selected, setSelected] = useState<string>('vector')

  const selectedTier = BRAND.tiers.find(t => t.slug === selected)!
  const rgb = tierRgb(selectedTier.color)

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '48px 40px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
          color: C.accentLight, letterSpacing: '2px', marginBottom: '12px',
        }}>
          ACCESS TIERS
        </div>
        <h1 style={{
          fontFamily: F.heading, fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 900, lineHeight: 1, margin: '0 0 16px',
        }}>
          JOIN DATANEXUS
        </h1>
        <p style={{ color: C.textMuted, fontSize: '16px', margin: 0 }}>
          Monthly billing only. Cancel anytime. Signal Guarantee on all tiers.
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>

        {/* Tier selector */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px', marginBottom: '40px',
        }}>
          {BRAND.tiers.map((tier) => (
            <button
              key={tier.slug}
              onClick={() => setSelected(tier.slug)}
              style={{
                background: selected === tier.slug ? C.surface2 : C.surface,
                border: `2px solid ${selected === tier.slug ? tier.color : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px', padding: '20px 12px', cursor: 'pointer',
                textAlign: 'center', position: 'relative',
                transform: selected === tier.slug ? 'scale(1.02)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tier.mostPopular && (
                <div style={{
                  position: 'absolute', top: '-10px', left: '50%',
                  transform: 'translateX(-50%)',
                  background: tier.color, color: '#07080E',
                  fontFamily: F.heading, fontWeight: 900, fontSize: '9px',
                  padding: '3px 10px', borderRadius: '100px',
                  whiteSpace: 'nowrap', letterSpacing: '0.5px',
                }}>
                  MOST SELECTED
                </div>
              )}
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{tier.gem}</div>
              <div style={{
                fontFamily: F.heading, fontSize: '16px', fontWeight: 900,
                color: selected === tier.slug ? tier.color : '#fff',
                letterSpacing: '0.5px',
              }}>
                {tier.label.toUpperCase()}
              </div>
              <div style={{
                fontFamily: F.heading, fontSize: '22px', fontWeight: 900,
                color: selected === tier.slug ? tier.color : C.textMuted,
                marginTop: '4px',
              }}>
                ${tier.priceMonthly}
              </div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>/mo</div>
            </button>
          ))}
        </div>

        {/* Selected tier detail */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '32px', alignItems: 'start',
        }}>

          {/* Features list */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '20px', padding: '36px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ fontSize: '36px' }}>{selectedTier.gem}</span>
              <div>
                <div style={{
                  fontFamily: F.heading, fontSize: '28px', fontWeight: 900,
                  color: selectedTier.color, letterSpacing: '0.5px',
                }}>
                  {selectedTier.label.toUpperCase()}
                </div>
                <div style={{ color: C.textMuted, fontSize: '14px' }}>
                  {selectedTier.description}
                </div>
              </div>
            </div>

            <div>
              {KEY_FEATURES.map((feat) => {
                const hasIt = !!(TIER_FEATURE_MAP[selectedTier.slug]?.[feat])
                return (
                  <div key={feat} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    opacity: hasIt ? 1 : 0.35,
                  }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                      background: hasIt ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${hasIt ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', color: hasIt ? C.confirm : C.textMuted,
                    }}>
                      {hasIt ? '✓' : '—'}
                    </span>
                    <span style={{ fontSize: '14px', color: hasIt ? '#fff' : C.textMuted }}>
                      {FEATURE_LABELS[feat]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Checkout panel */}
          <div>
            <div style={{
              background: C.surface2,
              border: `2px solid ${selectedTier.color}`,
              borderRadius: '20px', padding: '36px',
              marginBottom: '16px',
            }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '8px' }}>
                  Selected plan
                </div>
                <div style={{
                  fontFamily: F.heading, fontSize: '32px', fontWeight: 900,
                  color: selectedTier.color,
                }}>
                  {selectedTier.label} — ${selectedTier.priceMonthly}/mo
                </div>
              </div>

              <div style={{
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: '10px', padding: '16px',
                marginBottom: '24px', fontSize: '14px',
                color: C.textMuted, lineHeight: 1.6,
              }}>
                🏆 <strong style={{ color: '#fff' }}>Signal Guarantee</strong> included —
                if your first signals don&apos;t hit, you receive a full credit refund.
              </div>

              <div style={{
                background: 'rgba(52,211,153,0.06)',
                border: '1px solid rgba(52,211,153,0.15)',
                borderRadius: '10px', padding: '12px 16px',
                marginBottom: '24px', fontSize: '14px',
                color: C.confirm, fontWeight: 600, textAlign: 'center',
              }}>
                ⚡ 50% OFF your first month — new members only
              </div>

              <button
                style={{
                  width: '100%', background: selectedTier.color,
                  color: '#07080E',
                  border: 'none', padding: '18px', borderRadius: '10px',
                  fontFamily: F.heading, fontWeight: 800, fontSize: '20px',
                  letterSpacing: '0.5px', cursor: 'pointer',
                  boxShadow: `0 0 32px rgba(${rgb},0.2)`,
                }}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tierSlug: selectedTier.slug }),
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
                }}
              >
                Activate {selectedTier.label} Now →
              </button>

              <p style={{
                textAlign: 'center', fontSize: '12px',
                color: C.textMuted, margin: '12px 0 0',
              }}>
                Secure payment via Stripe. Cancel anytime.
              </p>
            </div>

            {/* Promo codes */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '14px', padding: '20px',
            }}>
              <div style={{
                fontSize: '12px', color: C.textMuted,
                letterSpacing: '1px', marginBottom: '12px', fontWeight: 700,
              }}>
                PARTNER PROMO CODES
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { platform: 'Underdog',   code: BRAND.promos.underdogCode,   color: C.signal },
                  { platform: 'PrizePicks', code: BRAND.promos.prizepicksCode, color: C.accentLight },
                ].map((p) => (
                  <div key={p.platform} style={{
                    background: C.surface2, borderRadius: '8px',
                    padding: '10px 12px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>
                      {p.platform}
                    </div>
                    <div style={{
                      fontFamily: F.heading, fontSize: '16px', fontWeight: 900,
                      color: p.color, letterSpacing: '1px',
                    }}>
                      {p.code}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
