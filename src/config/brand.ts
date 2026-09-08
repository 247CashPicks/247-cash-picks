export const BRAND = {
  slug:         'datanexus',                        // DB KEY — never change, used in all Supabase queries
  name:         'The Analytics Community',
  tagline:      'Run the model. See the gap.',
  subTagline:   'Not a pick service — the engine itself.',
  domain:       'theanalyticscommunity.com',
  supportEmail: 'support@theanalyticscommunity.com',
  supabaseUrl:  'https://pdqyolxcnlbsxenmcxwg.supabase.co',

  colors: {
    // ── Terminal palette (homepage + new components) ──────────────
    void:           '#000000',                      // primary background — pure black
    panel:          '#060809',                      // secondary surfaces, footer
    signalCyan:     '#2FD4E8',                      // THE accent: live/active/positive edge/primary CTA
    flagAmber:      '#E8A33D',                      // attention only: negative edge, warnings, LIVE pulse
    platinum:       '#C0CCD6',                      // primary readable text
    muted:          '#8593A0',                      // secondary text, descriptions
    dim:            '#5A6672',                      // labels, captions, table headers
    faint:          '#4A5560',                      // terminal prompt text, lowest-priority hints
    border:         'rgba(60,180,210,0.12)',         // hairline borders
    borderEmphasis: 'rgba(60,180,210,0.20)',         // emphasis borders
    // ── Legacy aliases (interior pages — do not use in new code) ──
    primary:        '#07080E',
    surface:        '#0F1018',
    surface2:       '#1C1A2E',
    accent:         '#6D28D9',
    accentLight:    '#A78BFA',
    signal:         '#38BDF8',
    confirm:        '#34D399',
    alert:          '#F87171',
    caution:        '#FBBF24',
    text:           '#F1F0FF',
    textMuted:      '#94A3B8',
    borderStrong:   'rgba(167, 139, 250, 0.35)',
  },

  fonts: {
    sans:    "'IBM Plex Sans', sans-serif",
    mono:    "'IBM Plex Mono', monospace",
    // legacy aliases for interior pages
    heading: "'IBM Plex Sans', sans-serif",
    body:    "'IBM Plex Sans', sans-serif",
  },

  tiers: [
    {
      slug: 'free', label: 'Observer', priceMonthly: 0, stripePriceId: '',
      mostPopular: false, color: '#5A6672', gem: '○', badge: 'Observer',
      description: 'Browse the platform and preview the signal feed. No signals or tools access.',
      picksLimit: 0,
    },
    {
      slug: 'core', label: 'Core', priceMonthly: 199, stripePriceId: '',
      mostPopular: false, color: '#34D399', gem: '◈', badge: 'Entry Node',
      description: 'Daily signal outputs delivered. Your entry point into the quantitative desk.',
      picksLimit: 3,
    },
    {
      slug: 'signal', label: 'Signal', priceMonthly: 349, stripePriceId: '',
      mostPopular: false, color: '#38BDF8', gem: '◉', badge: 'Signal Receiver',
      description: 'Full daily output slate plus read-only access to the projection data behind each signal.',
      picksLimit: null,
    },
    {
      slug: 'analyst', label: 'Analyst', priceMonthly: 549, stripePriceId: '',
      mostPopular: false, color: '#818CF8', gem: '⬡', badge: 'Model Operator',
      description: 'Run the projection model yourself. Input any player, any game. See the computed factors.',
      picksLimit: null,
    },
    {
      slug: 'vector', label: 'Vector', priceMonthly: 799, stripePriceId: '',
      mostPopular: true, color: '#A78BFA', gem: '◈', badge: 'Vector Analyst',
      description: 'Full model access plus the matchup and lineup intelligence layers.',
      picksLimit: null,
    },
    {
      slug: 'nexus', label: 'Nexus', priceMonthly: 1199, stripePriceId: '',
      mostPopular: false, color: '#E9D5FF', gem: '◎', badge: 'Nexus Operator',
      description: 'Complete system access. Backtest the model, export raw data, override league constants.',
      picksLimit: null,
    },
  ],

  promos: {
    newMemberDiscount: 50,
  },
}

/**
 * Tier vocabulary and gate logic live in ONE place: lib/picks/tiers.ts.
 *
 * This file previously re-declared TIER_ORDER, tierIndex, canAccess,
 * TOOL_MIN_TIERS, canUseTool, TIER_FEATURES and hasFeature verbatim, plus its
 * own copies of the TierSlug and ToolKey types — two sources of truth for
 * access control, and a third for the types they are keyed on. api/picks
 * imported BOTH, so the duplication was live, not dormant.
 *
 * Direction: lib/picks/tiers.ts is the source and brand.ts re-exports.
 *   - tiers.ts already imports its types from lib/picks/types.ts, the domain
 *     type home; keeping brand.ts as the source would have preserved the type
 *     duplication as well as the logic duplication.
 *   - Gate logic is domain logic. brand.ts is presentation config — colors,
 *     fonts, tier marketing copy, promo codes.
 *   - Re-exporting keeps every existing `@/config/brand` import working
 *     unchanged, so collapsing to one definition cost zero call-site churn.
 */
export type { TierSlug, ToolKey } from '@/lib/picks/types'
export {
  TIER_ORDER,
  tierIndex,
  canAccess,
  TOOL_MIN_TIERS,
  canUseTool,
  TIER_FEATURES,
  hasFeature,
} from '@/lib/picks/tiers'

export function getTierBySlug(slug: string) {
  return BRAND.tiers.find(t => t.slug === slug) || null
}

export function getTierByPriceId(priceId: string) {
  return BRAND.tiers.find(t => t.stripePriceId === priceId) || null
}
