import type { CompareResponse, PreviewRunResponse } from './client'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function strings(value: Record<string, unknown>, keys: string[]) {
  return keys.every(key => typeof value[key] === 'string')
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function nullableNumber(value: unknown) {
  return value === null || finite(value)
}

function finiteFields(value: Record<string, unknown>, keys: string[]) {
  return keys.every(key => finite(value[key]))
}

function day(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function window(value: unknown) {
  return record(value) && day(value.start) && day(value.end)
}

function dates(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(day)
}

function readinessFields(value: Record<string, unknown>) {
  return (value.publishing_blocked === undefined || typeof value.publishing_blocked === 'boolean')
    && (value.ready_for_review === undefined || typeof value.ready_for_review === 'boolean')
    && (value.reason === undefined || value.reason === null || typeof value.reason === 'string')
}

/** Validate the API boundary before any response enters renderable state. */
export function isPreviewRunResponse(value: unknown): value is PreviewRunResponse {
  return record(value) && (value.status === 'success' || value.status === 'partial')
    && strings(value, ['league', 'config_id', 'run_kind', 'actor'])
    && record(value.requested_window)
    && (value.requested_window.start === null || day(value.requested_window.start))
    && (value.requested_window.end === null || day(value.requested_window.end))
    && dates(value.dates_previewed)
    && (value.window === null ? value.dates_previewed.length === 0 : window(value.window))
    && Array.isArray(value.results)
    && readinessFields(value)
}

export function isCompareResponse(value: unknown): value is CompareResponse {
  if (!record(value) || !strings(value, ['league', 'config_id'])
      || (value.status !== undefined && value.status !== 'success') || !readinessFields(value)
      || !window(value.window) || !window(value.requested_window)
      || !dates(value.dates_previewed) || typeof value.covers_requested_window !== 'boolean'
      || !record(value.summary) || !record(value.summary.would_stage)
      || !record(value.summary.mean_abs_delta_per_stat)
      || !Object.values(value.summary.mean_abs_delta_per_stat).every(finite)
      || !finiteFields(value.summary,
        ['rows_compared', 'rows_changed', 'would_stage_delta', 'staged_selections_affected'])
      || !finite(value.summary.would_stage.live) || !finite(value.summary.would_stage.preview)
      || !Array.isArray(value.rows) || !Array.isArray(value.staged_selection_changes)) return false

  return value.rows.every(row => record(row)
    && strings(row, ['player_name', 'stat']) && day(row.game_date)
    && (row.team === null || typeof row.team === 'string')
    && ['live_projection', 'preview_projection', 'line', 'live_edge_pct', 'preview_edge_pct']
      .every(key => nullableNumber(row[key]))
    && finite(row.delta) && typeof row.staged_selection_changes === 'boolean')
    && value.staged_selection_changes.every(change => record(change)
      && strings(change, ['player_name', 'stat', 'status']) && day(change.game_date)
      && nullableNumber(change.staged_edge_pct) && nullableNumber(change.preview_edge_pct)
      && (change.direction_change === null || (record(change.direction_change)
        && strings(change.direction_change, ['from', 'to']))))
}
