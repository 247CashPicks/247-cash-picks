export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

async function getWinRateStats() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('picks_published')
    .select('result, stat_type, confidence, game_date')
    .eq('brand_id', '247cashpicks')
    .neq('result', 'pending')
    .neq('result', 'void')
    .order('game_date', { ascending: false })
  return data || []
}

async function getRecentResults() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('picks_published')
    .select('player_name, team, stat_type, line, direction, result, actual_value, game_date, our_projection, confidence')
    .eq('brand_id', '247cashpicks')
    .order('game_date', { ascending: false })
    .limit(50)
  return data || []
}

export default async function TrackerPage() {
  const [stats, results] = await Promise.all([
    getWinRateStats(),
    getRecentResults(),
  ])

  const resolved = stats.filter(s => s.result === 'hit' || s.result === 'miss')
  const hits = resolved.filter(s => s.result === 'hit').length
  const winRate = resolved.length > 0
    ? Math.round((hits / resolved.length) * 100)
    : 0

  const byConfidence = {
    high:   stats.filter(s => s.confidence === 'high'),
    medium: stats.filter(s => s.confidence === 'medium'),
    low:    stats.filter(s => s.confidence === 'low'),
  }

  function confRate(arr: typeof stats) {
    const r = arr.filter(s => s.result === 'hit' || s.result === 'miss')
    if (!r.length) return 0
    return Math.round((r.filter(s => s.result === 'hit').length / r.length) * 100)
  }

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '48px 40px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
            color: C.accentLight, letterSpacing: '2px', marginBottom: '12px',
          }}>
            MODEL PERFORMANCE LOG
          </div>
          <h1 style={{
            fontFamily: F.heading, fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 700, lineHeight: 0.95, margin: '0 0 16px',
          }}>
            ACCURACY INDEX
          </h1>
          <p style={{ color: C.textMuted, fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
            Complete resolution history. Every signal, every outcome, every variance from projection to actual.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>

        {/* Overall stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '48px',
        }}>
          {[
            { label: 'RESOLUTION ACCURACY', value: `${winRate}%`, color: C.confirm },
            { label: 'TOTAL RESOLVED',       value: resolved.length.toString(), color: C.signal },
            { label: 'RESOLVED: OVER',       value: hits.toString(), color: C.confirm },
            { label: 'RESOLVED: UNDER',      value: (resolved.length - hits).toString(), color: C.alert },
          ].map((s) => (
            <div key={s.label} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '16px', padding: '24px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: F.heading, fontSize: '48px', fontWeight: 700,
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

        {/* By confidence */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', padding: '32px', marginBottom: '48px',
        }}>
          <h2 style={{
            fontFamily: F.heading, fontSize: '20px', fontWeight: 700,
            margin: '0 0 24px', letterSpacing: '0.5px',
          }}>
            WIN RATE BY CONFIDENCE BAND
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'HIGH CONFIDENCE',   rate: confRate(byConfidence.high),   count: byConfidence.high.length,   color: C.confirm },
              { label: 'MEDIUM CONFIDENCE', rate: confRate(byConfidence.medium), count: byConfidence.medium.length, color: C.signal },
              { label: 'LOW CONFIDENCE',    rate: confRate(byConfidence.low),    count: byConfidence.low.length,    color: C.textMuted },
            ].map((c) => (
              <div key={c.label} style={{
                background: C.surface2, borderRadius: '12px', padding: '20px', textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: F.heading, fontSize: '40px', fontWeight: 700,
                  color: c.color,
                }}>
                  {c.rate}%
                </div>
                <div style={{
                  fontSize: '11px', color: C.textMuted,
                  letterSpacing: '1px', margin: '6px 0 4px',
                }}>
                  {c.label}
                </div>
                <div style={{ fontSize: '13px', color: C.textMuted }}>
                  {c.count} signals
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results table */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', overflow: 'hidden', marginBottom: '48px',
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h2 style={{
              fontFamily: F.heading, fontSize: '20px', fontWeight: 700,
              margin: 0, letterSpacing: '0.5px',
            }}>
              RESOLUTION LOG
            </h2>
            <span style={{ fontSize: '13px', color: C.textMuted }}>
              Last {results.length} signals
            </span>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 80px 80px 80px 80px 80px',
            padding: '12px 24px',
            background: C.surface2,
            borderBottom: `1px solid ${C.border}`,
            fontSize: '11px', fontWeight: 700, color: C.textMuted,
            letterSpacing: '1px',
          }}>
            {['PLAYER', 'STAT', 'LINE', 'SIGNAL', 'PROJ', 'RESULT'].map(h => (
              <div key={h}>{h}</div>
            ))}
          </div>

          {results.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: C.textMuted }}>
              No results yet — check back after signals are resolved.
            </div>
          ) : (
            results.map((r, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 80px 80px 80px 80px 80px',
                padding: '14px 24px',
                borderBottom: i < results.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                background: r.result === 'hit'
                  ? 'rgba(52,211,153,0.03)'
                  : r.result === 'miss' ? 'rgba(248,113,113,0.03)' : 'transparent',
                alignItems: 'center', fontSize: '14px',
              }}>
                <div>
                  <div style={{ fontWeight: 500, color: C.text }}>{r.player_name}</div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>{r.team} · {r.game_date}</div>
                </div>
                <div style={{ color: C.textMuted, fontSize: '13px' }}>
                  {r.stat_type?.toUpperCase()}
                </div>
                <div style={{ fontWeight: 600, color: C.text }}>{r.line}</div>
                <div style={{
                  fontFamily: F.heading, fontWeight: 700, fontSize: '13px',
                  color: r.direction === 'over' ? C.confirm : C.signal,
                  letterSpacing: '0.5px',
                }}>
                  {r.direction?.toUpperCase()}
                </div>
                <div style={{ color: C.textMuted, fontSize: '13px' }}>{r.our_projection}</div>
                <div style={{
                  fontWeight: 700, fontSize: '13px',
                  color: r.result === 'hit' ? C.confirm
                    : r.result === 'miss' ? C.alert : C.textMuted,
                }}>
                  {r.result === 'hit'     ? '✓ HIT'
                    : r.result === 'miss'   ? '✗ MISS'
                    : r.result === 'pending' ? '–'
                    : r.result?.toUpperCase()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', padding: '48px', textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: F.heading, fontSize: '36px', fontWeight: 700,
            margin: '0 0 12px',
          }}>
            READY TO ACCESS THE MODEL?
          </h2>
          <p style={{ color: C.textMuted, fontSize: '16px', margin: '0 0 28px' }}>
            Join DataNexus and start running precision analytics.
          </p>
          <a href="/join" style={{
            display: 'inline-block', background: C.accent, color: C.text,
            padding: '16px 40px', borderRadius: '10px', fontFamily: F.heading,
            fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px',
            textDecoration: 'none',
          }}>
            JOIN THE LAB →
          </a>
        </div>

      </div>
    </div>
  )
}
