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
  config_id: string | null
  config_source: string
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
  window: { start: string; end: string }
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
