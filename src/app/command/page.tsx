import { requireOperatorPage } from '@/lib/operator/guard'
import { operatorFetch } from '@/lib/operator/client'
import type {
  AuditEntry, IndicatorConfig, IndicatorsResponse, StagedSlateResponse,
} from '@/lib/operator/client'
import CommandCenter from './CommandCenter'

/**
 * The command center.
 *
 * Server component: the guard runs before anything renders, and the first paint
 * already carries real data rather than a spinner that resolves into a page the
 * viewer may not be allowed to see.
 *
 * Every panel's data is fetched here in parallel and passed down. Each fetch
 * returns a result rather than throwing, so one failing backend call renders
 * that panel's error and leaves the other five working.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Command Center',
  // Operator surface. Not indexed, not linked, not discoverable.
  robots: { index: false, follow: false },
}

const LEAGUES = ['NFL', 'NBA'] as const

export default async function CommandPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; config?: string }>
}) {
  const me = await requireOperatorPage()

  const params = await searchParams
  const league = LEAGUES.includes(params.league as typeof LEAGUES[number])
    ? (params.league as string)
    : 'NFL'

  /**
   * The config being edited lives in the URL, not in client state.
   *
   * It has to, because the VALUES come from this server fetch. When selection
   * was client-only, the indicators were always fetched for the live config:
   * selecting a preview enabled the controls and PATCHed the preview
   * correctly, then `router.refresh()` re-read live values and every edit
   * re-rendered identical. Putting it here means the refresh after a PATCH
   * re-reads the config that was just written, so an edit is visible.
   */
  const selectedConfigId = params.config ?? null
  const indicatorsPath = `/operator/indicators?league=${league}&limit=200`
    + (selectedConfigId
       ? `&config_id=${encodeURIComponent(selectedConfigId)}` : '')

  const [indicators, configs, audit, slate, health] = await Promise.all([
    operatorFetch<IndicatorsResponse>(indicatorsPath),
    operatorFetch<{ configs: IndicatorConfig[] }>(`/operator/indicator-configs?league=${league}`),
    operatorFetch<{ entries: AuditEntry[] }>(`/operator/indicator-audit?league=${league}&limit=100`),
    operatorFetch<StagedSlateResponse>(`/operator/staged-slate?league=${league}`),
    operatorFetch<Record<string, unknown>>('/operator/run-health'),
  ])

  return (
    <CommandCenter
      me={me}
      league={league}
      leagues={[...LEAGUES]}
      selectedConfigId={selectedConfigId}
      indicators={indicators}
      configs={configs}
      audit={audit}
      slate={slate}
      health={health}
    />
  )
}
