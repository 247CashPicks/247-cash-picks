'use client'

import { useState, useCallback } from 'react'
import { BRAND } from '@/config/brand'
import { runProjection, LEAGUE_DEFAULTS } from '@/lib/picks/model'
import type { ProjectionInputs, ProjectionOutputs } from '@/lib/picks/types'

const C = BRAND.colors
const F = BRAND.fonts

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
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: C.textMuted }}>{label}</span>
          {isAgent && !isOverridden && (
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
              color: C.accentLight, background: 'rgba(167,139,250,0.1)',
              border: `1px solid rgba(167,139,250,0.2)`,
              borderRadius: '4px', padding: '2px 6px',
            }}>
              AGENT
            </span>
          )}
          {isOverridden && (
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
              color: C.signal, background: 'rgba(56,189,248,0.1)',
              border: `1px solid rgba(56,189,248,0.2)`,
              borderRadius: '4px', padding: '2px 6px',
            }}>
              YOUR OVERRIDE
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
          width: '90px', background: C.surface2,
          border: `1px solid ${isOverridden ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '8px', padding: '8px 10px',
          color: '#fff', fontSize: '14px', fontWeight: 600,
          textAlign: 'right' as const, outline: 'none',
          fontFamily: F.body,
        }}
      />
    </div>
  )
}

function FactorBar({ label, value, neutral = 1.0, color }: {
  label: string; value: number; neutral?: number; color: string
}) {
  const pct = Math.min(Math.max((value / (neutral * 1.5)) * 100, 0), 100)
  const isPositive = value >= neutral
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: C.textMuted }}>{label}</span>
        <span style={{
          fontSize: '14px', fontWeight: 700,
          color: isPositive ? C.confirm : '#EF4444',
        }}>
          {value.toFixed(3)}
        </span>
      </div>
      <div style={{
        height: '6px', background: 'rgba(255,255,255,0.06)',
        borderRadius: '3px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: isPositive ? color : '#EF4444',
          borderRadius: '3px',
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

  const matchupShare = inputs.matchupShare ?? LEAGUE_DEFAULTS.matchupShare

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '28px 40px',
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <a href="/tools" style={{ color: C.textMuted, textDecoration: 'none', fontSize: '14px' }}>
            ← Lab
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '24px' }}>⚡</span>
          <h1 style={{
            fontFamily: F.heading, fontSize: '28px', fontWeight: 900,
            margin: 0, color: C.accentLight, letterSpacing: '0.5px',
          }}>
            PROJECTION ENGINE
          </h1>
          <div style={{
            marginLeft: 'auto',
            background: 'rgba(167,139,250,0.08)',
            border: `1px solid ${C.border}`,
            borderRadius: '100px', padding: '6px 16px',
            fontSize: '12px', color: C.accentLight,
          }}>
            Analyst+ Access
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px', margin: '0 auto',
        padding: '32px 40px',
        display: 'grid',
        gridTemplateColumns: '420px 1fr',
        gap: '32px',
        alignItems: 'start',
      }}>

        {/* LEFT — Inputs */}
        <div>
          {/* Player name */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '24px', marginBottom: '16px',
          }}>
            <div style={{
              fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '1px', marginBottom: '12px',
            }}>
              PLAYER
            </div>
            <input
              type="text"
              placeholder="Player name..."
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              style={{
                width: '100%', background: C.surface2,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '10px 14px',
                color: '#fff', fontSize: '16px', fontWeight: 500,
                outline: 'none', boxSizing: 'border-box' as const,
                fontFamily: F.body,
              }}
            />
          </div>

          {/* Per-36 stats */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '24px', marginBottom: '16px',
          }}>
            <div style={{
              fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '1px', marginBottom: '4px',
            }}>
              PER-36 STATS
            </div>
            <p style={{ fontSize: '12px', color: C.textMuted, margin: '0 0 12px' }}>
              Source: RotoGrinders Court-IQ (lineup-adjusted)
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
              marginTop: '12px', padding: '10px 0',
            }}>
              <input
                type="checkbox"
                checked={inputs.lineupAdjApplied}
                onChange={e => updateInput('lineupAdjApplied', e.target.checked)}
                id="lineupAdj"
                style={{ accentColor: C.accentLight, width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="lineupAdj" style={{
                fontSize: '13px', color: C.textMuted, cursor: 'pointer',
              }}>
                Apply lineup combination adjustment
              </label>
            </div>
          </div>

          {/* Pace */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '24px', marginBottom: '16px',
          }}>
            <div style={{
              fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '1px', marginBottom: '12px',
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
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '24px', marginBottom: '16px',
          }}>
            <div style={{
              fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '1px', marginBottom: '12px',
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
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '24px', marginBottom: '24px',
          }}>
            <div style={{
              fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
              color: C.accentLight, letterSpacing: '1px', marginBottom: '12px',
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
              width: '100%', background: C.accent, color: C.text,
              border: 'none', padding: '18px', borderRadius: '12px',
              fontFamily: F.heading, fontWeight: 900, fontSize: '22px',
              letterSpacing: '1px', cursor: 'pointer',
              boxShadow: '0 0 40px rgba(109,40,217,0.3)',
            }}
          >
            ⚡ EXECUTE MODEL
          </button>
        </div>

        {/* RIGHT — Output */}
        <div>
          {!hasRun ? (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '20px', padding: '64px 40px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.4 }}>⚡</div>
              <h2 style={{
                fontFamily: F.heading, fontSize: '28px', fontWeight: 800,
                color: C.textMuted, margin: '0 0 12px',
              }}>
                SET YOUR INPUTS
              </h2>
              <p style={{ color: C.textMuted, fontSize: '15px', margin: 0 }}>
                Fill in the player stats on the left, then hit Execute Model to see the model output.
              </p>
            </div>
          ) : output && (
            <>
              {/* Projection outputs */}
              <div style={{
                background: C.surface, border: `2px solid rgba(167,139,250,0.3)`,
                borderRadius: '20px', padding: '36px', marginBottom: '24px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
                }} />

                <div style={{
                  fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
                  color: C.accentLight, letterSpacing: '1px', marginBottom: '24px',
                }}>
                  {playerName ? playerName.toUpperCase() : 'PLAYER'} — PROJECTIONS
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px', marginBottom: '32px',
                }}>
                  {[
                    { label: 'PTS', value: output.projPts, color: C.confirm,     rgb: '52,211,153' },
                    { label: 'REB', value: output.projReb, color: C.signal,      rgb: '56,189,248' },
                    { label: 'AST', value: output.projAst, color: C.accentLight, rgb: '167,139,250' },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: C.surface2, borderRadius: '14px',
                      padding: '24px', textAlign: 'center',
                      border: `1px solid rgba(${s.rgb},0.2)`,
                    }}>
                      <div style={{
                        fontFamily: F.heading, fontSize: '56px', fontWeight: 900,
                        color: s.color, lineHeight: 1,
                      }}>
                        {s.value}
                      </div>
                      <div style={{
                        fontSize: '12px', color: C.textMuted,
                        letterSpacing: '1.5px', marginTop: '8px',
                      }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Model factors */}
                <div style={{
                  fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
                  color: C.textMuted, letterSpacing: '1px', marginBottom: '16px',
                }}>
                  COMPUTED FACTORS
                </div>
                <FactorBar label="Fpace (Pace Factor)" value={output.fpace} color={C.accentLight} />
                <FactorBar label="Fdef (Defense Factor)" value={output.fdef} color={C.signal} />
                <FactorBar label="Reb Suppression Multiplier" value={output.rebSuppression} color={C.confirm} />
              </div>

              {/* Formula transparency */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '28px', marginBottom: '24px',
              }}>
                <div style={{
                  fontFamily: F.heading, fontSize: '14px', fontWeight: 700,
                  color: C.accentLight, letterSpacing: '1px', marginBottom: '16px',
                }}>
                  MODEL COMPUTATION
                </div>
                <div style={{
                  background: C.surface2, borderRadius: '10px', padding: '20px',
                  fontFamily: F.mono, fontSize: '13px',
                  color: C.textMuted, lineHeight: 2,
                }}>
                  <div>
                    <span style={{ color: C.accentLight }}>Fpace</span>
                    {' = '}
                    ({inputs.opponentPace} ÷ {LEAGUE_DEFAULTS.pace}) × {matchupShare}
                    {' + '}
                    ({inputs.individualPace} ÷ {LEAGUE_DEFAULTS.pace}) × {1 - matchupShare}
                    {' = '}
                    <span style={{ color: '#fff', fontWeight: 700 }}>{output.fpace}</span>
                  </div>
                  <div>
                    <span style={{ color: C.signal }}>Fdef</span>
                    {' = '}
                    ({inputs.opponentDefRating} ÷ {LEAGUE_DEFAULTS.defRating}) × {matchupShare}
                    {' + '}
                    ({inputs.individualDefRating} ÷ {LEAGUE_DEFAULTS.defRating}) × {1 - matchupShare}
                    {' = '}
                    <span style={{ color: '#fff', fontWeight: 700 }}>{output.fdef}</span>
                  </div>
                  <div>
                    <span style={{ color: C.confirm }}>RebMult</span>
                    {' = '}
                    {inputs.indivRebsPer36} ÷ {LEAGUE_DEFAULTS.rebsPer36}
                    {' = '}
                    <span style={{ color: '#fff', fontWeight: 700 }}>{output.rebSuppression}</span>
                  </div>
                  <div style={{
                    marginTop: '8px', paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: '#fff' }}>Proj PTS</span>
                    {' = '}
                    ({inputs.per36.pts} ÷ 36) × {inputs.projectedMinutes} × {output.fpace} × {output.fdef}
                    {' = '}
                    <span style={{ color: C.confirm, fontWeight: 700 }}>{output.projPts}</span>
                  </div>
                </div>
              </div>

              {/* Override summary */}
              {overrides.size > 0 && (
                <div style={{
                  background: 'rgba(56,189,248,0.06)',
                  border: '1px solid rgba(56,189,248,0.2)',
                  borderRadius: '12px', padding: '16px 20px', marginBottom: '24px',
                }}>
                  <div style={{
                    fontSize: '12px', color: C.signal, fontWeight: 700,
                    marginBottom: '8px', letterSpacing: '0.5px',
                  }}>
                    YOUR OVERRIDES ({overrides.size} field{overrides.size !== 1 ? 's' : ''} changed from agent data)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Array.from(overrides).map(k => (
                      <span key={k} style={{
                        background: 'rgba(56,189,248,0.1)',
                        border: '1px solid rgba(56,189,248,0.2)',
                        borderRadius: '6px', padding: '3px 10px',
                        fontSize: '12px', color: C.signal,
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
                  width: '100%', background: saved ? 'rgba(167,139,250,0.1)' : C.surface2,
                  color: saved ? C.accentLight : '#fff',
                  border: `1px solid ${saved ? C.accentLight : 'rgba(255,255,255,0.15)'}`,
                  padding: '14px', borderRadius: '10px',
                  fontFamily: F.heading, fontWeight: 800, fontSize: '16px',
                  letterSpacing: '0.5px', cursor: saving || saved ? 'default' : 'pointer',
                }}
              >
                {saved ? 'SAVED TO LAB' : saving ? 'SAVING...' : '◎ SAVE TO LAB'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
