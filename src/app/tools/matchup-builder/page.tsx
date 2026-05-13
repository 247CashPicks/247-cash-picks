'use client'

import { useState } from 'react'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

interface Player {
  name: string
  position: string
  heightIn: number
  weightLbs: number
  team: string
  defPercentile?: number
  rebPercentile?: number
}

interface Matchup {
  offensivePlayer: Player
  defender: Player | null
  weightMismatch: number
  rebBoostPct: number
}

const SAMPLE_OFFENSE: Player[] = [
  { name: 'Luka Dončić', position: 'PG/SF', heightIn: 79, weightLbs: 230, team: 'LAL' },
  { name: 'LeBron James', position: 'SF/PF', heightIn: 81, weightLbs: 250, team: 'LAL' },
  { name: 'Austin Reaves', position: 'SG', heightIn: 77, weightLbs: 197, team: 'LAL' },
  { name: 'Anthony Davis', position: 'C/PF', heightIn: 82, weightLbs: 253, team: 'LAL' },
  { name: 'D\'Angelo Russell', position: 'PG', heightIn: 75, weightLbs: 193, team: 'LAL' },
]

const SAMPLE_DEFENSE: Player[] = [
  { name: 'Franz Wagner', position: 'SF', heightIn: 80, weightLbs: 220, team: 'ORL', defPercentile: 72, rebPercentile: 58 },
  { name: 'Paolo Banchero', position: 'PF', heightIn: 82, weightLbs: 250, team: 'ORL', defPercentile: 61, rebPercentile: 74 },
  { name: 'Jalen Suggs', position: 'SG/PG', heightIn: 76, weightLbs: 205, team: 'ORL', defPercentile: 85, rebPercentile: 42 },
  { name: 'Wendell Carter Jr.', position: 'C', heightIn: 81, weightLbs: 270, team: 'ORL', defPercentile: 68, rebPercentile: 80 },
  { name: 'Gary Harris', position: 'SG', heightIn: 75, weightLbs: 210, team: 'ORL', defPercentile: 77, rebPercentile: 35 },
]

function inchesToFeetStr(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

function PlayerCard({
  player,
  selected,
  onSelect,
  isDefender,
}: {
  player: Player
  selected: boolean
  onSelect: () => void
  isDefender?: boolean
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? C.surface2 : C.surface,
        border: `2px solid ${selected
          ? (isDefender ? '#EF4444' : C.confirm)
          : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px', padding: '16px',
        cursor: 'pointer', transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          width: '20px', height: '20px', borderRadius: '50%',
          background: isDefender ? '#EF4444' : C.confirm,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', color: '#07080E', fontWeight: 700,
        }}>
          ✓
        </div>
      )}
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
        {player.name}
      </div>
      <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px' }}>
        {player.position} · {player.team}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <span style={{ fontSize: '11px', color: C.textMuted }}>
          {inchesToFeetStr(player.heightIn)}
        </span>
        <span style={{ fontSize: '11px', color: C.textMuted }}>
          {player.weightLbs} lbs
        </span>
      </div>
      {isDefender && player.defPercentile !== undefined && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
            background: player.defPercentile > 70
              ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.1)',
            color: player.defPercentile > 70 ? '#EF4444' : C.textMuted,
            fontWeight: 700,
          }}>
            DEF {player.defPercentile}th %ile
          </span>
          {player.rebPercentile !== undefined && (
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(148,163,184,0.1)',
              color: C.textMuted, fontWeight: 700,
            }}>
              REB {player.rebPercentile}th %ile
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function MatchupBuilderPage() {
  const [matchups, setMatchups] = useState<Matchup[]>(
    SAMPLE_OFFENSE.map(p => ({
      offensivePlayer: p,
      defender: null,
      weightMismatch: 0,
      rebBoostPct: 0,
    }))
  )
  const [selectedOffense, setSelectedOffense] = useState<number | null>(null)
  const [sent, setSent] = useState(false)

  const assignDefender = (defenderIndex: number) => {
    if (selectedOffense === null) return
    const defender = SAMPLE_DEFENSE[defenderIndex]
    const offPlayer = matchups[selectedOffense].offensivePlayer
    const mismatch = Math.abs(offPlayer.weightLbs - defender.weightLbs)
    const boostPct = Math.floor(mismatch / 10) * 5

    setMatchups(prev => prev.map((m, i) =>
      i === selectedOffense
        ? { ...m, defender, weightMismatch: mismatch, rebBoostPct: boostPct }
        : m
    ))
    setSelectedOffense(null)
    setSent(false)
  }

  const completedCount = matchups.filter(m => m.defender !== null).length

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '28px 40px',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href="/tools" style={{ color: C.textMuted, textDecoration: 'none', fontSize: '14px' }}>
            ← Lab
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '24px' }}>🔀</span>
          <h1 style={{
            fontFamily: F.heading, fontSize: '28px', fontWeight: 900,
            margin: 0, color: C.accentLight, letterSpacing: '0.5px',
          }}>
            MATCHUP MATRIX
          </h1>
          <div style={{
            marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', color: C.textMuted }}>
              {completedCount}/{matchups.length} matchups assigned
            </span>
            <div style={{
              background: 'rgba(167,139,250,0.08)', border: `1px solid rgba(167,139,250,0.2)`,
              borderRadius: '100px', padding: '6px 16px',
              fontSize: '12px', color: C.accentLight,
            }}>
              Vector+ Access
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 40px' }}>

        {/* Instructions */}
        <div style={{
          background: 'rgba(52,211,153,0.06)',
          border: `1px solid rgba(52,211,153,0.15)`,
          borderRadius: '12px', padding: '16px 20px',
          fontSize: '14px', color: C.textMuted, marginBottom: '32px',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: C.confirm }}>How to use: </strong>
          Click an offensive player to select them (highlighted green), then click their primary
          defender from the right panel. Weight mismatches over 10 lbs auto-apply a rebound boost.
          {selectedOffense !== null && (
            <span style={{ color: C.confirm, fontWeight: 600 }}>
              {' '}Now select a defender for <strong>{matchups[selectedOffense].offensivePlayer.name}</strong>
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

          {/* Offense */}
          <div>
            <div style={{
              fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
              color: C.confirm, letterSpacing: '1px',
              marginBottom: '16px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>OFFENSIVE ROSTER</span>
              <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: F.body }}>
                Click to select
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matchups.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <PlayerCard
                      player={m.offensivePlayer}
                      selected={selectedOffense === i}
                      onSelect={() => setSelectedOffense(selectedOffense === i ? null : i)}
                    />
                  </div>
                  <div style={{
                    width: '32px', textAlign: 'center',
                    fontSize: '18px', color: C.textMuted, flexShrink: 0,
                  }}>
                    {m.defender ? '→' : '·'}
                  </div>
                  <div style={{ flex: 1 }}>
                    {m.defender ? (
                      <div style={{
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '12px', padding: '14px',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                          {m.defender.name}
                        </div>
                        <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px' }}>
                          {m.defender.position} · {m.defender.team}
                        </div>
                        {m.weightMismatch >= 10 && (
                          <div style={{
                            fontSize: '11px', color: C.accentLight,
                            background: 'rgba(167,139,250,0.08)',
                            border: '1px solid rgba(167,139,250,0.2)',
                            borderRadius: '6px', padding: '3px 8px',
                            display: 'inline-block',
                          }}>
                            +{m.rebBoostPct}% reb boost ({m.weightMismatch} lb mismatch)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: '12px', padding: '14px',
                        textAlign: 'center', color: C.textMuted, fontSize: '13px',
                      }}>
                        {selectedOffense === i ? 'Select defender →' : 'No defender assigned'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Defenders */}
          <div>
            <div style={{
              fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
              color: '#EF4444', letterSpacing: '1px',
              marginBottom: '16px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>DEFENSIVE ROSTER</span>
              <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: F.body }}>
                {selectedOffense !== null ? 'Click to assign' : 'Select a player first'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {SAMPLE_DEFENSE.map((d, i) => (
                <PlayerCard
                  key={i}
                  player={d}
                  selected={matchups.some(m => m.defender?.name === d.name)}
                  onSelect={() => selectedOffense !== null && assignDefender(i)}
                  isDefender
                />
              ))}
            </div>
          </div>
        </div>

        {/* Summary + Send to Engine */}
        {completedCount > 0 && (
          <div style={{
            marginTop: '40px', background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '32px',
          }}>
            <h2 style={{
              fontFamily: F.heading, fontSize: '20px', fontWeight: 800,
              margin: '0 0 20px', letterSpacing: '0.5px',
            }}>
              ASSIGNMENT SUMMARY
            </h2>
            <div style={{ marginBottom: '24px' }}>
              {matchups.filter(m => m.defender).map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '14px',
                }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{m.offensivePlayer.name}</span>
                  <span style={{ color: C.textMuted }}>vs</span>
                  <span style={{ flex: 1, color: '#EF4444' }}>{m.defender!.name}</span>
                  {m.weightMismatch >= 10 ? (
                    <span style={{ fontSize: '12px', color: C.accentLight }}>
                      +{m.rebBoostPct}% reb
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: C.textMuted }}>No boost</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a href="/tools/projection-runner" style={{
                display: 'inline-block',
                background: C.accent, color: C.text,
                padding: '14px 28px', borderRadius: '8px',
                fontFamily: F.heading, fontWeight: 800,
                fontSize: '16px', letterSpacing: '0.5px',
                textDecoration: 'none',
              }}
              onClick={() => setSent(true)}
              >
                {sent ? '✓ SENT TO ENGINE' : '⚡ SEND TO PROJECTION ENGINE'}
              </a>
              <button
                onClick={() => {
                  setMatchups(SAMPLE_OFFENSE.map(p => ({
                    offensivePlayer: p, defender: null,
                    weightMismatch: 0, rebBoostPct: 0,
                  })))
                  setSent(false)
                }}
                style={{
                  background: 'transparent', color: C.textMuted,
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '14px 20px', borderRadius: '8px',
                  fontFamily: F.heading, fontWeight: 700,
                  fontSize: '15px', cursor: 'pointer',
                }}
              >
                RESET
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
