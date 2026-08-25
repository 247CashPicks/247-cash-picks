'use client'

import { useState, useEffect, useMemo } from 'react'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

const NAV = [
  ['SIGNALS',  '/picks'],
  ['ENGINE',   '/tools'],
  ['PIPELINE', '/dashboard'],
  ['TIERS',    '/join'],
] as [string, string][]

interface LineupPlayer {
  player_name: string
  team: string
  opponent_team: string | null
  position: string | null
  games_played: number | null
  per36_pts: number | null
  per36_reb: number | null
  per36_ast: number | null
  per36_pts_adj: number | null
  per36_reb_adj: number | null
  per36_ast_adj: number | null
  lineup_adj_applied: boolean
}

interface LiveCombo {
  found: boolean
  player: string
  tier?: number
  combo?: string[]
  games_shared?: number
  minutes?: number
  per36_pts?: number
  per36_reb?: number
  per36_ast?: number
  reason?: string
}

type StatKey = 'pts' | 'reb' | 'ast'

const STATS: { key: StatKey; base: keyof LineupPlayer; adj: keyof LineupPlayer }[] = [
  { key: 'pts', base: 'per36_pts', adj: 'per36_pts_adj' },
  { key: 'reb', base: 'per36_reb', adj: 'per36_reb_adj' },
  { key: 'ast', base: 'per36_ast', adj: 'per36_ast_adj' },
]

function StatComparison({
  label,
  individual,
  adjusted,
  useAdjusted,
}: {
  label: string
  individual: number
  adjusted: number
  useAdjusted: boolean
}) {
  const diff    = ((adjusted - individual) / (individual || 1) * 100).toFixed(1)
  const isDown  = adjusted < individual
  const active  = useAdjusted ? adjusted : individual

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px',
      gap: '10px', alignItems: 'center',
      padding: '10px 0', borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        fontFamily: F.mono, fontSize: '11px', color: C.dim,
        fontWeight: 500, letterSpacing: '0.08em',
      }}>
        {label}/36
      </div>

      {/* Individual */}
      <div style={{
        textAlign: 'center', padding: '8px',
        background: !useAdjusted ? 'rgba(192,204,214,0.06)' : C.void,
        border: `1px solid ${!useAdjusted ? 'rgba(192,204,214,0.2)' : C.border}`,
      }}>
        <div style={{
          fontFamily: F.mono, fontSize: '22px', fontWeight: 500,
          color: !useAdjusted ? C.platinum : C.dim,
        }}>
          {individual}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: '9px', color: C.faint, marginTop: '2px', letterSpacing: '0.06em' }}>
          Individual
        </div>
      </div>

      {/* Shared floor */}
      <div style={{
        textAlign: 'center', padding: '8px',
        background: useAdjusted ? 'rgba(47,212,232,0.06)' : C.void,
        border: `1px solid ${useAdjusted ? 'rgba(47,212,232,0.2)' : C.border}`,
      }}>
        <div style={{
          fontFamily: F.mono, fontSize: '22px', fontWeight: 500,
          color: useAdjusted ? C.signalCyan : C.dim,
        }}>
          {adjusted}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: '9px', color: C.faint, marginTop: '2px', letterSpacing: '0.06em' }}>
          Shared Floor
        </div>
      </div>

      {/* Delta + active value */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: F.mono, fontSize: '12px', fontWeight: 500,
          color: isDown ? C.flagAmber : C.signalCyan,
          letterSpacing: '0.04em',
        }}>
          {isDown ? '' : '+'}{diff}%
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
          color: C.signalCyan, marginTop: '2px', letterSpacing: '0.04em',
        }}>
          USE: {active}
        </div>
      </div>
    </div>
  )
}

export default function LineupAdjusterPage() {
  const [players, setPlayers]             = useState<LineupPlayer[]>([])
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam]   = useState('')
  const [selectedOrder, setSelectedOrder] = useState<string[]>([])
  const [useAdjusted, setUseAdjusted]     = useState(true)
  const [liveCombo, setLiveCombo]         = useState<LiveCombo | null>(null)
  const [computing, setComputing]         = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [activeDate, setActiveDate]         = useState<string>('')

  // Step 1: on mount, read ?date= from the URL, load the list of dates that
  // actually have data, and pick the active date (URL param > most recent).
  useEffect(() => {
    const urlDate = new URLSearchParams(window.location.search).get('date') ?? ''
    fetch('/api/tools/lineup-adjuster/dates')
      .then(r => r.json())
      .then((d: { dates?: string[] }) => {
        const dates = d.dates ?? []
        setAvailableDates(dates)
        const initial = (urlDate && dates.includes(urlDate)) ? urlDate
                       : (dates[0] ?? urlDate ?? '')
        setActiveDate(initial)
      })
      .catch(() => {
        // dates endpoint failed — fall back to URL param or today
        setActiveDate(urlDate)
      })
  }, [])

  // Step 2: whenever activeDate changes, fetch that slate.
  useEffect(() => {
    if (!activeDate) { return }
    setLoading(true)
    setSelectedOrder([])      // clear selection when switching dates
    setLiveCombo(null)
    fetch(`/api/tools/lineup-adjuster?date=${encodeURIComponent(activeDate)}`)
      .then(r => r.json())
      .then((data: { found: boolean; players: LineupPlayer[]; error?: string }) => {
        if (data.error) { setFetchError(data.error); setPlayers([]); return }
        setFetchError(null)
        if (!data.found || !data.players?.length) { setPlayers([]); return }
        setPlayers(data.players)
        const first = [...new Set(data.players.map(p => p.team))].sort()[0] ?? ''
        setSelectedTeam(first)
      })
      .catch(() => setFetchError('Network error — unable to reach server.'))
      .finally(() => setLoading(false))
  }, [activeDate])

  const teams       = useMemo(() => [...new Set(players.map(p => p.team))].sort(), [players])
  const teamPlayers = useMemo(() => players.filter(p => p.team === selectedTeam), [players, selectedTeam])
  // Preserve selection order: first selected = subject for the live combo
  const selection   = useMemo(
    () => selectedOrder
      .map(name => players.find(p => p.player_name === name))
      .filter((p): p is LineupPlayer => p != null),
    [players, selectedOrder],
  )

  const hasAnyAdj  = selection.some(p => p.lineup_adj_applied)
  const noAdjWarn  = selection.length > 0 && !hasAnyAdj

  function toggleSelect(name: string) {
    setSelectedOrder(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : prev.length < 3 ? [...prev, name] : prev
    )
  }

  useEffect(() => {
    if (selection.length < 2) { setLiveCombo(null); return }
    const subject   = selection[0]
    const teammates = selection.slice(1).map(p => p.player_name)
    const ctrl = new AbortController()
    setComputing(true)
    const t = setTimeout(() => {
      fetch('/api/tools/lineup-adjuster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: subject.player_name, teammates }),
        signal: ctrl.signal,
      })
        .then(r => r.json())
        .then((d: LiveCombo) => setLiveCombo(d))
        .catch(() => { if (!ctrl.signal.aborted) setLiveCombo(null) })
        .finally(() => setComputing(false))
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [selection])

  return (
    <div style={{ background: C.void, minHeight: '100vh' }}>

      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(47,212,232,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(47,212,232,0.04) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '56px',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(24px,4vw,48px)',
        gap: '32px',
      }}>
        <a href="/" style={{
          fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
          color: C.signalCyan, letterSpacing: '0.05em', textDecoration: 'none',
          marginRight: 'auto',
        }}>
          {BRAND.name}
        </a>
        {NAV.map(([label, href]) => (
          <a key={href} href={href} style={{
            fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.1em',
            color: href === '/tools' ? C.signalCyan : C.dim,
            textDecoration: 'none',
          }}>
            {label}
          </a>
        ))}
      </nav>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>

        {/* Header */}
        <div style={{
          background: C.panel, borderBottom: `1px solid ${C.border}`,
          padding: '22px clamp(24px,4vw,48px)',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <a href="/tools" style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.faint,
                    textDecoration: 'none', letterSpacing: '0.06em',
                  }}>
                    ‹ /tools
                  </a>
                  <span style={{ color: C.border, fontSize: '14px' }}>|</span>
                  <span style={{
                    fontFamily: F.mono, fontSize: '11px',
                    color: C.signalCyan, letterSpacing: '0.12em',
                  }}>
                    // LINEUP CALIBRATOR
                  </span>
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 6px', letterSpacing: '-0.03em',
                }}>
                  CALIBRATE THE <span style={{ color: C.signalCyan }}>FLOOR.</span>
                </h1>
                <div style={{
                  fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em',
                }}>
                  {'> apply_shared_floor --team=<abbr> --threshold=20g'}
                </div>
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: '11px', color: C.signalCyan,
                border: `1px solid ${C.border}`, padding: '6px 14px',
                letterSpacing: '0.08em',
              }}>
                VECTOR+
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(24px,4vw,48px)' }}>

          {/* Explanation */}
          <div style={{
            background: 'rgba(47,212,232,0.04)',
            border: `1px solid rgba(47,212,232,0.15)`,
            padding: '16px 20px', marginBottom: '20px',
            fontFamily: F.mono, fontSize: '12px',
            color: C.muted, lineHeight: 1.7, letterSpacing: '0.02em',
          }}>
            <span style={{ color: C.signalCyan }}>WHEN TO APPLY: </span>
            When star players have fewer than 20 games together, their shared-floor
            per-36 stats differ significantly from individual stats. This tool surfaces
            that difference. The model protocol:{' '}
            <span style={{ color: C.platinum }}>always use the lower (conservative) number</span>
            {' '}— conservative bias toward overs.
          </div>

          {/* Date picker — rendered whenever dates are known, regardless of loading/empty state */}
          {availableDates.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.08em' }}>
                SLATE:
              </span>
              {availableDates.map(d => (
                <button
                  key={d}
                  onClick={() => setActiveDate(d)}
                  style={{
                    padding: '6px 12px', cursor: 'pointer',
                    background: activeDate === d ? 'rgba(47,212,232,0.08)' : 'transparent',
                    color: activeDate === d ? C.signalCyan : C.dim,
                    border: `1px solid ${activeDate === d ? C.signalCyan : C.border}`,
                    fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.04em',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{
              padding: '48px 0', textAlign: 'center',
              fontFamily: F.mono, fontSize: '12px', color: C.dim, letterSpacing: '0.08em',
            }}>
              // loading_slate...
            </div>
          )}

          {/* ── Fetch error ── */}
          {!loading && fetchError && (
            <div style={{
              background: 'rgba(232,163,61,0.06)',
              border: `1px solid rgba(232,163,61,0.25)`,
              padding: '16px 20px',
              fontFamily: F.mono, fontSize: '12px', color: C.flagAmber, letterSpacing: '0.04em',
            }}>
              // ERROR {fetchError}
            </div>
          )}

          {/* ── No slate ── */}
          {!loading && !fetchError && players.length === 0 && (
            <div style={{
              padding: '56px 0', textAlign: 'center',
              fontFamily: F.mono, fontSize: '13px', color: C.dim,
              letterSpacing: '0.08em', lineHeight: 2,
            }}>
              <div style={{ color: C.signalCyan, marginBottom: '8px' }}>// no_slate_today()</div>
              <div style={{ color: C.faint, fontSize: '11px' }}>
                picks pipeline has not run — check back at tipoff
              </div>
            </div>
          )}

          {/* ── Main ── */}
          {!loading && !fetchError && players.length > 0 && (
            <>
              {/* Team tabs + player roster */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, marginBottom: '20px' }}>

                {/* Team tabs */}
                <div style={{
                  display: 'flex', overflowX: 'auto',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {teams.map(team => (
                    <button
                      key={team}
                      onClick={() => setSelectedTeam(team)}
                      style={{
                        padding: '10px 18px',
                        background: selectedTeam === team ? 'rgba(47,212,232,0.08)' : 'transparent',
                        color: selectedTeam === team ? C.signalCyan : C.dim,
                        border: 'none',
                        borderBottom: `2px solid ${selectedTeam === team ? C.signalCyan : 'transparent'}`,
                        cursor: 'pointer',
                        fontFamily: F.mono, fontSize: '12px', fontWeight: 500,
                        letterSpacing: '0.08em', whiteSpace: 'nowrap',
                      }}
                    >
                      {team}
                    </button>
                  ))}
                </div>

                {/* Player rows */}
                <div style={{ padding: '6px 0' }}>
                  {teamPlayers.map(p => {
                    const isSelected = selectedOrder.includes(p.player_name)
                    const atMax      = selectedOrder.length >= 3 && !isSelected
                    return (
                      <div
                        key={p.player_name}
                        onClick={() => !atMax && toggleSelect(p.player_name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 16px',
                          cursor: atMax ? 'not-allowed' : 'pointer',
                          background: isSelected ? 'rgba(47,212,232,0.05)' : 'transparent',
                          borderLeft: `3px solid ${isSelected ? C.signalCyan : 'transparent'}`,
                          opacity: atMax ? 0.4 : 1,
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: '17px', height: '17px', flexShrink: 0,
                          border: `1px solid ${isSelected ? C.signalCyan : C.faint}`,
                          background: isSelected ? C.signalCyan : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && (
                            <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.void, fontWeight: 700, lineHeight: 1 }}>
                              ✓
                            </span>
                          )}
                        </div>

                        {/* Name + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: F.sans, fontSize: '14px', fontWeight: 500,
                            color: isSelected ? C.platinum : C.muted,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {p.player_name}
                          </div>
                          <div style={{
                            fontFamily: F.mono, fontSize: '10px', color: C.faint,
                            marginTop: '2px', letterSpacing: '0.04em',
                          }}>
                            {[p.position, p.games_played != null ? `${p.games_played}G` : null]
                              .filter(Boolean).join(' · ')}
                          </div>
                        </div>

                        {/* Quick per-36 chips */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {[
                            { l: 'PTS', v: p.per36_pts },
                            { l: 'REB', v: p.per36_reb },
                            { l: 'AST', v: p.per36_ast },
                          ].map(({ l, v }) => (
                            <div key={l} style={{ textAlign: 'center', minWidth: '32px' }}>
                              <div style={{
                                fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
                                color: isSelected ? C.platinum : C.muted,
                              }}>
                                {v ?? '—'}
                              </div>
                              <div style={{
                                fontFamily: F.mono, fontSize: '9px', color: C.faint, letterSpacing: '0.06em',
                              }}>
                                {l}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ADJ badge when applicable */}
                        {p.lineup_adj_applied && (
                          <div style={{
                            fontFamily: F.mono, fontSize: '10px', color: C.signalCyan,
                            border: `1px solid rgba(47,212,232,0.3)`, padding: '3px 8px',
                            letterSpacing: '0.06em', flexShrink: 0,
                          }}>
                            ADJ
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Selection counter */}
                <div style={{
                  padding: '9px 16px', borderTop: `1px solid ${C.border}`,
                  fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em',
                }}>
                  {selectedOrder.length}/3 selected
                  {selectedOrder.length >= 3 && ' — deselect a player to add another'}
                </div>
              </div>

              {/* No selection prompt */}
              {selection.length === 0 && (
                <div style={{
                  padding: '32px 0', textAlign: 'center',
                  fontFamily: F.mono, fontSize: '12px', color: C.faint, letterSpacing: '0.06em',
                }}>
                  // select_players() — click players above to compare
                </div>
              )}

              {/* No adj data warning — suppressed once live panel takes over at 2+ selections */}
              {noAdjWarn && selection.length < 2 && (
                <div style={{
                  background: 'rgba(232,163,61,0.06)',
                  border: `1px solid rgba(232,163,61,0.25)`,
                  padding: '14px 18px', marginBottom: '20px',
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                }}>
                  <span style={{ fontFamily: F.mono, fontSize: '14px', color: C.flagAmber, lineHeight: 1, paddingTop: '1px' }}>
                    ⚠
                  </span>
                  <div style={{
                    fontFamily: F.mono, fontSize: '12px', color: C.flagAmber,
                    lineHeight: 1.6, letterSpacing: '0.02em',
                  }}>
                    NO ADJUSTMENT DATA — Lineup calibration agent has not run for this slate.
                    Showing individual per-36 baselines only. Shared-floor comparison will appear
                    when the agent runs (requires 20+ shared games on record).
                  </div>
                </div>
              )}

              {/* Adj available confirmation + toggle */}
              {selection.length > 0 && hasAnyAdj && (
                <>
                  <div style={{
                    background: 'rgba(47,212,232,0.04)',
                    border: `1px solid ${C.border}`,
                    padding: '14px 18px', marginBottom: '20px',
                    fontFamily: F.mono, fontSize: '12px', color: C.muted, letterSpacing: '0.02em',
                  }}>
                    <span style={{ color: C.signalCyan }}>◆ </span>
                    Lineup adjustment applied — 20+ shared games on record.
                    Adjusted values will be used automatically when running the projection.
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '28px', flexWrap: 'wrap',
                  }}>
                    <button
                      onClick={() => setUseAdjusted(false)}
                      style={{
                        padding: '9px 20px', cursor: 'pointer',
                        background: !useAdjusted ? C.platinum : 'transparent',
                        color: !useAdjusted ? C.void : C.muted,
                        border: `1px solid ${!useAdjusted ? C.platinum : C.border}`,
                        fontFamily: F.mono, fontWeight: 500, fontSize: '12px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      USE INDIVIDUAL
                    </button>
                    <button
                      onClick={() => setUseAdjusted(true)}
                      style={{
                        padding: '9px 20px', cursor: 'pointer',
                        background: useAdjusted ? C.signalCyan : 'transparent',
                        color: useAdjusted ? C.void : C.muted,
                        border: `1px solid ${useAdjusted ? C.signalCyan : C.border}`,
                        fontFamily: F.mono, fontWeight: 500, fontSize: '12px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      USE SHARED FLOOR (CONSERVATIVE)
                    </button>
                    <span style={{
                      fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em',
                    }}>
                      {useAdjusted ? '← recommended when < 20 shared games' : '← use when lineup is stable'}
                    </span>
                  </div>
                </>
              )}

              {/* Live combo panel */}
              {selection.length >= 2 && (
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, marginBottom: '20px', padding: '16px 20px' }}>
                  <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.1em', marginBottom: '10px' }}>
                    // LIVE_COMBO — {selection[0].player_name} conditioned on {selection.slice(1).map(p => p.player_name).join(' + ')}
                  </div>
                  {computing && (
                    <div style={{ fontFamily: F.mono, fontSize: '12px', color: C.dim }}>// computing_ladder...</div>
                  )}
                  {!computing && liveCombo?.found && (
                    <>
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {[
                          { l: 'PTS/36', v: liveCombo.per36_pts },
                          { l: 'REB/36', v: liveCombo.per36_reb },
                          { l: 'AST/36', v: liveCombo.per36_ast },
                        ].map(({ l, v }) => (
                          <div key={l} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: F.mono, fontSize: '24px', fontWeight: 500, color: C.signalCyan }}>{v}</div>
                            <div style={{ fontFamily: F.mono, fontSize: '9px', color: C.faint, letterSpacing: '0.06em', marginTop: '2px' }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.muted, letterSpacing: '0.04em' }}>
                        {liveCombo.tier}-man combo · {liveCombo.games_shared} shared games · {liveCombo.minutes} min · 2024-25 baseline
                      </div>
                      <a
                        href={`/tools/projection-runner?player=${encodeURIComponent(liveCombo.player)}&team=${encodeURIComponent(selection[0].team)}`}
                        style={{ display: 'inline-block', marginTop: '14px', background: C.signalCyan, color: C.void, padding: '9px 18px', fontFamily: F.mono, fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em', textDecoration: 'none' }}
                      >
                        ◆ SEND TO ENGINE
                      </a>
                    </>
                  )}
                  {!computing && liveCombo && !liveCombo.found && (
                    <div style={{ fontFamily: F.mono, fontSize: '12px', color: C.flagAmber, letterSpacing: '0.02em' }}>
                      // no_qualifying_combo ({liveCombo.reason}) — under 20 shared games in 2024-25; engine uses base per-36
                    </div>
                  )}
                </div>
              )}

              {/* Player comparison cards */}
              {selection.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {selection.map(player => {
                    const hasAdj = player.lineup_adj_applied &&
                      player.per36_pts_adj != null &&
                      player.per36_reb_adj != null &&
                      player.per36_ast_adj != null

                    return (
                      <div key={player.player_name} style={{
                        background: C.panel, border: `1px solid ${C.border}`,
                      }}>
                        {/* Card header */}
                        <div style={{
                          padding: '16px 20px',
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                          background: 'rgba(255,255,255,0.02)',
                        }}>
                          <div>
                            <div style={{
                              fontFamily: F.sans, fontWeight: 500, fontSize: '17px', color: C.platinum,
                            }}>
                              {player.player_name}
                            </div>
                            <div style={{
                              fontFamily: F.mono, fontSize: '11px', color: C.muted,
                              marginTop: '2px', letterSpacing: '0.04em',
                            }}>
                              {[player.position, player.team, player.opponent_team ? `vs ${player.opponent_team}` : null]
                                .filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                            {hasAdj && (
                              <div style={{
                                fontFamily: F.mono, fontSize: '11px', color: C.signalCyan,
                                letterSpacing: '0.04em',
                              }}>
                                ◆ adj applied
                              </div>
                            )}
                            <a
                              href={`/tools/projection-runner?player=${encodeURIComponent(player.player_name)}&team=${encodeURIComponent(player.team)}`}
                              style={{
                                display: 'inline-block',
                                background: C.signalCyan, color: C.void,
                                padding: '9px 18px',
                                fontFamily: F.mono, fontWeight: 500,
                                fontSize: '11px', letterSpacing: '0.1em',
                                textDecoration: 'none',
                              }}
                            >
                              ◆ SEND TO ENGINE
                            </a>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ padding: '8px 20px 16px' }}>
                          {hasAdj ? (
                            <>
                              {/* Column headers */}
                              <div style={{
                                display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px',
                                gap: '10px', padding: '6px 0',
                              }}>
                                <div />
                                {['INDIVIDUAL', 'SHARED FLOOR', 'CHANGE / USE'].map((h, i) => (
                                  <div key={h} style={{
                                    textAlign: i === 2 ? 'right' : 'center',
                                    fontFamily: F.mono, fontSize: '10px',
                                    color: C.dim, fontWeight: 500, letterSpacing: '0.08em',
                                  }}>
                                    {h}
                                  </div>
                                ))}
                              </div>
                              {STATS.map(({ key, base, adj }) => (
                                <StatComparison
                                  key={key}
                                  label={key.toUpperCase()}
                                  individual={player[base] as number ?? 0}
                                  adjusted={player[adj] as number ?? 0}
                                  useAdjusted={useAdjusted}
                                />
                              ))}
                            </>
                          ) : (
                            // Individual stats only — adj agent hasn't run
                            <div style={{
                              display: 'flex', gap: '16px', padding: '16px 0', flexWrap: 'wrap',
                            }}>
                              {STATS.map(({ key, base }) => (
                                <div key={key} style={{
                                  background: 'rgba(192,204,214,0.04)',
                                  border: `1px solid ${C.border}`,
                                  padding: '12px 20px', textAlign: 'center',
                                }}>
                                  <div style={{
                                    fontFamily: F.mono, fontSize: '24px', fontWeight: 500, color: C.platinum,
                                  }}>
                                    {player[base] != null ? String(player[base]) : '—'}
                                  </div>
                                  <div style={{
                                    fontFamily: F.mono, fontSize: '10px', color: C.faint,
                                    marginTop: '4px', letterSpacing: '0.08em',
                                  }}>
                                    {key.toUpperCase()}/36
                                  </div>
                                </div>
                              ))}
                              <div style={{
                                marginLeft: 'auto', alignSelf: 'center',
                                fontFamily: F.mono, fontSize: '11px', color: C.faint,
                                letterSpacing: '0.04em',
                              }}>
                                // adj_pending
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
