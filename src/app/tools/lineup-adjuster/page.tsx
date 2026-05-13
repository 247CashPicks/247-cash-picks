'use client'

import { useState } from 'react'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

interface PlayerStats {
  name: string
  team: string
  position: string
  gamesPlayed: number
  gamesShared: number
  individual: { pts: number; reb: number; ast: number }
  sharedFloor: { pts: number; reb: number; ast: number }
}

const SAMPLE_PLAYERS: PlayerStats[] = [
  {
    name: 'Luka Dončić',
    team: 'LAL', position: 'PG/SF',
    gamesPlayed: 56, gamesShared: 17,
    individual:   { pts: 31.35, reb: 8.7,  ast: 9.1 },
    sharedFloor:  { pts: 27.63, reb: 7.9,  ast: 8.4 },
  },
  {
    name: 'LeBron James',
    team: 'LAL', position: 'SF/PF',
    gamesPlayed: 46, gamesShared: 17,
    individual:   { pts: 24.8,  reb: 7.6,  ast: 7.4 },
    sharedFloor:  { pts: 22.1,  reb: 6.9,  ast: 6.8 },
  },
  {
    name: 'Austin Reaves',
    team: 'LAL', position: 'SG',
    gamesPlayed: 41, gamesShared: 17,
    individual:   { pts: 21.4,  reb: 4.2,  ast: 5.3 },
    sharedFloor:  { pts: 17.99, reb: 3.8,  ast: 4.6 },
  },
]

type StatKey = 'pts' | 'reb' | 'ast'

function StatComparison({
  label,
  individual,
  sharedFloor,
  useAdjusted,
}: {
  label: string
  individual: number
  sharedFloor: number
  useAdjusted: boolean
}) {
  const diff = ((sharedFloor - individual) / individual * 100).toFixed(1)
  const isDown = sharedFloor < individual
  const activeValue = useAdjusted ? sharedFloor : individual

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px',
      gap: '12px', alignItems: 'center',
      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700, letterSpacing: '0.5px' }}>
        {label}/36
      </div>
      <div style={{
        textAlign: 'center', padding: '10px',
        background: !useAdjusted ? 'rgba(52,211,153,0.1)' : C.surface2,
        border: `1px solid ${!useAdjusted ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '8px',
      }}>
        <div style={{
          fontFamily: F.heading, fontSize: '24px', fontWeight: 900,
          color: !useAdjusted ? C.confirm : C.textMuted,
        }}>
          {individual}
        </div>
        <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px' }}>Individual</div>
      </div>
      <div style={{
        textAlign: 'center', padding: '10px',
        background: useAdjusted ? 'rgba(56,189,248,0.1)' : C.surface2,
        border: `1px solid ${useAdjusted ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '8px',
      }}>
        <div style={{
          fontFamily: F.heading, fontSize: '24px', fontWeight: 900,
          color: useAdjusted ? C.signal : C.textMuted,
        }}>
          {sharedFloor}
        </div>
        <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px' }}>Shared Floor</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: '12px', fontWeight: 700,
          color: isDown ? '#EF4444' : C.confirm,
        }}>
          {isDown ? '' : '+'}{diff}%
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 700,
          color: C.confirm, marginTop: '2px',
        }}>
          USE: {activeValue}
        </div>
      </div>
    </div>
  )
}

export default function LineupAdjusterPage() {
  const [selectedPlayers] = useState<number[]>([0, 1, 2])
  const [useAdjusted, setUseAdjusted] = useState(true)

  const activePlayers = selectedPlayers.map(i => SAMPLE_PLAYERS[i])
  const needsAdjustment = activePlayers.every(p => p.gamesShared < 20)

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '28px 40px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href="/tools" style={{ color: C.textMuted, textDecoration: 'none', fontSize: '14px' }}>
            ← Lab
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '24px' }}>🔧</span>
          <h1 style={{
            fontFamily: F.heading, fontSize: '28px', fontWeight: 900,
            margin: 0, color: C.accentLight, letterSpacing: '0.5px',
          }}>
            LINEUP CALIBRATOR
          </h1>
          <div style={{
            marginLeft: 'auto',
            background: 'rgba(167,139,250,0.08)', border: `1px solid rgba(167,139,250,0.2)`,
            borderRadius: '100px', padding: '6px 16px',
            fontSize: '12px', color: C.accentLight,
          }}>
            Vector+ Access
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>

        {/* Explanation */}
        <div style={{
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.15)',
          borderRadius: '12px', padding: '20px 24px',
          marginBottom: '32px', fontSize: '14px',
          color: C.textMuted, lineHeight: 1.7,
        }}>
          <strong style={{ color: C.signal }}>When to apply adjustment: </strong>
          When star players have fewer than 20 games together, their shared-floor
          per-36 stats differ significantly from individual stats. This tool surfaces
          that difference. The model protocol:{' '}
          <strong style={{ color: '#fff' }}>always use the lower (conservative) number</strong>
          {' '}— conservative bias toward overs.
        </div>

        {/* Warning / confirmation */}
        {needsAdjustment ? (
          <div style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '12px', padding: '16px 20px',
            marginBottom: '32px', display: 'flex',
            alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ fontSize: '14px', color: C.caution, lineHeight: 1.6 }}>
              <strong>Adjustment recommended.</strong> These players have only{' '}
              {activePlayers[0]?.gamesShared ?? 0} shared games together
              (threshold: 20). Shared-floor stats are meaningfully different from individual stats.
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(52,211,153,0.06)',
            border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '16px 20px',
            marginBottom: '32px', fontSize: '14px',
            color: C.textMuted,
          }}>
            ✓ These players have 20+ shared games. Individual stats are reliable —
            adjustment is optional.
          </div>
        )}

        {/* Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          marginBottom: '32px',
        }}>
          <button
            onClick={() => setUseAdjusted(false)}
            style={{
              padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
              background: !useAdjusted ? C.confirm : 'transparent',
              color: !useAdjusted ? '#07080E' : C.textMuted,
              border: `1px solid ${!useAdjusted ? C.confirm : 'rgba(255,255,255,0.12)'}`,
              fontFamily: F.heading, fontWeight: 800, fontSize: '14px',
            }}
          >
            USE INDIVIDUAL
          </button>
          <button
            onClick={() => setUseAdjusted(true)}
            style={{
              padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
              background: useAdjusted ? C.signal : 'transparent',
              color: useAdjusted ? '#fff' : C.textMuted,
              border: `1px solid ${useAdjusted ? C.signal : 'rgba(255,255,255,0.12)'}`,
              fontFamily: F.heading, fontWeight: 800, fontSize: '14px',
            }}
          >
            USE SHARED FLOOR (CONSERVATIVE)
          </button>
          <span style={{ fontSize: '13px', color: C.textMuted }}>
            {useAdjusted ? '← Recommended when < 20 shared games' : '← Use when lineup is stable'}
          </span>
        </div>

        {/* Player comparisons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {activePlayers.map((player, i) => (
            <div key={i} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '16px', overflow: 'hidden',
            }}>
              {/* Player header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: C.surface2,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '18px' }}>{player.name}</div>
                  <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '2px' }}>
                    {player.position} · {player.team}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: C.textMuted }}>
                    {player.gamesShared} games together
                  </div>
                  <div style={{
                    fontSize: '12px', fontWeight: 700, marginTop: '4px',
                    color: player.gamesShared < 20 ? C.caution : C.confirm,
                  }}>
                    {player.gamesShared < 20 ? '⚠ Adjustment needed' : '✓ Stable lineup'}
                  </div>
                </div>
              </div>

              {/* Stat comparisons */}
              <div style={{ padding: '8px 24px 16px' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px',
                  gap: '12px', padding: '8px 0',
                }}>
                  <div />
                  <div style={{ textAlign: 'center', fontSize: '11px', color: C.textMuted, fontWeight: 700, letterSpacing: '0.5px' }}>
                    INDIVIDUAL
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '11px', color: C.textMuted, fontWeight: 700, letterSpacing: '0.5px' }}>
                    SHARED FLOOR
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: C.textMuted, fontWeight: 700, letterSpacing: '0.5px' }}>
                    CHANGE / USE
                  </div>
                </div>
                {(['pts', 'reb', 'ast'] as StatKey[]).map(stat => (
                  <StatComparison
                    key={stat}
                    label={stat.toUpperCase()}
                    individual={player.individual[stat]}
                    sharedFloor={player.sharedFloor[stat]}
                    useAdjusted={useAdjusted}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Send to Engine */}
        <div style={{
          marginTop: '40px', display: 'flex', gap: '12px',
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <a href="/tools/projection-runner" style={{
            display: 'inline-block',
            background: C.accent, color: C.text,
            padding: '14px 28px', borderRadius: '8px',
            fontFamily: F.heading, fontWeight: 800,
            fontSize: '16px', letterSpacing: '0.5px',
            textDecoration: 'none',
          }}>
            ⚡ SEND TO PROJECTION ENGINE
          </a>
          <span style={{ fontSize: '13px', color: C.textMuted }}>
            Will pre-fill using {useAdjusted ? 'shared-floor (conservative)' : 'individual'} values
          </span>
        </div>
      </div>
    </div>
  )
}
