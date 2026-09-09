'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  AuditEntry, CompareResponse, Indicator, IndicatorConfig,
  IndicatorsResponse, OperatorMe, OperatorResult, StagedSelection,
} from '@/lib/operator/client'
import {
  AuditDrawer, ComparePanel, ConfigsPanel, IndicatorsPanel, PromotePanel,
  RunHealthPanel, SlatePanel, Panel,
} from './panels'

/**
 * One page, six panels, a league switcher, and an audit drawer.
 *
 * Everything renders from API responses. Nothing here recomputes a projection,
 * an edge, a delta or a would-stage count — those are the backend's answers and
 * a second implementation in the browser would be a second thing to be wrong.
 */

export interface PanelData<T> extends OperatorResult<T> {}

export default function CommandCenter({
  me, league, leagues, indicators, configs, audit, slate, health,
}: {
  me: OperatorMe
  league: string
  leagues: string[]
  indicators: PanelData<IndicatorsResponse>
  configs: PanelData<{ configs: IndicatorConfig[] }>
  audit: PanelData<{ entries: AuditEntry[] }>
  slate: PanelData<{ selections: StagedSelection[] }>
  health: PanelData<Record<string, unknown>>
}) {
  const router = useRouter()
  const [selectedConfig, setSelectedConfig] = useState<IndicatorConfig | null>(null)
  const [compare, setCompare] = useState<CompareResponse | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const [live, setLive] = useState({ slate, health })

  // Run health and the staged slate poll; everything else refreshes on action.
  // A toggle that moved because a timer fired would be indistinguishable from
  // one that moved because someone else changed it.
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const [s, h] = await Promise.all([
        fetch(`/api/operator/staged-slate?league=${league}`, { cache: 'no-store' }),
        fetch('/api/operator/run-health', { cache: 'no-store' }),
      ])
      if (cancelled) return
      const [sj, hj] = await Promise.all([s.json().catch(() => null),
                                          h.json().catch(() => null)])
      setLive({
        slate: { ...slate, ok: s.ok, status: s.status, data: s.ok ? sj : null,
                 error: s.ok ? null : 'Could not refresh the staged slate.' },
        health: { ...health, ok: h.ok, status: h.status, data: h.ok ? hj : null,
                  error: h.ok ? null : 'Could not refresh run health.' },
      })
    }
    const id = setInterval(tick, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [league, slate, health])

  const refresh = useCallback(() => router.refresh(), [router])

  const switchLeague = (next: string) => {
    setSelectedConfig(null)
    setCompare(null)
    setCompareError(null)
    router.push(`/command?league=${next}`)
  }

  return (
    <div style={{ background: 'var(--navy-void)', minHeight: '100vh',
                  color: 'var(--steel-bright)', fontFamily: 'var(--font-ui)' }}>
      <Header me={me} league={league} leagues={leagues}
              onLeague={switchLeague} onAudit={() => setAuditOpen(true)} />

      <main style={{ display: 'grid', gap: 'var(--pad)',
                     padding: 'var(--pad)', maxWidth: '1600px', margin: '0 auto' }}>
        <Panel title="Indicators" error={indicators.error}>
          {indicators.data && (
            <IndicatorsPanel
              data={indicators.data}
              editing={selectedConfig}
              onChanged={refresh}
            />
          )}
        </Panel>

        <div style={{ display: 'grid', gap: 'var(--pad)',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          <Panel title="Configurations" error={configs.error}>
            {configs.data && (
              <ConfigsPanel
                league={league}
                configs={configs.data.configs}
                selected={selectedConfig}
                onSelect={setSelectedConfig}
                onChanged={refresh}
              />
            )}
          </Panel>

          <Panel title="Preview → Compare" error={null}>
            <ComparePanel
              league={league}
              config={selectedConfig}
              compare={compare}
              error={compareError}
              onCompare={setCompare}
              onError={setCompareError}
            />
          </Panel>
        </div>

        <Panel title="Promote" error={null}>
          <PromotePanel
            me={me}
            config={selectedConfig}
            indicators={indicators.data}
            compare={compare}
            onPromoted={() => { setSelectedConfig(null); setCompare(null); refresh() }}
          />
        </Panel>

        <div style={{ display: 'grid', gap: 'var(--pad)',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
          <Panel title="Run health — last 24h" error={live.health.error}>
            {live.health.data && <RunHealthPanel data={live.health.data} />}
          </Panel>
          <Panel title="Staged slate" error={live.slate.error}>
            {live.slate.data && (
              <SlatePanel selections={live.slate.data.selections ?? []} />
            )}
          </Panel>
        </div>
      </main>

      {auditOpen && (
        <AuditDrawer
          entries={audit.data?.entries ?? []}
          error={audit.error}
          onClose={() => setAuditOpen(false)}
        />
      )}
    </div>
  )
}

function Header({ me, league, leagues, onLeague, onAudit }: {
  me: OperatorMe; league: string; leagues: string[]
  onLeague: (l: string) => void; onAudit: () => void
}) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: '20px',
      padding: '10px var(--pad)', borderBottom: '1px solid var(--steel-line)',
      background: 'var(--navy-base)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* The logo appears once, here. The node motif is the only illustrative
          element on this page. */}
      <span aria-hidden style={{ display: 'inline-flex', gap: '3px' }}>
        <Node fill="var(--steel)" /><Node fill="var(--blue)" /><Node fill="var(--lime)" />
      </span>
      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '13px',
                       letterSpacing: '0.12em' }}>
        COMMAND CENTER
      </strong>

      <div role="group" aria-label="League" style={{ display: 'flex',
           border: '1px solid var(--steel-line)', borderRadius: '3px',
           overflow: 'hidden' }}>
        {leagues.map((l) => (
          <button key={l} type="button" onClick={() => onLeague(l)}
            aria-pressed={l === league}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              letterSpacing: '0.1em', padding: '5px 12px', border: 'none',
              cursor: l === league ? 'default' : 'pointer',
              background: l === league ? 'var(--blue)' : 'transparent',
              color: l === league ? 'var(--navy-void)' : 'var(--steel)',
            }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center',
                    gap: '14px' }}>
        <button type="button" onClick={onAudit} style={ghostButton}>
          AUDIT LOG
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px',
                       color: 'var(--steel)' }}>
          {me.display_name}
          <span style={{ color: me.is_owner ? 'var(--lime)' : 'var(--steel)',
                         marginLeft: '8px' }}>
            {me.role.toUpperCase()}
          </span>
        </span>
      </div>
    </header>
  )
}

function Node({ fill }: { fill: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden focusable="false">
      <circle cx="5" cy="5" r="3.2" fill={fill} />
    </svg>
  )
}

export const ghostButton: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
  padding: '5px 10px', cursor: 'pointer', background: 'transparent',
  color: 'var(--blue)', border: '1px solid var(--steel-line)',
  borderRadius: '3px',
}
