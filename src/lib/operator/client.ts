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

export const BACKEND_URL = process.env.BACKEND_URL || ''

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
  value_type: 'boolean' | 'numeric'
  value: boolean | number
  default_value: boolean | number
  min_value: number | null
  max_value: number | null
  bounds_source: string | null
  toggleable: boolean
  engine_param: string
  backtest_verdict: string | null
  backtest_effect: Record<string, { mae_delta?: number; delta?: number; ci?: [number, number] }> | null
  backtest_report_path: string | null
  source_file: string
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
    /** How the window was chosen: an explicit request, the league's upcoming
     *  game dates, the most recent slate on file, or nothing at all. */
    source: 'requested' | 'upcoming' | 'most_recent' | 'no_selections'
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
  provenance: {
    config_id: string | null
    config_name: string | null
    agent_run_id: string | null
    agent_run_short: string | null
    snapshot_hash_short: string | null
  }
}
