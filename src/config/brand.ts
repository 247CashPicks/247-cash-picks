export const BRAND = {
  slug:         'datanexus',                        // DB KEY — never change, used in all Supabase queries
  name:         'The Analytics Community',
  tagline:      'Run the model. Beat the line.',
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
      description: 'Browse the platform and preview the signal feed in teaser mode. No signals or tools access.',
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
    underdogCode:      'XOTICPAPI',
    prizepicksCode:    'PRZX81V5Z',
    newMemberDiscount: 50,
  },
}

export type TierSlug = 'free' | 'core' | 'signal' | 'analyst' | 'vector' | 'nexus'
export type ToolKey  = 'projection_runner' | 'matchup_builder' | 'lineup_adjuster' | 'backtester'

export const TIER_ORDER: TierSlug[] = ['free', 'core', 'signal', 'analyst', 'vector', 'nexus']

export function tierIndex(tier: TierSlug): number {
  return TIER_ORDER.indexOf(tier)
}

export function canAccess(userTier: TierSlug | null, required: TierSlug): boolean {
  if (!userTier) return false
  return tierIndex(userTier) >= tierIndex(required)
}

export const TOOL_MIN_TIERS: Record<ToolKey, TierSlug> = {
  projection_runner: 'analyst',
  matchup_builder:   'vector',
  lineup_adjuster:   'vector',
  backtester:        'nexus',
}

export function canUseTool(userTier: TierSlug | null, tool: ToolKey): boolean {
  return canAccess(userTier, TOOL_MIN_TIERS[tool])
}

export function getTierBySlug(slug: string) {
  return BRAND.tiers.find(t => t.slug === slug) || null
}

export function getTierByPriceId(priceId: string) {
  return BRAND.tiers.find(t => t.stripePriceId === priceId) || null
}

export const TIER_FEATURES: Record<TierSlug, Record<string, boolean | number | null>> = {
  free: {
    daily_signals: false, signals_limit: 0, full_signal_slate: false,
    accuracy_index: false, projection_viewer: false, projection_runner: false,
    matchup_builder: false, lineup_adjuster: false, backtester: false,
    early_access: false, guarantee: false, consulting: false,
    insider_group: false, raw_export: false, custom_league_avgs: false,
  },
  core: {
    daily_signals: true, signals_limit: 3, full_signal_slate: false,
    accuracy_index: false, projection_viewer: false, projection_runner: false,
    matchup_builder: false, lineup_adjuster: false, backtester: false,
    early_access: false, guarantee: true, consulting: false,
    insider_group: false, raw_export: false, custom_league_avgs: false,
  },
  signal: {
    daily_signals: true, signals_limit: null, full_signal_slate: true,
    accuracy_index: true, projection_viewer: true, projection_runner: false,
    matchup_builder: false, lineup_adjuster: false, backtester: false,
    early_access: false, guarantee: true, consulting: false,
    insider_group: false, raw_export: false, custom_league_avgs: false,
  },
  analyst: {
    daily_signals: true, signals_limit: null, full_signal_slate: true,
    accuracy_index: true, projection_viewer: true, projection_runner: true,
    matchup_builder: false, lineup_adjuster: false, backtester: false,
    early_access: false, guarantee: true, consulting: false,
    insider_group: false, raw_export: false, custom_league_avgs: false,
  },
  vector: {
    daily_signals: true, signals_limit: null, full_signal_slate: true,
    accuracy_index: true, projection_viewer: true, projection_runner: true,
    matchup_builder: true, lineup_adjuster: true, backtester: false,
    early_access: true, guarantee: true, consulting: false,
    insider_group: true, raw_export: false, custom_league_avgs: false,
  },
  nexus: {
    daily_signals: true, signals_limit: null, full_signal_slate: true,
    accuracy_index: true, projection_viewer: true, projection_runner: true,
    matchup_builder: true, lineup_adjuster: true, backtester: true,
    early_access: true, guarantee: true, consulting: true,
    insider_group: true, raw_export: true, custom_league_avgs: true,
  },
}

export function hasFeature(tier: TierSlug, feature: string): boolean {
  return !!TIER_FEATURES[tier]?.[feature]
}
