'use client'

import { useState } from 'react'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

type DateRange = '7d' | '30d' | 'custom'
type StatFilter = 'all' | 'pts' | 'reb' | 'ast'
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

const SAMPLE_RESULT: BacktestResult = {
  totalPicks: 142,
  resolved: 138,
  hits: 101,
  misses: 37,
  hitRate: 73.2,
  avgEdge: 4.8,
  avgProjectionError: 2.3,
  byConfidence: {
    high:   { hits: 52, total: 64,  rate: 81.3 },
    medium: { hits: 41, total: 58,  rate: 70.7 },
    low:    { hits: 8,  total: 16,  rate: 50.0 },
  },
  byStat: {
    pts: { hits: 44, total: 58, rate: 75.9 },
    reb: { hits: 31, total: 44, rate: 70.5 },
    ast: { hits: 26, total: 36, rate: 72.2 },
  },
  topPlayers: [
    { name: 'Nikola Jokić',            hits: 9,  total: 11, rate: 81.8 },
    { name: 'Shai Gilgeous-Alexander', hits: 8,  total: 10, rate: 80.0 },
    { name: 'Luka Dončić',             hits: 10, total: 13, rate: 76.9 },
    { name: 'Anthony Davis',           hits: 7,  total: 9,  rate: 77.8 },
  ],
  weakPlayers: [
    { name: 'LeBron James', hits: 4, total: 8, rate: 50.0 },
    { name: 'Jayson Tatum', hits: 5, total: 9, rate: 55.6 },
  ],
}

function RateBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div style={{
      height: '6px', background: 'rgba(255,255,255,0.06)',
      borderRadius: '3px', overflow: 'hidden', marginTop: '6px',
    }}>
      <div style={{
        height: '100%', width: `${rate}%`,
        background: rate >= 70 ? color : rate >= 55 ? C.caution : '#EF4444',
        borderRadius: '3px',
      }} />
    </div>
  )
}

export default function BacktesterPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [statFilter, setStatFilter] = useState<StatFilter>('all')
  const [confFilter, setConfFilter] = useState<ConfFilter>('all')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [exporting, setExporting] = useState(false)

  void statFilter
  void confFilter

  const handleRun = async () => {
    setRunning(true)
    await new Promise(r => setTimeout(r, 1800))
    setResult(SAMPLE_RESULT)
    setRunning(false)
  }

  const handleExport = () => {
    if (!result) return
    setExporting(true)
    const csv = [
      'Metric,Value',
      `Total Picks,${result.totalPicks}`,
      `Hit Rate,${result.hitRate}%`,
      `Avg Edge,${result.avgEdge}%`,
      `Avg Projection Error,${result.avgProjectionError}`,
      '',
      'Confidence,Hits,Total,Rate',
      ...Object.entries(result.byConfidence).map(([k, v]) =>
        `${k},${v.hits},${v.total},${v.rate}%`
      ),
      '',
      'Stat,Hits,Total,Rate',
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
          <span style={{ fontSize: '24px' }}>📊</span>
          <h1 style={{
            fontFamily: F.heading, fontSize: '28px', fontWeight: 900,
            margin: 0, color: '#a78bfa', letterSpacing: '0.5px',
          }}>
            ACCURACY INDEX
          </h1>
          <div style={{
            marginLeft: 'auto',
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: '100px', padding: '6px 16px',
            fontSize: '12px', color: '#a78bfa',
          }}>
            Nexus Access
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>

        {/* Filters */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', padding: '28px',
          marginBottom: '24px',
        }}>
          <h2 style={{
            fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
            margin: '0 0 20px', letterSpacing: '0.5px', color: '#a78bfa',
          }}>
            ANALYSIS PARAMETERS
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>

            {/* Date range */}
            <div>
              <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }}>
                DATE RANGE
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([['7d', 'Last 7 days'], ['30d', 'Last 30 days']] as [DateRange, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setDateRange(v)} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer',
                    background: dateRange === v ? 'rgba(167,139,250,0.15)' : C.surface2,
                    border: `1px solid ${dateRange === v ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: dateRange === v ? '#a78bfa' : C.textMuted,
                    fontSize: '12px', fontWeight: 700,
                  }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Stat filter */}
            <div>
              <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }}>
                STAT TYPE
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'pts', 'reb', 'ast'] as StatFilter[]).map(v => (
                  <button key={v} onClick={() => setStatFilter(v)} style={{
                    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                    background: statFilter === v ? 'rgba(167,139,250,0.15)' : C.surface2,
                    border: `1px solid ${statFilter === v ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: statFilter === v ? '#a78bfa' : C.textMuted,
                    fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const,
                  }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence filter */}
            <div>
              <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }}>
                CONFIDENCE
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'high', 'medium', 'low'] as ConfFilter[]).map(v => (
                  <button key={v} onClick={() => setConfFilter(v)} style={{
                    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                    background: confFilter === v ? 'rgba(167,139,250,0.15)' : C.surface2,
                    border: `1px solid ${confFilter === v ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: confFilter === v ? '#a78bfa' : C.textMuted,
                    fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const,
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
              background: running ? 'rgba(167,139,250,0.3)' : '#a78bfa',
              color: running ? C.textMuted : '#07080E',
              border: 'none', padding: '14px 36px',
              borderRadius: '10px', fontFamily: F.heading,
              fontWeight: 800, fontSize: '18px', letterSpacing: '0.5px',
              cursor: running ? 'default' : 'pointer',
              boxShadow: running ? 'none' : '0 0 32px rgba(167,139,250,0.25)',
            }}
          >
            {running ? '⏳ PROCESSING...' : '⚡ RUN ACCURACY ANALYSIS'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Top stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px', marginBottom: '24px',
            }}>
              {[
                { label: 'HIT RATE',       value: `${result.hitRate}%`,           color: C.confirm },
                { label: 'TOTAL PICKS',    value: result.resolved.toString(),      color: '#a78bfa' },
                { label: 'AVG EDGE',       value: `+${result.avgEdge}%`,           color: C.signal },
                { label: 'AVG PROJ ERROR', value: `±${result.avgProjectionError}`, color: C.caution },
              ].map(s => (
                <div key={s.label} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: '14px', padding: '24px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: F.heading, fontSize: '44px', fontWeight: 900,
                    color: s.color, lineHeight: 1,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    fontSize: '11px', color: C.textMuted,
                    letterSpacing: '1px', marginTop: '8px',
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

              {/* By confidence */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '28px',
              }}>
                <h3 style={{
                  fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
                  margin: '0 0 20px', letterSpacing: '0.5px',
                }}>
                  BY CONFIDENCE BAND
                </h3>
                {Object.entries(result.byConfidence).map(([conf, data]) => (
                  <div key={conf} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.5px', fontWeight: 700 }}>
                        {conf}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: data.rate >= 70 ? C.confirm : data.rate >= 55 ? C.caution : '#EF4444' }}>
                        {data.rate}% ({data.hits}/{data.total})
                      </span>
                    </div>
                    <RateBar rate={data.rate} color={C.confirm} />
                  </div>
                ))}
              </div>

              {/* By stat */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '28px',
              }}>
                <h3 style={{
                  fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
                  margin: '0 0 20px', letterSpacing: '0.5px',
                }}>
                  BY STAT TYPE
                </h3>
                {Object.entries(result.byStat).map(([stat, data]) => (
                  <div key={stat} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.5px', fontWeight: 700 }}>
                        {stat}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: data.rate >= 70 ? C.confirm : data.rate >= 55 ? C.caution : '#EF4444' }}>
                        {data.rate}% ({data.hits}/{data.total})
                      </span>
                    </div>
                    <RateBar rate={data.rate} color={C.signal} />
                  </div>
                ))}
              </div>
            </div>

            {/* High / low variance players */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '28px',
              }}>
                <h3 style={{
                  fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
                  color: C.confirm, margin: '0 0 20px', letterSpacing: '0.5px',
                }}>
                  ✓ HIGH VARIANCE CORRELATION
                </h3>
                {result.topPlayers.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '10px 0',
                    borderBottom: i < result.topPlayers.length - 1
                      ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.confirm }}>
                      {p.rate}% ({p.hits}/{p.total})
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '16px', padding: '28px',
              }}>
                <h3 style={{
                  fontFamily: F.heading, fontSize: '16px', fontWeight: 800,
                  color: '#EF4444', margin: '0 0 20px', letterSpacing: '0.5px',
                }}>
                  ⚠ LOW VARIANCE CORRELATION
                </h3>
                {result.weakPlayers.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '10px 0',
                    borderBottom: i < result.weakPlayers.length - 1
                      ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>
                      {p.rate}% ({p.hits}/{p.total})
                    </span>
                  </div>
                ))}
                <p style={{ fontSize: '13px', color: C.textMuted, margin: '16px 0 0', lineHeight: 1.6 }}>
                  These players have edge cases the model doesn&apos;t fully capture.
                  Apply extra scrutiny before transmitting signals on them.
                </p>
              </div>
            </div>

            {/* Export */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  background: '#a78bfa', color: '#07080E', border: 'none',
                  padding: '14px 28px', borderRadius: '8px',
                  fontFamily: F.heading, fontWeight: 800, fontSize: '16px',
                  letterSpacing: '0.5px', cursor: 'pointer',
                }}
              >
                📥 EXPORT TO CSV
              </button>
              <button
                onClick={() => setResult(null)}
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
          </>
        )}
      </div>
    </div>
  )
}
