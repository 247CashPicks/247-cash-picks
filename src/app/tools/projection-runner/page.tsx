'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { BRAND } from '@/config/brand'
import { runProjection, LEAGUE_DEFAULTS } from '@/lib/picks/model'
import type { ProjectionInputs, ProjectionOutputs } from '@/lib/picks/types'

const C = BRAND.colors
const F = BRAND.fonts

const NAV = [
  ['SIGNALS',  '/picks'],
  ['ENGINE',   '/tools'],
  ['PIPELINE', '/dashboard'],
  ['TIERS',    '/join'],
] as [string, string][]

const DEFAULT_INPUTS: ProjectionInputs = {
  projectedMinutes: 32,
  per36: { pts: 24.0, reb: 6.0, ast: 5.0 },
  lineupAdjApplied: false,
  opponentPace: 99.3,
  individualPace: 99.3,
  opponentDefRating: 115.5,
  individualDefRating: 115.5,
  oppRebsAllowed: 43.9,
  indivRebsPer36: 6.69,
  oppAstAllowed: 26.6,
  matchupShare: 0.3,
}

function InputRow({
  label,
  value,
  onChange,
  step = 0.1,
  isAgent,
  isOverridden,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  isAgent?: boolean
  isOverridden?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '9px 0',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: F.mono, fontSize: '11px', color: C.dim,
            letterSpacing: '0.04em', textTransform: 'uppercase' as const,
          }}>
            {label}
          </span>
          {isAgent && !isOverridden && (
            <span style={{
              fontFamily: F.mono, fontSize: '9px', fontWeight: 500,
              letterSpacing: '0.08em', color: C.signalCyan,
              background: 'rgba(47,212,232,0.08)',
              border: `1px solid rgba(47,212,232,0.2)`,
              padding: '2px 6px',
            }}>
              AGENT
            </span>
          )}
          {isOverridden && (
            <span style={{
              fontFamily: F.mono, fontSize: '9px', fontWeight: 500,
              letterSpacing: '0.08em', color: C.signalCyan,
              background: 'rgba(47,212,232,0.1)',
              border: `1px solid rgba(47,212,232,0.25)`,
              padding: '2px 6px',
            }}>
              OVERRIDE
            </span>
          )}
        </div>
      </div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '90px', background: C.void,
          border: `1px solid ${isOverridden ? 'rgba(47,212,232,0.35)' : C.border}`,
          padding: '7px 10px',
          color: C.platinum, fontSize: '13px', fontWeight: 500,
          textAlign: 'right' as const, outline: 'none',
          fontFamily: F.mono,
        }}
      />
    </div>
  )
}

function FactorBar({ label, value, neutral = 1.0 }: {
  label: string; value: number; neutral?: number; color: string
}) {
  const pct = Math.min(Math.max((value / (neutral * 1.5)) * 100, 0), 100)
  const isPositive = value >= neutral
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{
          fontFamily: F.mono, fontSize: '11px', color: C.dim,
          letterSpacing: '0.04em', textTransform: 'uppercase' as const,
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
          color: isPositive ? C.signalCyan : C.flagAmber,
        }}>
          {value.toFixed(3)}
        </span>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: isPositive ? C.signalCyan : C.flagAmber,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}

export default function ProjectionRunnerPage() {
  const [inputs, setInputs] = useState<ProjectionInputs>(DEFAULT_INPUTS)
  const [overrides, setOverrides] = useState<Set<string>>(new Set())
  const [output, setOutput] = useState<ProjectionOutputs | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [suggestions, setSuggestions]               = useState<{ player_name: string; team: string; position: string }[]>([])
  const [showSuggestions, setShowSuggestions]       = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx]         = useState(-1)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [matchupSource, setMatchupSource] = useState<'defaults' | 'agent' | null>(null)

  const markOverride = useCallback((key: string) => {
    setOverrides(prev => new Set([...prev, key]))
  }, [])

  const updateInput = useCallback(<K extends keyof ProjectionInputs>(
    key: K,
    value: ProjectionInputs[K]
  ) => {
    setInputs(prev => ({ ...prev, [key]: value }))
    markOverride(String(key))
    setHasRun(false)
  }, [markOverride])

  const updatePer36 = useCallback((stat: 'pts' | 'reb' | 'ast', value: number) => {
    setInputs(prev => ({
      ...prev,
      per36: { ...prev.per36, [stat]: value },
    }))
    markOverride(`per36_${stat}`)
    setHasRun(false)
  }, [markOverride])

  const runModel = useCallback(() => {
    const result = runProjection(inputs)
    setOutput(result)
    setHasRun(true)
    setSaved(false)
  }, [inputs])

  const handleSave = async () => {
    if (!hasRun || !output) return
    setSaving(true)
    try {
      await fetch('/api/tools/save-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          inputs,
          output,
          fieldsOverridden: Array.from(overrides),
        }),
      })
      setSaved(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const setFromAgent = useCallback((
    per36Vals: { pts: number; reb: number; ast: number },
    minutes: number
  ) => {
    setInputs(prev => ({ ...prev, per36: per36Vals, projectedMinutes: minutes }))
    setOverrides(prev => {
      const next = new Set(prev)
      next.delete('per36_pts')
      next.delete('per36_reb')
      next.delete('per36_ast')
      next.delete('projectedMinutes')
      return next
    })
    setHasRun(false)
  }, [])

  const setMatchupFromAgent = useCallback((m: {
    opponent_pace:        number | null
    individual_pace:      number | null
    opponent_def_rating:  number | null
    individual_def_rating: number | null
    opp_rebs_allowed:     number | null
    opp_ast_allowed:      number | null
    weight_boost_pct:     number | null
  }) => {
    setInputs(prev => ({
      ...prev,
      opponentPace:        m.opponent_pace        ?? prev.opponentPace,
      individualPace:      m.individual_pace       ?? prev.individualPace,
      opponentDefRating:   m.opponent_def_rating   ?? prev.opponentDefRating,
      individualDefRating: m.individual_def_rating ?? prev.individualDefRating,
      oppRebsAllowed:      m.opp_rebs_allowed      ?? prev.oppRebsAllowed,
      oppAstAllowed:       m.opp_ast_allowed       ?? prev.oppAstAllowed,
      weightBoostPct:      m.weight_boost_pct      ?? prev.weightBoostPct,
    }))
    setOverrides(prev => {
      const next = new Set(prev)
      next.delete('opponentPace')
      next.delete('individualPace')
      next.delete('opponentDefRating')
      next.delete('individualDefRating')
      next.delete('oppRebsAllowed')
      next.delete('oppAstAllowed')
      return next
    })
    setHasRun(false)
    setMatchupSource('agent')
  }, [])

  const selectPlayer = useCallback(async (player: { player_name: string; team: string; position: string }) => {
    setPlayerName(player.player_name)
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIdx(-1)

    const today = new Date().toISOString().split('T')[0]
    const [statsResult, matchupResult] = await Promise.allSettled([
      fetch(`/api/players/stats?player=${encodeURIComponent(player.player_name)}&team=${encodeURIComponent(player.team)}`),
      fetch(`/api/tools/matchup-context?player=${encodeURIComponent(player.player_name)}&date=${today}`),
    ])

    // Per-36 + minutes (unchanged behavior)
    try {
      if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
        const { stats } = await statsResult.value.json()
        if (stats) {
          setFromAgent(
            { pts: stats.per36_pts, reb: stats.per36_reb, ast: stats.per36_ast },
            Math.round(stats.avg_minutes * 10) / 10
          )
        }
      }
    } catch {
      // silently fail — form retains current values
    }

    // Opponent / matchup context
    try {
      if (matchupResult.status === 'fulfilled' && matchupResult.value.ok) {
        const data = await matchupResult.value.json()
        if (data.found) {
          setMatchupFromAgent(data.matchup)
        } else {
          setMatchupSource('defaults')
        }
      } else {
        setMatchupSource('defaults')
      }
    } catch {
      setMatchupSource('defaults')
    }
  }, [setFromAgent, setMatchupFromAgent])

  const handleSearchInput = useCallback((text: string) => {
    setPlayerName(text)
    setHighlightedIdx(-1)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (text.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(text)}`)
        if (res.ok) {
          const { players } = await res.json()
          setSuggestions(players || [])
          setShowSuggestions((players || []).length > 0)
        }
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 250)
  }, [])

  // Auto-select player from URL params (e.g. ?player=Luka+Dončić&team=LAL from Matchup Builder)
  // Uses window.location.search instead of useSearchParams() to avoid requiring a Suspense
  // boundary on a statically pre-rendered page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const player = params.get('player')
    const team   = params.get('team')
    if (player && team) {
      selectPlayer({ player_name: player, team, position: '' })
    }
  // selectPlayer is stable (memoized with stable deps); run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const matchupShare = inputs.matchupShare ?? LEAGUE_DEFAULTS.matchupShare

  return (
    <div style={{ background: C.void, minHeight: '100vh' }}>

      {/* Fixed grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(47,212,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(47,212,232,0.04) 1px, transparent 1px)`,
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
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
                    // PROJECTION ENGINE
                  </span>
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 6px', letterSpacing: '-0.03em',
                }}>
                  RUN THE <span style={{ color: C.signalCyan }}>MODEL.</span>
                </h1>
                <div style={{
                  fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em',
                }}>
                  {'> run_projection --player=... --slate=tonight'}
                </div>
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: '11px', color: C.signalCyan,
                border: `1px solid ${C.border}`, padding: '6px 14px',
                letterSpacing: '0.08em',
              }}>
                ANALYST+
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(24px,4vw,48px)',
        }}>
          <div className="tool-layout">

            {/* LEFT — Inputs */}
            <div>
              {/* Player name — autocomplete */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`,
                padding: '20px', marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.12em' }}>
                    PLAYER
                  </div>
                  {loadingSuggestions && (
                    <div style={{ fontFamily: F.mono, fontSize: '9px', color: C.faint, letterSpacing: '0.08em' }}>
                      SEARCHING...
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="type to search players..."
                    value={playerName}
                    onChange={e => handleSearchInput(e.target.value)}
                    onBlur={() => setTimeout(() => {
                      setShowSuggestions(false)
                      setHighlightedIdx(-1)
                    }, 150)}
                    onKeyDown={(e) => {
                      if (!showSuggestions || suggestions.length === 0) return
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1))
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setHighlightedIdx(i => Math.max(i - 1, 0))
                      } else if (e.key === 'Enter' && highlightedIdx >= 0) {
                        e.preventDefault()
                        selectPlayer(suggestions[highlightedIdx])
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false)
                        setHighlightedIdx(-1)
                      }
                    }}
                    style={{
                      width: '100%', background: C.void,
                      border: `1px solid ${showSuggestions ? C.borderEmphasis : C.border}`,
                      padding: '9px 12px',
                      color: C.platinum, fontSize: '14px', fontWeight: 500,
                      outline: 'none', boxSizing: 'border-box' as const,
                      fontFamily: F.mono,
                    }}
                  />

                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: C.panel,
                      border: `1px solid ${C.borderEmphasis}`,
                      borderTop: 'none',
                      maxHeight: '240px', overflowY: 'auto' as const,
                    }}>
                      {suggestions.map((s, i) => (
                        <div
                          key={`${s.player_name}-${s.team}`}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            selectPlayer(s)
                          }}
                          onMouseEnter={() => setHighlightedIdx(i)}
                          onMouseLeave={() => setHighlightedIdx(-1)}
                          style={{
                            padding: '10px 14px',
                            borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : 'none',
                            cursor: 'pointer',
                            background: highlightedIdx === i ? 'rgba(47,212,232,0.08)' : 'transparent',
                          }}
                        >
                          <span style={{
                            fontFamily: F.sans, fontSize: '13px', fontWeight: 500,
                            color: highlightedIdx === i ? C.signalCyan : C.platinum,
                          }}>
                            {s.player_name}
                          </span>
                          <span style={{
                            fontFamily: F.mono, fontSize: '11px', color: C.dim, marginLeft: '8px',
                          }}>
                            · {s.team} · {s.position}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Per-36 stats */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`,
                padding: '20px', marginBottom: '12px',
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  letterSpacing: '0.12em', marginBottom: '2px',
                }}>
                  PER-36 STATS
                </div>
                <p style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.faint,
                  margin: '0 0 12px', letterSpacing: '0.04em',
                }}>
                  Source: season per-36 baseline (editable)
                </p>
                <InputRow label="Points / 36" value={inputs.per36.pts}
                  onChange={v => updatePer36('pts', v)} isAgent isOverridden={overrides.has('per36_pts')} />
                <InputRow label="Rebounds / 36" value={inputs.per36.reb}
                  onChange={v => updatePer36('reb', v)} isAgent isOverridden={overrides.has('per36_reb')} />
                <InputRow label="Assists / 36" value={inputs.per36.ast}
                  onChange={v => updatePer36('ast', v)} isAgent isOverridden={overrides.has('per36_ast')} />
                <InputRow label="Proj. Minutes" value={inputs.projectedMinutes}
                  onChange={v => updateInput('projectedMinutes', v)} step={0.5}
                  isAgent isOverridden={overrides.has('projectedMinutes')} />

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginTop: '10px', padding: '10px 0',
                }}>
                  <input
                    type="checkbox"
                    checked={inputs.lineupAdjApplied}
                    onChange={e => updateInput('lineupAdjApplied', e.target.checked)}
                    id="lineupAdj"
                    style={{ accentColor: C.signalCyan, width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <label htmlFor="lineupAdj" style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.muted,
                    cursor: 'pointer', letterSpacing: '0.04em',
                  }}>
                    Apply lineup combination adjustment
                  </label>
                </div>
              </div>

              {/* Opponent / matchup source note */}
              {matchupSource !== null && (
                <div style={{
                  marginBottom: '8px', padding: '8px 14px',
                  background: matchupSource === 'agent'
                    ? 'rgba(47,212,232,0.03)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.border}`,
                  fontFamily: F.mono, fontSize: '10px', letterSpacing: '0.04em',
                  color: matchupSource === 'agent' ? C.signalCyan : C.faint,
                }}>
                  {matchupSource === 'agent'
                    ? '◆ opponent context: today\'s matchup data'
                    : '– no slate matchup found — using league defaults (editable)'}
                </div>
              )}

              {/* Pace */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`,
                padding: '20px', marginBottom: '12px',
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  letterSpacing: '0.12em', marginBottom: '12px',
                }}>
                  PACE
                </div>
                <InputRow label="Opponent Pace" value={inputs.opponentPace}
                  onChange={v => updateInput('opponentPace', v)}
                  isAgent isOverridden={overrides.has('opponentPace')} />
                <InputRow label="Individual Pace" value={inputs.individualPace}
                  onChange={v => updateInput('individualPace', v)}
                  isAgent isOverridden={overrides.has('individualPace')} />
              </div>

              {/* Defensive Rating */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`,
                padding: '20px', marginBottom: '12px',
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  letterSpacing: '0.12em', marginBottom: '12px',
                }}>
                  DEFENSIVE RATING
                </div>
                <InputRow label="Opp. Def Rating" value={inputs.opponentDefRating}
                  onChange={v => updateInput('opponentDefRating', v)}
                  isAgent isOverridden={overrides.has('opponentDefRating')} />
                <InputRow label="Indiv. Def Rating" value={inputs.individualDefRating}
                  onChange={v => updateInput('individualDefRating', v)}
                  isAgent isOverridden={overrides.has('individualDefRating')} />
              </div>

              {/* Rebounds + Assists */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`,
                padding: '20px', marginBottom: '20px',
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  letterSpacing: '0.12em', marginBottom: '12px',
                }}>
                  REBOUNDS + ASSISTS
                </div>
                <InputRow label="Opp. Rebs Allowed/G" value={inputs.oppRebsAllowed}
                  onChange={v => updateInput('oppRebsAllowed', v)}
                  isAgent isOverridden={overrides.has('oppRebsAllowed')} />
                <InputRow label="Defender Rebs / 36" value={inputs.indivRebsPer36}
                  onChange={v => updateInput('indivRebsPer36', v)}
                  isAgent isOverridden={overrides.has('indivRebsPer36')} />
                <InputRow label="Opp. Ast Allowed/G" value={inputs.oppAstAllowed}
                  onChange={v => updateInput('oppAstAllowed', v)}
                  isAgent isOverridden={overrides.has('oppAstAllowed')} />
              </div>

              <button
                onClick={runModel}
                style={{
                  width: '100%', background: C.signalCyan, color: C.void,
                  border: 'none', padding: '16px',
                  fontFamily: F.mono, fontWeight: 500, fontSize: '14px',
                  letterSpacing: '0.12em', cursor: 'pointer',
                }}
              >
                ◆ EXECUTE MODEL
              </button>
            </div>

            {/* RIGHT — Output */}
            <div>
              {!hasRun ? (
                <div style={{
                  background: C.panel, border: `1px solid ${C.border}`,
                  padding: '64px 40px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '36px',
                    color: C.faint, marginBottom: '16px', lineHeight: 1,
                  }}>
                    ◆
                  </div>
                  <div style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.dim,
                    letterSpacing: '0.12em', marginBottom: '10px',
                  }}>
                    AWAITING INPUT
                  </div>
                  <p style={{
                    fontFamily: F.sans, color: C.faint, fontSize: '13px',
                    margin: 0, lineHeight: 1.7,
                  }}>
                    Fill in the player stats on the left,<br />then execute the model.
                  </p>
                </div>
              ) : output && (
                <>
                  {/* Projection outputs */}
                  <div style={{
                    background: C.panel,
                    border: `1px solid ${C.borderEmphasis}`,
                    borderLeft: `2px solid ${C.signalCyan}`,
                    padding: '28px', marginBottom: '16px',
                  }}>
                    <div style={{
                      fontFamily: F.mono, fontSize: '10px', color: C.dim,
                      letterSpacing: '0.12em', marginBottom: '20px',
                    }}>
                      {playerName ? playerName.toUpperCase() : 'PLAYER'} — PROJECTIONS
                    </div>

                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px', marginBottom: '28px',
                    }}>
                      {[
                        { label: 'PTS', value: output.projPts, color: C.signalCyan },
                        { label: 'REB', value: output.projReb, color: C.platinum   },
                        { label: 'AST', value: output.projAst, color: C.muted      },
                      ].map((s) => (
                        <div key={s.label} style={{
                          background: C.void, border: `1px solid ${C.border}`,
                          padding: '20px', textAlign: 'center',
                        }}>
                          <div style={{
                            fontFamily: F.mono, fontSize: 'clamp(32px,3.5vw,50px)',
                            fontWeight: 500, color: s.color, lineHeight: 1,
                          }}>
                            {s.value}
                          </div>
                          <div style={{
                            fontFamily: F.mono, fontSize: '10px', color: C.dim,
                            letterSpacing: '0.12em', marginTop: '6px',
                          }}>
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      fontFamily: F.mono, fontSize: '10px', color: C.dim,
                      letterSpacing: '0.12em', marginBottom: '14px',
                    }}>
                      COMPUTED FACTORS
                    </div>
                    <FactorBar label="Fpace (Pace Factor)"          value={output.fpace}          color={C.signalCyan} />
                    <FactorBar label="Fdef (Defense Factor)"        value={output.fdef}           color={C.signalCyan} />
                    <FactorBar label="Reb Suppression Multiplier"   value={output.rebSuppression} color={C.signalCyan} />
                  </div>

                  {/* Formula transparency */}
                  <div style={{
                    background: C.panel, border: `1px solid ${C.border}`,
                    padding: '24px', marginBottom: '16px',
                  }}>
                    <div style={{
                      fontFamily: F.mono, fontSize: '10px', color: C.dim,
                      letterSpacing: '0.12em', marginBottom: '14px',
                    }}>
                      MODEL COMPUTATION
                    </div>
                    <div style={{
                      background: C.void, padding: '16px',
                      fontFamily: F.mono, fontSize: '11px',
                      color: C.dim, lineHeight: 2.2, overflowX: 'auto',
                    }}>
                      <div>
                        <span style={{ color: C.signalCyan }}>Fpace</span>
                        {' = '}
                        ({inputs.opponentPace} ÷ {LEAGUE_DEFAULTS.pace}) × {matchupShare}
                        {' + '}
                        ({inputs.individualPace} ÷ {LEAGUE_DEFAULTS.pace}) × {1 - matchupShare}
                        {' = '}
                        <span style={{ color: C.platinum, fontWeight: 500 }}>{output.fpace}</span>
                      </div>
                      <div>
                        <span style={{ color: C.signalCyan }}>Fdef</span>
                        {' = '}
                        ({inputs.opponentDefRating} ÷ {LEAGUE_DEFAULTS.defRating}) × {matchupShare}
                        {' + '}
                        ({inputs.individualDefRating} ÷ {LEAGUE_DEFAULTS.defRating}) × {1 - matchupShare}
                        {' = '}
                        <span style={{ color: C.platinum, fontWeight: 500 }}>{output.fdef}</span>
                      </div>
                      <div>
                        <span style={{ color: C.signalCyan }}>RebMult</span>
                        {' = '}
                        {inputs.indivRebsPer36} ÷ {LEAGUE_DEFAULTS.rebsPer36}
                        {' = '}
                        <span style={{ color: C.platinum, fontWeight: 500 }}>{output.rebSuppression}</span>
                      </div>
                      <div style={{
                        marginTop: '8px', paddingTop: '8px',
                        borderTop: `1px solid ${C.border}`,
                      }}>
                        <span style={{ color: C.muted }}>Proj PTS</span>
                        {' = '}
                        ({inputs.per36.pts} ÷ 36) × {inputs.projectedMinutes} × {output.fpace} × {output.fdef}
                        {' = '}
                        <span style={{ color: C.signalCyan, fontWeight: 500 }}>{output.projPts}</span>
                      </div>
                    </div>
                  </div>

                  {/* Override summary */}
                  {overrides.size > 0 && (
                    <div style={{
                      background: 'rgba(47,212,232,0.04)',
                      border: `1px solid rgba(47,212,232,0.18)`,
                      padding: '14px 18px', marginBottom: '16px',
                    }}>
                      <div style={{
                        fontFamily: F.mono, fontSize: '10px', color: C.signalCyan,
                        letterSpacing: '0.08em', marginBottom: '8px',
                      }}>
                        OVERRIDES — {overrides.size} field{overrides.size !== 1 ? 's' : ''} changed from agent data
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {Array.from(overrides).map(k => (
                          <span key={k} style={{
                            background: 'rgba(47,212,232,0.08)',
                            border: `1px solid rgba(47,212,232,0.2)`,
                            padding: '2px 8px',
                            fontFamily: F.mono, fontSize: '10px', color: C.signalCyan,
                          }}>
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    style={{
                      width: '100%',
                      background: saved ? 'rgba(47,212,232,0.08)' : C.void,
                      color: saved ? C.signalCyan : C.muted,
                      border: `1px solid ${saved ? C.borderEmphasis : C.border}`,
                      padding: '12px',
                      fontFamily: F.mono, fontWeight: 500, fontSize: '13px',
                      letterSpacing: '0.1em',
                      cursor: saving || saved ? 'default' : 'pointer',
                    }}
                  >
                    {saved ? '◎ SAVED TO LAB' : saving ? 'SAVING...' : '◎ SAVE TO LAB'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
