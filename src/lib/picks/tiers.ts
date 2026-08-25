import type { TierSlug, ToolKey } from './types'

export const TIER_ORDER: TierSlug[] = [
  'free', 'core', 'signal', 'analyst', 'vector', 'nexus'
]

export function tierIndex(tier: TierSlug): number {
  return TIER_ORDER.indexOf(tier)
}

export function canAccess(
  userTier: TierSlug | null,
  required: TierSlug
): boolean {
  if (!userTier) return false
  return tierIndex(userTier) >= tierIndex(required)
}

export const TOOL_MIN_TIERS: Record<ToolKey, TierSlug> = {
  projection_runner: 'analyst',
  matchup_builder:   'vector',
  lineup_adjuster:   'vector',
  backtester:        'nexus',
}

export function canUseTool(
  userTier: TierSlug | null,
  tool: ToolKey
): boolean {
  return canAccess(userTier, TOOL_MIN_TIERS[tool])
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

export function hasFeature(
  tier: TierSlug,
  feature: string
): boolean {
  return !!TIER_FEATURES[tier]?.[feature]
}
