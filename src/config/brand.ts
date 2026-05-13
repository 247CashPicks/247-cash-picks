export const BRAND = {
  slug:         'datanexus',
  name:         'DataNexus',
  tagline:      'Model. Analyze. Project.',
  subTagline:   'The analytics engine serious analysts run on.',
  domain:       'www.datanexus.ai',
  supportEmail: 'support@datanexus.ai',
  supabaseUrl:  'https://pdqyolxcnlbsxenmcxwg.supabase.co',

  colors: {
    primary:      '#07080E',
    surface:      '#0F1018',
    surface2:     '#1C1A2E',
    accent:       '#6D28D9',
    accentLight:  '#A78BFA',
    signal:       '#38BDF8',
    confirm:      '#34D399',
    alert:        '#F87171',
    caution:      '#FBBF24',
    text:         '#F1F0FF',
    textMuted:    '#94A3B8',
    border:       'rgba(167, 139, 250, 0.15)',
    borderStrong: 'rgba(167, 139, 250, 0.35)',
  },

  fonts: {
    heading: "'Space Grotesk', sans-serif",
    body:    "'Inter', sans-serif",
    mono:    "'JetBrains Mono', 'Fira Code', monospace",
  },

  tiers: [
    {
      slug: 'core', label: 'Core', priceMonthly: 199, stripePriceId: '',
      mostPopular: false, color: '#34D399', gem: '◈', badge: 'Entry Node',
      description: 'Daily signal outputs delivered. Your entry point into the DataNexus system.',
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

export type TierSlug = 'core' | 'signal' | 'analyst' | 'vector' | 'nexus'
export type ToolKey  = 'projection_runner' | 'matchup_builder' | 'lineup_adjuster' | 'backtester'

export const TIER_ORDER: TierSlug[] = ['core', 'signal', 'analyst', 'vector', 'nexus']

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
