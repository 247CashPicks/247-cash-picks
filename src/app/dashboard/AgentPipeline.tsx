'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BRAND } from '@/config/brand'
import type { AgentDef } from '@/lib/picks/agents'
import type { Sport } from '@/lib/sport'

const C = BRAND.colors
const F = BRAND.fonts

type Status = 'idle' | 'running' | 'ok' | 'error'
interface RunState { status: Status; message?: string }

function summarize(result: unknown): string {
  if (result == null) return 'done'
  if (typeof result === 'string') return result.slice(0, 60)
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>
    const parts: string[] = []
    for (const k of ['status', 'games', 'players', 'rows_written', 'count',
                     'projections', 'selections', 'inserted', 'updated']) {
      if (r[k] != null) parts.push(`${k}=${String(r[k])}`)
    }
    if (parts.length) return parts.join(' · ')
    return JSON.stringify(result).slice(0, 60)
  }
  return String(result)
}

export default function AgentPipeline(
  { agents, sport }: { agents: readonly AgentDef[]; sport: Sport },
) {
  const router = useRouter()
  const [runDate, setRunDate] = useState('')
  const [state, setState] = useState<Record<string, RunState>>({})

  // Which agents refuse a historical date, named for the warning banner. Comes
  // from the same registry the dispatch route reads, so the UI cannot claim a
  // different live-only set than the server enforces.
  const liveOnlyLabels = agents.filter(a => a.liveOnly).map(a => a.label).join(' / ')

  // NFL has no cron — the cards carry a weekly cadence, and this note makes
  // explicit that nothing fires on its own; the operator triggers each run.
  const operatorRun = sport === 'NFL'

  async function runAgent(key: string) {
    setState(s => ({ ...s, [key]: { status: 'running' } }))
    try {
      const res = await fetch('/api/operator/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: key, sport, date: runDate || undefined }),
      })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setState(s => ({ ...s, [key]: { status: 'error', message: data.error ?? `HTTP ${res.status}` } }))
        return
      }
      const msg = data.still_running ? 'running on railway…' : summarize(data.result)
      setState(s => ({ ...s, [key]: { status: 'ok', message: msg } }))
      router.refresh()   // pull fresh server data into the tables below
    } catch {
      setState(s => ({ ...s, [key]: { status: 'error', message: 'network error' } }))
    }
  }

  const statusColor = (st?: Status) =>
    st === 'ok' ? C.signalCyan : st === 'error' ? C.flagAmber : C.faint

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em' }}>
          // AGENT PIPELINE
        </div>
        {operatorRun && (
          <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.08em' }}>
            {sport} — WEEKLY · OPERATOR-RUN (no cron; you trigger each run)
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.08em' }}>
            TARGET DATE
          </span>
          <input
            type="date"
            value={runDate}
            onChange={e => setRunDate(e.target.value)}
            style={{
              background: C.void, border: `1px solid ${C.border}`, color: C.platinum,
              fontFamily: F.mono, fontSize: '11px', padding: '5px 8px',
            }}
          />
          {runDate && (
            <button
              onClick={() => setRunDate('')}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
                fontFamily: F.mono, fontSize: '10px', padding: '5px 8px', cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {runDate && liveOnlyLabels && (
        <div style={{
          fontFamily: F.mono, fontSize: '10px', color: C.flagAmber,
          marginBottom: '12px', letterSpacing: '0.04em',
        }}>
          ⚠ historical mode — {liveOnlyLabels} {agents.filter(a => a.liveOnly).length === 1 ? 'is' : 'are'} blocked (live-only sources)
        </div>
      )}

      <div className="agent-grid">
        {agents.map(agent => {
          const st = state[agent.key]
          const blocked = !!runDate && agent.liveOnly
          const busy = st?.status === 'running'
          return (
            <div key={agent.key} style={{
              background: C.void, border: `1px solid ${C.border}`,
              padding: '14px 10px', textAlign: 'center', opacity: blocked ? 0.4 : 1,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: '18px', color: C.signalCyan, marginBottom: '6px', lineHeight: 1 }}>
                {agent.glyph}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: '11px', fontWeight: 500, color: C.platinum, letterSpacing: '0.08em', marginBottom: '3px' }}>
                {agent.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.faint, marginBottom: '10px', letterSpacing: '0.04em' }}>
                {agent.time}
              </div>
              <button
                onClick={() => runAgent(agent.key)}
                disabled={busy || blocked}
                style={{
                  display: 'block', width: '100%',
                  background: busy ? 'transparent' : C.signalCyan,
                  color: busy ? C.signalCyan : C.void,
                  border: busy ? `1px solid ${C.signalCyan}` : 'none',
                  padding: '5px 0', fontFamily: F.mono, fontWeight: 500,
                  fontSize: '11px', letterSpacing: '0.1em',
                  cursor: busy || blocked ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'RUNNING…' : agent.runLabel ?? 'RUN'}
              </button>
              {st?.message && (
                <div style={{
                  fontFamily: F.mono, fontSize: '9px', color: statusColor(st.status),
                  marginTop: '7px', lineHeight: 1.4, wordBreak: 'break-word',
                }}>
                  {st.status === 'error' ? '✕ ' : '✓ '}{st.message}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
