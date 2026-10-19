import { auth } from '@clerk/nextjs/server'

/**
 * Server-side client for the backend's operator API.
 *
 * The browser never talks to the backend directly and never holds BACKEND_URL.
 * It calls this app's own /api/operator/* proxy, which attaches the caller's
 * OWN Clerk token — so the proxy adds no authority it did not already have.
 * The backend decides whether that person is an operator; nothing here does.
 *
 * Deliberately NOT the cron secret. The command center runs in a browser, and a
 * browser holding the cron secret is the secret leaked — it opens every
 * /agents/* route including the ones that publish.
 */

// The linked 247 Sports Intel Vercel project names this server-only setting
// DATANEXUS_BACKEND_URL.  Keep BACKEND_URL as the legacy/local alias so the
// operator surface can run in either deployment without copying a secret.
export const BACKEND_URL = process.env.DATANEXUS_BACKEND_URL
  || process.env.BACKEND_URL
  || ''

/** Paths this app will proxy. A catch-all that forwarded anything would let a
 *  signed-in subscriber reach routes the operator API does not own. */
export const ALLOWED_PREFIX = '/operator/'

export interface OperatorResult<T> {
  ok: boolean
  status: number
  data: T | null
  /** The backend's own message, surfaced verbatim. Never reworded: a bounds
   *  or constraint rejection is the most useful sentence on the screen. */
  error: string | null
  rule: string | null
  indicatorKey: string | null
}

function readError(status: number, body: unknown): Omit<OperatorResult<never>, 'ok' | 'status' | 'data'> {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') {
    return { error: detail, rule: null, indicatorKey: null }
  }
  if (detail && typeof detail === 'object') {
    const d = detail as Record<string, string>
    return {
      error: d.error ?? JSON.stringify(detail),
      rule: d.rule ?? null,
      indicatorKey: d.indicator_key ?? null,
    }
  }
  return { error: `Request failed (${status})`, rule: null, indicatorKey: null }
}

/**
 * Call the backend operator API as the signed-in user.
 *
 * Returns a result rather than throwing: every panel renders its own error, and
 * a thrown fetch would take the whole page down when one panel's backend call
 * fails. A panel that fails must render its error, not a blank.
 */
export async function operatorFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<OperatorResult<T>> {
  if (!path.startsWith(ALLOWED_PREFIX)) {
    return { ok: false, status: 400, data: null,
             error: `Refusing to proxy ${path}`, rule: null, indicatorKey: null }
  }
  if (!BACKEND_URL) {
    return { ok: false, status: 503, data: null,
             error: 'BACKEND_URL is not configured for this deployment.',
             rule: null, indicatorKey: null }
  }

  const { getToken } = await auth()
  const token = await getToken()
  if (!token) {
    return { ok: false, status: 401, data: null,
             error: 'Not signed in.', rule: null, indicatorKey: null }
  }

  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
      // The backend's preview-run projects a whole slate; the default fetch
      // timeout would cut it off mid-run and report a failure that did not
      // happen.
      signal: AbortSignal.timeout(55_000),
      cache: 'no-store',
    })
  } catch (e) {
    return { ok: false, status: 504, data: null,
             error: e instanceof Error ? e.message : 'Backend unreachable',
             rule: null, indicatorKey: null }
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    return { ok: false, status: res.status, data: null, ...readError(res.status, body) }
  }
  return { ok: true, status: res.status, data: body as T,
           error: null, rule: null, indicatorKey: null }
}

// ── Shapes, mirroring docs/operator_indicator_api.md ────────────────────────

export interface OperatorMe {
  clerk_user_id: string
  email: string
  display_name: string
  role: 'owner' | 'operator'
  is_owner: boolean
  can_promote: boolean
}

export interface Indicator {
  key: string
  display_name: string
  description: string
  category: 'projection_factor' | 'confidence' | 'selection' | 'guard' | 'diagnostic'
  league: string
  value_type: 'boolean' | 'numeric' | 'computed_numeric'
  value: boolean | number | null
  default_value: boolean | number | null
  min_value: number | null
  max_value: number | null
  bounds_source: string | null
  toggleable: boolean
  engine_param: string
  backtest_verdict: string | null
  backtest_effect: Record<string, { mae_delta?: number; delta?: number; ci?: [number, number] }> | null
  backtest_report_path: string | null
  source_file: string
  runtime_only?: boolean
  formula?: string | null
  formula_version?: string | null
  polarity?: { positive: string; negative: string } | null
  thresholds?: Record<string, number | string> | null
  unit?: string | null
  status?: string | null
  confidence?: string | null
  provenance?: Record<string, unknown> | null
  freshness?: Record<string, unknown> | null
  applicability?: Array<{ unit: string; comparison: string }>
}

export interface IndicatorsResponse {
  league: string
  /** WHICH configuration these values came from. The panel asserts this
   *  against the config it believes it is editing — controls bound to a
   *  preview while the values came from live is the exact defect that made
   *  every edit look like it did nothing. */
  config_id: string | null
  config_source: string
  config_name: string | null
  config_status: 'live' | 'preview'
  total: number
  limit: number
  offset: number
  indicators: Indicator[]
  constraints: {
    rule: string; kind: string; left_key: string; right_key: string
    description: string
  }[]
}

export interface NbaFatigueSample {
  opportunities: number
  appearances: number
  dnp_or_inactive: number
  total_minutes: number
  mean_minutes: number | null
  minutes_variance: number | null
}

export interface NbaFatigueDelta {
  conditioned_mean: number | null
  baseline_mean: number | null
  conditioned_variance: number | null
  baseline_variance: number | null
  raw_delta: number | null
  raw_percent_delta: number | null
  shrink_factor: number
  shrunk_delta: number | null
  shrunk_percent_delta: number | null
  standard_error?: number | null
  signal_to_noise_abs?: number | null
}

export interface NbaFatigueComparison {
  status: 'Ready' | 'Unknown'
  confidence: 'low' | 'medium' | 'high' | 'unknown'
  insufficient_reasons: string[]
  conditioned_sample: NbaFatigueSample
  baseline_sample: NbaFatigueSample
  minutes: NbaFatigueDelta
  metrics: Record<string, {
    per_game: NbaFatigueDelta
    per_minute: NbaFatigueDelta
  }>
}

export interface NbaFatigueCondition {
  overall: NbaFatigueComparison
  by_season: Array<{ season: string } & NbaFatigueComparison>
  recent_season_weighted: {
    status: 'Ready' | 'Unknown'
    season_weights: Record<string, number>
    metrics: Record<string, {
      per_game: { weighted_shrunk_delta: number | null }
      per_minute: { weighted_shrunk_delta: number | null }
    }>
  }
}

export interface NbaFatiguePlayer {
  player_id: string
  player_name: string
  player_name_aliases: string[]
  season_type: 'Regular Season' | 'Playoffs'
  scope: { seasons: string[]; start_date: string | null; end_date: string | null }
  flags: {
    team_change: boolean
    teams: string[]
    role_change: boolean
    roles: string[]
    starter_states: boolean[]
    injury_affected_games: number
    injury_context_missing_games: number
    minutes_restriction_games: number
    availability_complete: boolean
    survivorship_bias_risk: boolean
  }
  conditions: {
    back_to_back: NbaFatigueCondition
    third_game_in_four_nights: NbaFatigueCondition
  }
}

export interface NbaScheduleFatigueResult {
  status: 'success'
  indicator: {
    key: 'nba_schedule_fatigue_effect'
    formula_version: string
    preview_only: true
    production_eligible: false
  }
  scope: { seasons: string[]; start_date: string | null; end_date: string | null }
  players: NbaFatiguePlayer[]
  provenance: {
    schedule: Record<string, unknown>
    box_scores: Record<string, unknown>
    reconciliation: Record<string, unknown> | null
  }
  audit: {
    input_snapshot_sha256: string
    formula_version: string
    computed_at: string
    logged?: boolean
  }
  isolation: {
    preview_only: true
    production_eligible: false
    official_projection_mutated: false
    selection_mutated: false
    publication_mutated: false
  }
}

export interface IndicatorConfig {
  id: string
  name: string
  league: string
  status: 'live' | 'preview' | 'archived'
  created_by: string
  created_at: string
  promoted_at: string | null
  promoted_by: string | null
  parent_config_id: string | null
  note: string | null
}

export interface CompareResponse {
  league: string
  config_id: string
  /** The window ACTUALLY previewed, derived from the preview rows themselves.
   *  Not the window that was asked for: a preview covering one day of a
   *  six-day request used to come back labelled with all six days, so the
   *  operator read a one-day result as a week's verdict. */
  window: { start: string; end: string }
  requested_window: { start: string; end: string }
  dates_previewed: string[]
  /** False when the preview covered less than was asked for. The panel says so
   *  rather than letting a partial result read as a complete one. */
  covers_requested_window: boolean
  rows: {
    player_name: string; team: string | null; game_date: string; stat: string
    live_projection: number | null; preview_projection: number | null
    delta: number; line: number | null
    live_edge_pct: number | null; preview_edge_pct: number | null
    staged_selection_changes: boolean
  }[]
  summary: {
    rows_compared: number
    rows_changed: number
    mean_abs_delta_per_stat: Record<string, number>
    would_stage: { live: number; preview: number }
    would_stage_delta: number
    staged_selections_affected: number
  }
  staged_selection_changes: {
    player_name: string; stat: string; game_date: string; status: string
    staged_edge_pct: number | null; preview_edge_pct: number | null
    direction_change: { from: string; to: string } | null
  }[]
}

export interface AuditEntry {
  id: string
  config_id: string | null
  indicator_key: string | null
  event: string
  old_value: unknown
  new_value: unknown
  actor: string
  actor_user_id: string | null
  at: string
  note: string | null
}

/** nfl_schedule_context, carried inside the run-health report.
 *
 *  The week an NFL preview should run is the scheduler's answer, resolved from
 *  nflverse schedule dates. The browser must not derive a week from a date —
 *  that is a second implementation waiting to disagree with the first. */
export interface NflScheduleContext {
  season: number
  week: number
  reference_game_date: string
  target_date: string
  source: string
  game_type: string | null
}

/** One row of agents/agent_health.run()'s `agents` array. Field names verified
 *  against the live report, not inferred from the panel that renders them. */
export interface AgentHealthRow {
  agent_name: string
  league: string
  expected_now: boolean
  stale: boolean
  latest_failed: boolean
  needs_attention: boolean
  last_attempt_at: string | null
  last_attempt_status: string | null
  last_attempt_triggered_by: string | null
  last_successful_at: string | null
  healthy_age_hours: number | null
  last_error: string | null
}

/** What a preview run actually did, so the client never has to guess.
 *
 *  An NFL week resolves to its own dates inside the projector; a date range is
 *  looped by the route. Either way the compare that follows uses `window` from
 *  here rather than re-deriving it in the browser. */
export interface PreviewRunResponse {
  status: string
  league: string
  config_id: string
  run_kind: string
  actor: string
  requested_window: { start: string | null; end: string | null }
  window: { start: string; end: string } | null
  dates_previewed: string[]
  results: unknown[]
}

/** A window's selections in every state, with the counts that let an empty
 *  panel explain itself instead of rendering a bare blank. */
export interface StagedSlateResponse {
  league: string
  limit: number
  offset: number
  window: {
    start: string | null
    end: string | null
    week: number | null
    /** An explicit request, the NFL schedule week, Eastern today for NBA, or
     *  no stored schedule from which to resolve an NFL week. */
    source: 'requested' | 'schedule_week' | 'eastern_today' | 'no_schedule'
  }
  counts: Record<string, number>
  total: number
  pending: number
  selections: StagedSelection[]
}

export interface StagedSelection {
  id: string
  player_name: string
  team: string | null
  stat_type: string
  line: number
  our_projection: number
  direction: string
  edge_pct: number | null
  confidence: string
  tier_required: string
  status: string
  game_date: string
  platform: string | null
  line_pulled: boolean
  rebound_context?: ReboundContextResult
  provenance: {
    config_id: string | null
    config_name: string | null
    agent_run_id: string | null
    agent_run_short: string | null
    snapshot_hash_short: string | null
  }
}

export interface ReboundContextComponent {
  name: string
  raw_percent: number
  weight: number
  weighted_points: number
  detail: string
}

export interface ReboundContextResult {
  status: 'ready' | 'unknown'
  color: 'red' | 'yellow' | 'green' | 'gray'
  icon: '▼' | '●' | '▲' | '?'
  label: 'Toughest / caution' | 'Neutral' | 'Favorable' | 'Unknown'
  score: number | null
  confidence: 'low' | 'medium' | 'high' | 'unknown'
  reasons: string[]
  components: ReboundContextComponent[]
  formula_version: 'nba-rebound-context-v1'
  thresholds: { red_below: number; green_at_or_above: number }
}

export interface NbaCareerReboundPlayer {
  rank: number | null
  player_name: string
  current_team: string
  position: string
  roster_class: 'active_roster' | 'two_way' | 'unmatched_official_roster'
  career_games: number | null
  career_minutes: number | null
  career_orb_per_100: number | null
  career_drb_per_100: number | null
  career_trb_per_100: number | null
  sample_status: string
  confidence: string
  freshness: string
  official_roster_source: string
  career_source: string
  retrieval_date: string
}

export interface NbaCareerReboundingResponse {
  status: 'ready'
  manifest: {
    metric: string
    retrieval_date: string
    official_roster_count: number
    ranked_player_count: number
    no_career_metric_count: number
    unmatched_official_count: number
    bref_non_official_edge_case_count: number
    sources: string[]
    definition_guard: string
  }
  players: NbaCareerReboundPlayer[]
}

export interface ConfirmSelectionsResponse {
  status: string
  league: string
  actor: string
  requested: number
  confirmed: number
  published: number
  already_confirmed: number
  already_published: number
  audit_logged: boolean
  errors: string[]
}

export interface ExternalLineRanksResponse {
  status: string
  league: string
  actor: string
  season: number
  week: number
  source: string
  rows_written: number
  audit_logged: boolean
}

export interface ProjectionScenarioPlayerOption {
  player_name: string
  team: string | null
  opponent_team: string | null
  position: string | null
  projected_minutes: number | null
  is_starter: boolean | null
}

export interface ProjectionScenarioGameOption {
  id: string
  game_date: string
  tip_time: string | null
  home_team: string | null
  away_team: string | null
  players: ProjectionScenarioPlayerOption[]
}

export interface ProjectionScenarioOptions {
  league: 'NBA'
  game_date: string
  games: ProjectionScenarioGameOption[]
}

export interface ProjectionScenarioField {
  key: string
  label: string
  type: 'number' | 'boolean'
  category: string
  minimum?: number
  maximum?: number
  nullable: boolean
}

export interface ProjectionScenarioTiming {
  game_start: string
  server_time: string
  seconds_to_tip: number
  minutes_to_tip: number
  inside_final_30: boolean
  game_started: boolean
  urgency: 'pregame' | 'final_30_minutes' | 'started'
}

export interface ProjectionScenarioSource {
  league: 'NBA'
  game_id: string
  game_date: string
  tip_time: string
  player_name: string
  team: string | null
  opponent_team: string | null
  position: string | null
  inputs: Record<string, unknown>
  source_timestamps: Record<string, string | null>
  indicator_config: {
    id: string | null
    name: string | null
    source: string
    snapshot_hash: string | null
  }
  official_projection: Record<string, unknown> | null
}

export interface ProjectionScenarioSourceResponse {
  source: ProjectionScenarioSource
  original_outputs: Record<string, number | null>
  timing: ProjectionScenarioTiming
  fields: ProjectionScenarioField[]
  isolation: {
    official_projection_mutated: false
    published_projection_mutated: false
  }
}

export interface ProjectionScenario {
  id: string
  league: 'NBA'
  game_id: string
  game_date: string
  tip_time: string
  player_name: string
  team: string | null
  status: 'draft' | 'finalized'
  reason: string
  source_snapshot: ProjectionScenarioSource
  overrides: Record<string, unknown>
  outputs: Record<string, number | null>
  actor_user_id: string
  actor_display_name: string
  created_at?: string
  updated_at?: string
  finalized_at?: string | null
  timing: ProjectionScenarioTiming
  fields: ProjectionScenarioField[]
}

export interface ProjectionScenarioAuditEvent {
  id: string | number
  scenario_id: string
  actor_user_id: string
  actor_display_name: string
  action: 'create' | 'update' | 'reset' | 'finalize'
  field: string | null
  old_value: unknown
  new_value: unknown
  reason: string
  created_at: string
}

export interface NbaRotationProvenance {
  source_name: string
  source_url: string
  license?: string
  retrieved_at: string
  season: '2025-26'
  season_type: 'Regular Season'
  per_mode?: string
  definition: string
  source_team?: string
  destination_team?: string
}

export interface NbaPaceDriverEvidence {
  verified: true
  team_pace_on: number
  team_pace_off: number
  team_pace_delta: number
  opponent_pace_on: number | null
  opponent_pace_off: number | null
  opponent_pace_delta: number | null
  minutes_on: number
  sample_games: number
  confidence: 'low' | 'medium' | 'high'
  provenance: NbaRotationProvenance
  causality_note: string
}

export interface NbaRotationPlayer {
  slot: number
  player_id: string | null
  player_name: string
  pace: number | null
  usage_pct: number | null
  sample_games?: number | null
  sample_minutes?: number | null
  sample_confidence?: 'low' | 'medium' | 'high' | null
  current_team?: string | null
  roster_source_url?: string | null
  roster_verified_at?: string | null
  provisional_baseline?: true
  pace_driver?: NbaPaceDriverEvidence | null
  provenance: NbaRotationProvenance | null
}

export interface NbaEffectiveRotationSlot {
  slot: number
  unit: 'starter' | 'bench'
  original: NbaRotationPlayer
  override: NbaRotationPlayer | null
  effective: NbaRotationPlayer
}

export interface NbaUnitPace {
  unit: 'starter' | 'bench'
  ready: boolean
  errors: string[]
  average_pace: number | null
  league_average_pace: number
  league_average_pace_context: NbaLeagueAveragePaceContext
  vs_league_delta: number | null
  label_vs_league: 'pace-up' | 'pace-down' | 'neutral' | null
  own_unit_pace: NbaPaceIndicatorValue
}

export interface NbaLeagueAveragePaceContext {
  value: number
  raw_value: number
  unit: 'possessions_per_48_minutes'
  season: '2025-26'
  season_type: 'Regular Season'
  definition: string
  source_name: string
  source_url: string
  source_sha256: string
  license: string
  retrieved_at: string
  teams: number
  team_games: number
  model_contract_precision: number
}

export interface NbaPaceIndicatorValue {
  indicator_key: 'nba_opponent_pace_effect_pct'
  name: 'Opponent Pace Effect'
  formula_version: '1.0.0'
  formula: string
  unit: 'percent'
  polarity: { positive: 'favorable'; negative: 'unfavorable' }
  thresholds: {
    pace_up_min_pct: number
    pace_down_max_pct: number
    neutral_absolute_lt_pct: number
    display_decimal_places: 1
    rounding_mode: 'ROUND_HALF_UP'
  }
  value: number | null
  value_full_precision: string | null
  display_value: number | null
  status: 'pace_up' | 'pace_down' | 'neutral' | 'unknown'
  symbol: '+' | '-' | '=' | '?'
  text: string
  screen_reader_label: string
  confidence: 'low' | 'medium' | 'high' | 'unavailable'
  provenance: Record<string, unknown>
  freshness: Record<string, unknown>
  applicability: {
    league: 'NBA'; unit: 'starter' | 'bench'; comparison: string
    role: 'own_unit' | 'matchup_pace_effect'; opponent_team: string | null
    team?: string | null
  }
  league_average: NbaLeagueAveragePaceContext
}

export interface NbaRotationEvaluation {
  ready: boolean
  heuristic_label: string
  baseline_label: string
  errors: string[]
  slots: NbaEffectiveRotationSlot[]
  starters: NbaUnitPace
  bench: NbaUnitPace
  blended: { pace: number; weights: { starter: number; bench: number } } | null
  blend_note: string | null
  weighting_mode: 'arithmetic'
  usage_note: string
  pace_drivers: Array<{
    slot: number
    player_id: string | null
    player_name: string
    usage_pct: number | null
    status: 'verified' | 'not verified'
    evidence: NbaPaceDriverEvidence | null
    descriptive_only: true
  }>
  pace_driver_rankings: Array<{
    slot: number
    player_id: string | null
    player_name: string
    team_pace_delta: number
    direction: 'increaser' | 'decreaser' | 'neutral'
    magnitude: number
    minutes_on: number
    sample_games: number
    confidence: 'low' | 'medium' | 'high'
  }>
  influence_adjustment: { enabled: false; mode: 'off'; reason: string }
}

export interface NbaRotation {
  id: string
  league: 'NBA'
  season: '2026-27'
  team: string
  status: 'draft'
  source_slots: NbaRotationPlayer[]
  slot_overrides: Record<string, NbaRotationPlayer>
  blend_weights: { starter: number; bench: number } | null
  reason: string
  actor_user_id: string
  actor_display_name: string
  created_at?: string
  updated_at?: string
  evaluation: NbaRotationEvaluation
}

export interface NbaRotationListResponse {
  league: 'NBA'
  season: '2026-27'
  league_average_pace: number
  league_average_pace_context: NbaLeagueAveragePaceContext
  pace_season: '2025-26'
  pace_definition: string
  indicator_definitions: Array<Record<string, unknown>>
  rotations: NbaRotation[]
}

export interface NbaRotationAuditEvent {
  id: string | number
  rotation_id: string
  actor_user_id: string
  actor_display_name: string
  action: 'create' | 'update' | 'reset'
  field: string
  old_value: unknown
  new_value: unknown
  reason: string
  created_at: string
}

export interface NbaRotationMatchup {
  season: string
  team: NbaRotation
  opponent: NbaRotation
  comparison: {
    ready: boolean
    errors: string[]
    indicator_definition: Record<string, unknown>
    starters: NbaRotationUnitMatchup | null
    bench: NbaRotationUnitMatchup | null
    players: Array<{ slot: number; player_name: string; unit: string; comparison: unknown }>
  }
}

export interface NbaRotationUnitMatchup {
  team_pace: number
  opponent_pace: number
  delta: number
  label: string
  own_unit_pace: NbaPaceIndicatorValue
  matchup_pace_effect: NbaPaceIndicatorValue
  supporting_raw_values: {
    team_unit_projected_pace: number
    opponent_unit_projected_pace: number
    verified_league_average_pace: number
    team_minus_opponent_pace: number
  }
}

export interface NbaUsagePlayer {
  player_id: string
  player_name: string
  prior_team: string | null
  current_team: string | null
  has_prior_nba_sample: boolean
  usg_pct: number | null
  possessions: number | null
  minutes: number | null
  games: number | null
  confidence: string | null
  position: string | null
  active: boolean
  depth_slot: number | null
  projected_minutes: number | null
  projected_role: 'starter' | 'bench' | 'out_of_rotation' | null
  prior_role: 'starter' | 'bench' | null
  prior_primary_handler: boolean | null
  projected_primary_handler: boolean | null
  usage_adjustment_pct: number
  usage_adjustment_reason: string | null
  lineup_overlap: string | null
  primary_handler_context: string | null
  roster_source_url: string | null
  roster_verified_at: string | null
  provenance: NbaRotationProvenance | null
}

export interface NbaUsageContributor {
  player_id: string
  original: NbaUsagePlayer
  override: NbaUsagePlayer | null
  effective: NbaUsagePlayer
  classification: 'incoming' | 'outgoing' | 'returning'
  exposure_basis: 'possessions' | 'minutes' | null
  usage_load_per_1000: number | null
}

export interface NbaUsageAnalysisResult {
  team: string
  ready: boolean
  errors: string[]
  method: string
  exposure_basis: 'possessions' | 'minutes' | null
  outgoing_load: number | null
  incoming_load: number | null
  net_load: number | null
  depth_chart_ready: boolean
  depth_chart_errors: string[]
  active_incoming_load: number | null
  active_outgoing_load: number | null
  active_net_load: number | null
  active_method: string
  active_depth_slots: Array<{ slot: number; unit: 'starter' | 'bench'; player_name: string }>
  contributors: NbaUsageContributor[]
  unknown_newcomers: Array<{ player_id: string; player_name: string; reason: string }>
  returning_opportunities: Array<Record<string, unknown>>
  role_adjustments: {
    ready: boolean
    errors: string[]
    method: string
    players: Array<{
      player_id: string; player_name: string; original_usg_pct: number | null
      operator_adjustment_pct: number; effective_usg_pct: number | null
      prior_role: string; current_role: string
      prior_primary_handler: boolean | null
      projected_primary_handler: boolean | null
      hypothesis: string; projected_minutes: number | null
      lineup_overlap: string | null; primary_handler_context: string | null
      confidence: string; reason: string | null
      defaulted_to_no_change: boolean; label: string
    }>
  }
}

export interface NbaUsageDifferential {
  id: string
  league: 'NBA'
  season: '2026-27'
  team: string
  status: 'draft'
  source_players: NbaUsagePlayer[]
  player_overrides: Record<string, NbaUsagePlayer>
  reason: string
  actor_user_id: string
  actor_display_name: string
  analysis: NbaUsageAnalysisResult
}

export interface NbaUsageListResponse {
  league: 'NBA'
  season: '2026-27'
  analyses: NbaUsageDifferential[]
}
