'use client'

import { useState, useEffect } from 'react'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts


interface MatchupRow {
  player_name: string
  player_team: string
  position: string | null
  per36_pts: number | null
  per36_reb: number | null
  per36_ast: number | null
  per36_stl: number | null
  per36_blk: number | null
  per36_tpm: number | null
  avg_minutes: number | null
  player_height_in: number | null
  player_weight_lbs: number | null
  defender_name: string | null
  defender_team: string | null
  defender_height_in: number | null
  defender_weight_lbs: number | null
  weight_mismatch_lbs: number | null
  weight_boost_pct: number | null
  weight_boost_applied: boolean | null
  defender_percentile: number | null
  opponent_pace: number | null
  opponent_def_rating: number | null
  opp_rebs_allowed: number | null
  opp_ast_allowed: number | null
}

interface GameData {
  game_id: string
  home_team: string
  away_team: string
  matchups: MatchupRow[]
}

function inchesToFeetStr(inches: number | null): string {
  if (inches == null) return '—'
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

function fmtStat(v: number | null): string {
  if (v == null) return '—'
  return v.toFixed(1)
}

function MatchupCard({
  m,
  selected,
  onSelect,
}: {
  m: MatchupRow
  selected: boolean
  onSelect: () => void
}) {
  const hasBoost = (m.weight_boost_pct ?? 0) > 0
  const highDef  = (m.defender_percentile ?? 0) > 70

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 72px 1fr',
        gap: '12px',
        alignItems: 'start',
        padding: `14px 20px 14px ${selected ? '17px' : '20px'}`,
        borderBottom: `1px solid ${C.border}`,
        borderLeft: `3px solid ${selected ? C.signalCyan : 'transparent'}`,
        background: selected ? 'rgba(47,212,232,0.04)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {/* Offensive player */}
      <div>
        <div style={{
          fontFamily: F.sans, fontWeight: 500, fontSize: '14px',
          color: selected ? C.signalCyan : C.platinum, marginBottom: '2px',
        }}>
          {m.player_name}
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: '11px', color: C.muted,
          letterSpacing: '0.04em', marginBottom: '4px',
        }}>
          {m.position ?? '—'} · {m.player_team}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim }}>
          {inchesToFeetStr(m.player_height_in)}
          {m.player_weight_lbs != null ? ` / ${m.player_weight_lbs} lbs` : ''}
        </div>
        {(m.per36_pts != null || m.per36_reb != null || m.per36_ast != null) && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '7px', flexWrap: 'wrap' }}>
            {m.per36_pts != null && (
              <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.signalCyan, letterSpacing: '0.04em' }}>
                {fmtStat(m.per36_pts)} PTS
              </span>
            )}
            {m.per36_reb != null && (
              <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.platinum, letterSpacing: '0.04em' }}>
                {fmtStat(m.per36_reb)} REB
              </span>
            )}
            {m.per36_ast != null && (
              <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.04em' }}>
                {fmtStat(m.per36_ast)} AST
              </span>
            )}
            {m.avg_minutes != null && (
              <span style={{ fontFamily: F.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.04em' }}>
                {fmtStat(m.avg_minutes)} min
              </span>
            )}
          </div>
        )}
      </div>

      {/* Arrow + boost */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: '2px', gap: '3px',
      }}>
        <span style={{
          fontFamily: F.mono, fontSize: '16px',
          color: hasBoost ? C.signalCyan : C.faint,
        }}>
          →
        </span>
        {hasBoost && (
          <span style={{
            fontFamily: F.mono, fontSize: '9px', color: C.signalCyan,
            letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.4,
          }}>
            +{m.weight_boost_pct}%<br />reb
          </span>
        )}
      </div>

      {/* Defender */}
      <div>
        {m.defender_name ? (
          <>
            <div style={{
              fontFamily: F.sans, fontWeight: 500, fontSize: '14px',
              color: C.flagAmber, marginBottom: '2px',
            }}>
              {m.defender_name}
            </div>
            <div style={{
              fontFamily: F.mono, fontSize: '11px', color: C.muted,
              letterSpacing: '0.04em', marginBottom: '4px',
            }}>
              {m.defender_team}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim }}>
              {inchesToFeetStr(m.defender_height_in)}
              {m.defender_weight_lbs != null ? ` / ${m.defender_weight_lbs} lbs` : ''}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '7px', flexWrap: 'wrap' }}>
              {m.defender_percentile != null && (
                <span style={{
                  fontFamily: F.mono, fontSize: '10px', padding: '2px 7px',
                  background: highDef ? 'rgba(232,163,61,0.12)' : 'rgba(255,255,255,0.04)',
                  color: highDef ? C.flagAmber : C.dim,
                  letterSpacing: '0.06em',
                }}>
                  DEF {Math.round(m.defender_percentile)}th %ile
                </span>
              )}
              {(m.weight_mismatch_lbs ?? 0) >= 10 && (
                <span style={{
                  fontFamily: F.mono, fontSize: '10px', padding: '2px 7px',
                  background: 'rgba(255,255,255,0.03)',
                  color: C.faint, letterSpacing: '0.04em',
                }}>
                  {m.weight_mismatch_lbs} lb mis.
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{
            fontFamily: F.mono, fontSize: '11px', color: C.faint,
            fontStyle: 'italic', paddingTop: '2px',
          }}>
            no defender assigned
          </div>
        )}
      </div>
    </div>
  )
}

export default function MatchupBuilderPage() {
  const [loading, setLoading]             = useState(true)
  const [found, setFound]                 = useState(false)
  const [games, setGames]                 = useState<GameData[]>([])
  const [loadedDate, setLoadedDate]       = useState<string | null>(null)
  const [selectedGameIdx, setSelectedGameIdx] = useState(0)
  const [selectedPlayer, setSelectedPlayer]   = useState<MatchupRow | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tools/today-matchups')
        if (res.ok) {
          const data = await res.json()
          setFound(!!data.found)
          setGames(data.games ?? [])
          setLoadedDate(data.date ?? null)
        }
      } catch {
        setFound(false)
        setGames([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const currentGame   = games[selectedGameIdx] ?? null
  const totalMatchups = games.reduce((n, g) => n + g.matchups.length, 0)
  const teams         = currentGame
    ? [...new Set(currentGame.matchups.map(m => m.player_team))]
    : []

  const headerCmd = loading
    ? '> loading_matchups --slate=today...'
    : !found
    ? '> no_slate_today() -- pipeline runs on game days'
    : `> matchups_loaded --date=${loadedDate} --games=${games.length} --rows=${totalMatchups}`

  return (
    <div style={{ background: C.void, minHeight: '100vh' }}>

      {/* Fixed grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(47,212,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(47,212,232,0.04) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />


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
                    // MATCHUP MATRIX
                  </span>
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 6px', letterSpacing: '-0.03em',
                }}>
                  BUILD THE <span style={{ color: C.signalCyan }}>MATRIX.</span>
                </h1>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
                  {headerCmd}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {!loading && found && (
                  <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
                    {totalMatchups} matchups · {games.length} games
                  </span>
                )}
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
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(24px,4vw,48px)' }}>

          {/* Loading */}
          {loading && (
            <div style={{
              padding: '64px 0', textAlign: 'center',
              fontFamily: F.mono, fontSize: '12px', color: C.faint,
              letterSpacing: '0.06em',
            }}>
              loading today&apos;s matchup slate...
            </div>
          )}

          {/* Empty state */}
          {!loading && !found && (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              padding: '48px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: '13px', color: C.dim,
                letterSpacing: '0.08em', marginBottom: '16px',
              }}>
                // no_slate_today()
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: '12px', color: C.faint,
                lineHeight: 1.9, letterSpacing: '0.02em',
              }}>
                Matchup data populates on game days when the pipeline runs.<br />
                The Scout → Matchup agent chain fires ~2 hours before tip-off.<br />
                Check back on game days or trigger the pipeline manually from the dashboard.
              </div>
            </div>
          )}

          {/* Main content */}
          {!loading && found && games.length > 0 && (
            <>
              {/* Game tabs */}
              <div style={{
                display: 'flex', gap: '6px', overflowX: 'auto',
                paddingBottom: '14px', marginBottom: '20px',
                borderBottom: `1px solid ${C.border}`,
              }}>
                {games.map((g, i) => (
                  <button
                    key={g.game_id}
                    onClick={() => { setSelectedGameIdx(i); setSelectedPlayer(null) }}
                    style={{
                      flexShrink: 0, padding: '7px 14px',
                      background: selectedGameIdx === i ? 'rgba(47,212,232,0.08)' : 'transparent',
                      border: `1px solid ${selectedGameIdx === i ? C.borderEmphasis : C.border}`,
                      color: selectedGameIdx === i ? C.signalCyan : C.muted,
                      fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                      letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {g.away_team} @ {g.home_team}
                  </button>
                ))}
              </div>

              {/* Context strip */}
              <div style={{
                background: 'rgba(47,212,232,0.03)',
                border: `1px solid rgba(47,212,232,0.12)`,
                padding: '11px 16px', marginBottom: '20px',
                fontFamily: F.mono, fontSize: '11px', color: C.muted,
                letterSpacing: '0.03em', lineHeight: 1.6,
              }}>
                <span style={{ color: C.signalCyan }}>◆ PIPELINE-ASSIGNED MATCHUPS</span>
                {' — '}
                Defenders assigned by the Matchup agent using CTG coverage percentile data.
                {' '}Click a player row to select, then send to Projection Engine.
                {selectedPlayer && (
                  <span style={{ color: C.signalCyan }}>
                    {' '}Selected: <strong>{selectedPlayer.player_name}</strong>
                  </span>
                )}
              </div>

              {/* Per-team sections */}
              {currentGame && teams.map(team => {
                const teamMatchups = currentGame.matchups.filter(m => m.player_team === team)
                const opp          = teamMatchups[0]?.defender_team ?? '—'
                return (
                  <div key={team} style={{
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    marginBottom: '16px',
                    overflow: 'hidden',
                  }}>
                    {/* Section header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 72px 1fr', gap: '12px',
                      padding: '10px 20px', borderBottom: `1px solid ${C.border}`,
                      background: 'rgba(255,255,255,0.01)',
                    }}>
                      <div style={{
                        fontFamily: F.mono, fontSize: '10px',
                        color: C.signalCyan, letterSpacing: '0.1em',
                      }}>
                        // {team} OFFENSE
                      </div>
                      <div />
                      <div style={{
                        fontFamily: F.mono, fontSize: '10px',
                        color: C.flagAmber, letterSpacing: '0.1em',
                      }}>
                        {opp} DEFENSE
                      </div>
                    </div>
                    {/* Column labels */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 72px 1fr', gap: '12px',
                      padding: '7px 20px', borderBottom: `1px solid ${C.border}`,
                    }}>
                      <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.08em' }}>
                        PLAYER · PTS / REB / AST per 36
                      </div>
                      <div />
                      <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.08em' }}>
                        ASSIGNED DEFENDER
                      </div>
                    </div>
                    {teamMatchups.map((m, i) => (
                      <MatchupCard
                        key={i}
                        m={m}
                        selected={
                          selectedPlayer?.player_name === m.player_name &&
                          selectedPlayer?.player_team === m.player_team
                        }
                        onSelect={() =>
                          setSelectedPlayer(
                            selectedPlayer?.player_name === m.player_name &&
                            selectedPlayer?.player_team === m.player_team
                              ? null
                              : m
                          )
                        }
                      />
                    ))}
                  </div>
                )
              })}

              {/* Send to engine panel */}
              <div style={{
                marginTop: '24px',
                background: C.panel,
                border: `1px solid ${selectedPlayer ? C.borderEmphasis : C.border}`,
                padding: '22px 28px',
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: '11px', color: C.dim,
                  letterSpacing: '0.12em', marginBottom: '14px',
                }}>
                  PROJECTION ENGINE
                </div>
                {selectedPlayer ? (
                  <>
                    <div style={{
                      fontFamily: F.mono, fontSize: '12px', color: C.muted,
                      marginBottom: '16px', letterSpacing: '0.03em',
                    }}>
                      <span style={{ color: C.platinum }}>{selectedPlayer.player_name}</span>
                      {' '}({selectedPlayer.player_team})
                      {selectedPlayer.defender_name && (
                        <span>
                          <span style={{ color: C.faint }}> vs </span>
                          <span style={{ color: C.flagAmber }}>{selectedPlayer.defender_name}</span>
                          {(selectedPlayer.weight_boost_pct ?? 0) > 0 && (
                            <span style={{ color: C.signalCyan }}>
                              {' '}· +{selectedPlayer.weight_boost_pct}% reb boost
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <a
                        href={`/tools/projection-runner?player=${encodeURIComponent(selectedPlayer.player_name)}&team=${encodeURIComponent(selectedPlayer.player_team)}`}
                        style={{
                          display: 'inline-block',
                          background: C.signalCyan, color: C.void,
                          padding: '12px 24px',
                          fontFamily: F.mono, fontWeight: 500,
                          fontSize: '13px', letterSpacing: '0.1em',
                          textDecoration: 'none',
                        }}
                      >
                        ◆ SEND TO PROJECTION ENGINE
                      </a>
                      <button
                        onClick={() => setSelectedPlayer(null)}
                        style={{
                          background: 'transparent', color: C.muted,
                          border: `1px solid ${C.border}`,
                          padding: '12px 18px',
                          fontFamily: F.mono, fontSize: '12px',
                          letterSpacing: '0.08em', cursor: 'pointer',
                        }}
                      >
                        CLEAR
                      </button>
                    </div>
                    <div style={{
                      marginTop: '10px',
                      fontFamily: F.mono, fontSize: '10px', color: C.faint,
                      letterSpacing: '0.04em',
                    }}>
                      passes ?player= and ?team= via URL — follow-on: projection runner reads params on mount to auto-select
                    </div>
                  </>
                ) : (
                  <div style={{
                    fontFamily: F.mono, fontSize: '12px', color: C.faint,
                    letterSpacing: '0.04em',
                  }}>
                    Click any offensive player row above to select, then send to Projection Engine.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
