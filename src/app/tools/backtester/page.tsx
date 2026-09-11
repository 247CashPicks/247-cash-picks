'use client'

import { useEffect, useState } from 'react'
import { BRAND } from '@/config/brand'
import { statsFor, statLabel, isStatOfSport } from '@/lib/picks/stats'
import { useSport } from '@/lib/sport/client'
import type { StatType } from '@/lib/picks/types'
import { addCalendarDays, easternToday } from '@/lib/time/eastern'

const C = BRAND.colors
const F = BRAND.fonts


type DateRange  = '7d' | '30d' | 'custom'
type StatFilter = 'all' | StatType
type ConfFilter = 'all' | 'high' | 'medium' | 'low'

interface BacktestResult {
  totalPicks: number
  resolved: number
  hits: number
  misses: number
  hitRate: number
  avgEdge: number
  avgProjectionError: number
  byConfidence: Record<string, { hits: number; total: number; rate: number }>
  byStat: Record<string, { hits: number; total: number; rate: number }>
  topPlayers: { name: string; hits: number; total: number; rate: number }[]
  weakPlayers: { name: string; hits: number; total: number; rate: number }[]
}

function computeDateRange(range: DateRange): { dateFrom: string; dateTo: string } {
  const dateTo = easternToday()
  const daysBack = range === '7d' ? 7 : 30
  return { dateFrom: addCalendarDays(dateTo, -daysBack), dateTo }
}

function rateColor(rate: number): string {
  return rate >= 70 ? C.signalCyan : C.flagAmber
}

function RateBar({ rate }: { rate: number; color: string }) {
  return (
    <div style={{
      height: '3px', background: 'rgba(255,255,255,0.06)',
      marginTop: '6px',
    }}>
      <div style={{
        height: '100%', width: `${rate}%`,
        background: rateColor(rate),
      }} />
    </div>
  )
}

export default function BacktesterPage() {
  const [dateRange, setDateRange]   = useState<DateRange>('30d')
  const sport = useSport()
  const [statFilter, setStatFilter] = useState<StatFilter>('all')

  // Switching sport can strand a stat that does not exist in the new
  // vocabulary ('pts' under NFL). The API would filter stat_type='pts' against
  // NFL rows and return an empty backtest that reads as "no history" rather
  // than "impossible filter". Reset to 'all' instead.
  useEffect(() => {
    if (statFilter !== 'all' && !isStatOfSport(statFilter, sport)) {
      setStatFilter('all')
    }
  }, [sport, statFilter])
  const [confFilter, setConfFilter] = useState<ConfFilter>('all')
  const [running, setRunning]       = useState(false)
  const [result, setResult]         = useState<BacktestResult | null>(null)
  const [exporting, setExporting]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const { dateFrom, dateTo } = computeDateRange(dateRange)
      const res = await fetch('/api/tools/backtester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom, dateTo, statFilter, confFilter }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? `Server error ${res.status}`)
        return
      }
      const data = await res.json()
      setResult(data as BacktestResult)
    } catch {
      setError('Network error — unable to reach server. Check your connection and try again.')
    } finally {
      setRunning(false)
    }
  }

  const handleExport = () => {
    if (!result) return
    setExporting(true)
    const csv = [
      'Metric,Value',
      `Resolved Sample,${result.totalPicks}`,
      `Projection Accuracy,${result.hitRate}%`,
      `Avg Edge,${result.avgEdge}%`,
      `Avg Projection Error,${result.avgProjectionError}`,
      '',
      'Confidence,Correct,Total,Accuracy',
      ...Object.entries(result.byConfidence).map(([k, v]) =>
        `${k},${v.hits},${v.total},${v.rate}%`
      ),
      '',
      'Stat,Correct,Total,Accuracy',
      ...Object.entries(result.byStat).map(([k, v]) =>
        `${k},${v.hits},${v.total},${v.rate}%`
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `datanexus-accuracy-${dateRange}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

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
                    // ACCURACY INDEX
                  </span>
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 6px', letterSpacing: '-0.03em',
                }}>
                  TEST THE <span style={{ color: C.signalCyan }}>MODEL.</span>
                </h1>
                <div style={{
                  fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em',
                }}>
                  {'> run_backtest --range=30d --stat=all --conf=all'}
                </div>
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: '11px', color: C.signalCyan,
                border: `1px solid ${C.border}`, padding: '6px 14px',
                letterSpacing: '0.08em',
              }}>
                NEXUS
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(24px,4vw,48px)' }}>

          {/* Filters */}
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            padding: '24px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontFamily: F.mono, fontSize: '11px', color: C.dim,
              letterSpacing: '0.12em', marginBottom: '20px',
            }}>
              ANALYSIS PARAMETERS
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px', marginBottom: '20px',
            }}>

              {/* Date range */}
              <div>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  fontWeight: 500, letterSpacing: '0.1em', marginBottom: '8px',
                }}>
                  DATE RANGE
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {([['7d', 'Last 7 days'], ['30d', 'Last 30 days']] as [DateRange, string][]).map(([v, l]) => (
                    <button key={v} onClick={() => setDateRange(v)} style={{
                      flex: 1, padding: '8px 4px', cursor: 'pointer',
                      background: dateRange === v ? 'rgba(47,212,232,0.1)' : C.void,
                      border: `1px solid ${dateRange === v ? 'rgba(47,212,232,0.4)' : C.border}`,
                      color: dateRange === v ? C.signalCyan : C.muted,
                      fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                      letterSpacing: '0.06em',
                    }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stat filter */}
              <div>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  fontWeight: 500, letterSpacing: '0.1em', marginBottom: '8px',
                }}>
                  STAT TYPE
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['all', ...statsFor(sport)] as StatFilter[]).map(v => (
                    <button key={v} onClick={() => setStatFilter(v)} style={{
                      padding: '7px 10px', cursor: 'pointer',
                      background: statFilter === v ? 'rgba(47,212,232,0.1)' : C.void,
                      border: `1px solid ${statFilter === v ? 'rgba(47,212,232,0.4)' : C.border}`,
                      color: statFilter === v ? C.signalCyan : C.muted,
                      fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                    }}>
                      {v === 'all' ? 'ALL' : statLabel(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence filter */}
              <div>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  fontWeight: 500, letterSpacing: '0.1em', marginBottom: '8px',
                }}>
                  CONFIDENCE
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['all', 'high', 'medium', 'low'] as ConfFilter[]).map(v => (
                    <button key={v} onClick={() => setConfFilter(v)} style={{
                      padding: '7px 10px', cursor: 'pointer',
                      background: confFilter === v ? 'rgba(47,212,232,0.1)' : C.void,
                      border: `1px solid ${confFilter === v ? 'rgba(47,212,232,0.4)' : C.border}`,
                      color: confFilter === v ? C.signalCyan : C.muted,
                      fontFamily: F.mono, fontSize: '11px', fontWeight: 500,
                      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                    }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleRun}
              disabled={running}
              style={{
                background: running ? 'rgba(47,212,232,0.15)' : C.signalCyan,
                color: running ? C.dim : C.void,
                border: 'none', padding: '13px 36px',
                fontFamily: F.mono,
                fontWeight: 500, fontSize: '14px', letterSpacing: '0.12em',
                cursor: running ? 'default' : 'pointer',
              }}
            >
              {running ? '◎ PROCESSING...' : '◎ RUN ACCURACY ANALYSIS'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: C.panel,
              border: `1px solid rgba(232,163,61,0.3)`,
              padding: '20px 24px', marginBottom: '20px',
              fontFamily: F.mono, fontSize: '12px',
              color: C.flagAmber, letterSpacing: '0.04em', lineHeight: 1.6,
            }}>
              <span style={{ fontWeight: 500, letterSpacing: '0.1em' }}>// ERROR  </span>
              {error}
            </div>
          )}

          {/* Empty state — pipeline hasn't settled any picks yet */}
          {result && result.resolved === 0 && (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              padding: '44px', marginBottom: '20px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: '13px', color: C.dim,
                letterSpacing: '0.08em', marginBottom: '14px',
              }}>
                // no_resolved_picks()
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: '12px', color: C.faint,
                lineHeight: 1.9, letterSpacing: '0.02em',
              }}>
                No resolved picks in this range yet.<br />
                The backtest runs on real settled picks — results populate as picks are<br />
                published and games are graded by the result resolver.
              </div>
              <button
                onClick={() => { setResult(null); setError(null) }}
                style={{
                  marginTop: '24px',
                  background: 'transparent', color: C.muted,
                  border: `1px solid ${C.border}`,
                  padding: '10px 20px',
                  fontFamily: F.mono, fontSize: '12px',
                  letterSpacing: '0.08em', cursor: 'pointer',
                }}
              >
                CLEAR
              </button>
            </div>
          )}

          {/* Results — only when resolved picks exist */}
          {result && result.resolved > 0 && (
            <>
              {/* Top-line metrics */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px', marginBottom: '20px',
              }}>
                {[
                  { label: 'PROJECTION ACCURACY', value: `${result.hitRate}%`,           color: C.signalCyan },
                  { label: 'RESOLVED SAMPLE', value: result.resolved.toString(),      color: C.platinum  },
                  { label: 'AVG EDGE',       value: `+${result.avgEdge}%`,           color: C.signalCyan },
                  { label: 'AVG PROJ ERROR', value: `±${result.avgProjectionError}`, color: C.flagAmber  },
                ].map(s => (
                  <div key={s.label} style={{
                    background: C.panel, border: `1px solid ${C.border}`,
                    padding: '20px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: F.mono, fontSize: 'clamp(28px,3vw,40px)',
                      fontWeight: 500, color: s.color, lineHeight: 1,
                    }}>
                      {s.value}
                    </div>
                    <div style={{
                      fontFamily: F.mono, fontSize: '10px', color: C.dim,
                      letterSpacing: '0.1em', marginTop: '6px',
                    }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

                {/* By confidence */}
                <div style={{
                  background: C.panel, border: `1px solid ${C.border}`,
                  padding: '24px',
                }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.dim,
                    letterSpacing: '0.12em', marginBottom: '18px',
                  }}>
                    BY CONFIDENCE BAND
                  </div>
                  {Object.entries(result.byConfidence).map(([conf, data]) => (
                    <div key={conf} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{
                          fontFamily: F.mono, fontSize: '11px', color: C.muted,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.08em', fontWeight: 500,
                        }}>
                          {conf}
                        </span>
                        <span style={{
                          fontFamily: F.mono, fontSize: '12px', fontWeight: 500,
                          color: rateColor(data.rate),
                        }}>
                          {data.rate}% ({data.hits}/{data.total})
                        </span>
                      </div>
                      <RateBar rate={data.rate} color={rateColor(data.rate)} />
                    </div>
                  ))}
                </div>

                {/* By stat */}
                <div style={{
                  background: C.panel, border: `1px solid ${C.border}`,
                  padding: '24px',
                }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.dim,
                    letterSpacing: '0.12em', marginBottom: '18px',
                  }}>
                    BY STAT TYPE
                  </div>
                  {Object.entries(result.byStat).map(([stat, data]) => (
                    <div key={stat} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{
                          fontFamily: F.mono, fontSize: '11px', color: C.muted,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.08em', fontWeight: 500,
                        }}>
                          {stat}
                        </span>
                        <span style={{
                          fontFamily: F.mono, fontSize: '12px', fontWeight: 500,
                          color: rateColor(data.rate),
                        }}>
                          {data.rate}% ({data.hits}/{data.total})
                        </span>
                      </div>
                      <RateBar rate={data.rate} color={rateColor(data.rate)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Player variance panels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

                {/* High performers */}
                <div style={{
                  background: C.panel, border: `1px solid ${C.border}`,
                  padding: '24px',
                }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.signalCyan,
                    letterSpacing: '0.12em', marginBottom: '16px',
                  }}>
                    ◆ HIGH VARIANCE CORRELATION
                  </div>
                  {result.topPlayers.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '9px 0',
                      borderBottom: i < result.topPlayers.length - 1
                        ? `1px solid ${C.border}` : 'none',
                    }}>
                      <span style={{
                        fontFamily: F.sans, fontSize: '13px',
                        fontWeight: 500, color: C.platinum,
                      }}>
                        {p.name}
                      </span>
                      <span style={{
                        fontFamily: F.mono, fontSize: '13px',
                        fontWeight: 500, color: C.signalCyan,
                        letterSpacing: '0.04em',
                      }}>
                        {p.rate}% ({p.hits}/{p.total})
                      </span>
                    </div>
                  ))}
                </div>

                {/* Low performers */}
                <div style={{
                  background: C.panel, border: `1px solid ${C.border}`,
                  padding: '24px',
                }}>
                  <div style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.flagAmber,
                    letterSpacing: '0.12em', marginBottom: '16px',
                  }}>
                    ⚠ LOW VARIANCE CORRELATION
                  </div>
                  {result.weakPlayers.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '9px 0',
                      borderBottom: i < result.weakPlayers.length - 1
                        ? `1px solid ${C.border}` : 'none',
                    }}>
                      <span style={{
                        fontFamily: F.sans, fontSize: '13px',
                        fontWeight: 500, color: C.platinum,
                      }}>
                        {p.name}
                      </span>
                      <span style={{
                        fontFamily: F.mono, fontSize: '13px',
                        fontWeight: 500, color: C.flagAmber,
                        letterSpacing: '0.04em',
                      }}>
                        {p.rate}% ({p.hits}/{p.total})
                      </span>
                    </div>
                  ))}
                  <p style={{
                    fontFamily: F.mono, fontSize: '11px', color: C.faint,
                    margin: '14px 0 0', lineHeight: 1.6, letterSpacing: '0.02em',
                  }}>
                    These players have edge cases the model doesn&apos;t fully capture.
                    Apply extra scrutiny before transmitting signals on them.
                  </p>
                </div>
              </div>

              {/* Export */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  style={{
                    background: C.signalCyan, color: C.void, border: 'none',
                    padding: '12px 24px',
                    fontFamily: F.mono, fontWeight: 500, fontSize: '13px',
                    letterSpacing: '0.1em', cursor: exporting ? 'default' : 'pointer',
                  }}
                >
                  ◎ EXPORT TO CSV
                </button>
                <button
                  onClick={() => { setResult(null); setError(null) }}
                  style={{
                    background: 'transparent', color: C.muted,
                    border: `1px solid ${C.border}`,
                    padding: '12px 18px',
                    fontFamily: F.mono, fontWeight: 500,
                    fontSize: '13px', letterSpacing: '0.08em', cursor: 'pointer',
                  }}
                >
                  RESET
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
