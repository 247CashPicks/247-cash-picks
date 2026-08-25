export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

const NAV = [
  ['SIGNALS',  '/picks'],
  ['ENGINE',   '/tools'],
  ['PIPELINE', '/dashboard'],
  ['TIERS',    '/join'],
] as [string, string][]

async function getWinRateStats() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('picks_published')
    .select('result, stat_type, confidence, game_date')
    .eq('brand_id', BRAND.slug)
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
    .eq('brand_id', BRAND.slug)
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
  const hits     = resolved.filter(s => s.result === 'hit').length
  const winRate  = resolved.length > 0
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

  const highRate   = confRate(byConfidence.high)
  const medRate    = confRate(byConfidence.medium)
  const lowRate    = confRate(byConfidence.low)

  function rateColor(rate: number) {
    return rate >= 70 ? C.signalCyan : rate >= 50 ? C.platinum : C.flagAmber
  }

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
        height: '56px', background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(24px,4vw,48px)', gap: '32px',
      }}>
        <a href="/" style={{
          fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
          color: C.signalCyan, letterSpacing: '0.05em', marginRight: 'auto',
        }}>
          {BRAND.name}
        </a>
        {NAV.map(([label, href]) => (
          <a key={href} href={href} style={{
            fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.1em', color: C.dim,
          }}>
            {label}
          </a>
        ))}
      </nav>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>

        {/* Header */}
        <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '22px clamp(24px,4vw,48px)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '10px' }}>
              // MODEL PERFORMANCE LOG
            </div>
            <h1 style={{
              fontFamily: F.sans, fontSize: 'clamp(28px,4vw,48px)',
              fontWeight: 500, lineHeight: 0.95, margin: '0 0 10px', letterSpacing: '-0.04em',
              color: C.platinum,
            }}>
              ACCURACY <span style={{ color: C.signalCyan }}>INDEX.</span>
            </h1>
            <p style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              Complete resolution history. Every signal, every outcome, every variance from projection to actual.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(28px,3vw,44px) clamp(24px,4vw,48px)' }}>

          {/* Overall stats */}
          <div className="stats-4-grid" style={{ marginBottom: '36px' }}>
            {[
              { label: 'RESOLUTION ACCURACY', value: `${winRate}%`,                         color: rateColor(winRate) },
              { label: 'TOTAL RESOLVED',       value: resolved.length.toString(),            color: C.platinum },
              { label: 'HITS',                 value: hits.toString(),                       color: C.signalCyan },
              { label: 'MISSES',               value: (resolved.length - hits).toString(),   color: C.flagAmber },
            ].map(s => (
              <div key={s.label} style={{
                background: C.panel, border: `1px solid ${C.border}`, padding: '24px', textAlign: 'center',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 'clamp(36px,4vw,52px)', fontWeight: 500, color: s.color, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.1em', marginTop: '8px' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* By confidence */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '24px', marginBottom: '28px' }}>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '16px' }}>
              // WIN RATE BY CONFIDENCE BAND
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'HIGH CONFIDENCE',   rate: highRate, count: byConfidence.high.length },
                { label: 'MEDIUM CONFIDENCE', rate: medRate,  count: byConfidence.medium.length },
                { label: 'LOW CONFIDENCE',    rate: lowRate,  count: byConfidence.low.length },
              ].map(c => (
                <div key={c.label} style={{
                  background: C.void, border: `1px solid ${C.border}`, padding: '20px', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: F.mono, fontSize: 'clamp(28px,3vw,40px)', fontWeight: 500, color: rateColor(c.rate), lineHeight: 1 }}>
                    {c.rate}%
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.1em', margin: '8px 0 4px' }}>
                    {c.label}
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: '12px', color: C.muted }}>
                    {c.count} signals
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results table */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: '28px' }}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.panel,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em' }}>
                // RESOLUTION LOG
              </div>
              <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
                LAST {results.length} SIGNALS
              </span>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 80px 80px 80px 80px 80px',
              padding: '10px 24px',
              borderBottom: `1px solid ${C.border}`,
              fontFamily: F.mono, fontSize: '10px', fontWeight: 500,
              color: C.dim, letterSpacing: '0.1em',
            }}>
              {['PLAYER', 'STAT', 'LINE', 'SIGNAL', 'PROJ', 'RESULT'].map(h => <div key={h}>{h}</div>)}
            </div>

            {results.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '13px' }}>
                No results yet — check back after signals are resolved.
              </div>
            ) : (
              results.map((r, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 80px 80px 80px 80px 80px',
                  padding: '12px 24px',
                  borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: r.result === 'hit'
                    ? 'rgba(47,212,232,0.03)'
                    : r.result === 'miss' ? 'rgba(232,163,61,0.03)' : 'transparent',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '14px', color: C.platinum }}>
                      {r.player_name}
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, marginTop: '2px' }}>
                      {r.team} · {r.game_date}
                    </div>
                  </div>
                  <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px', letterSpacing: '0.06em' }}>
                    {r.stat_type?.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: F.mono, fontWeight: 500, color: C.platinum, fontSize: '14px' }}>
                    {r.line}
                  </div>
                  <div style={{
                    fontFamily: F.mono, fontWeight: 500, fontSize: '12px', letterSpacing: '0.06em',
                    color: r.direction === 'over' ? C.signalCyan : C.platinum,
                  }}>
                    {r.direction?.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px' }}>
                    {r.our_projection}
                  </div>
                  <div style={{
                    fontFamily: F.mono, fontWeight: 500, fontSize: '12px', letterSpacing: '0.06em',
                    color: r.result === 'hit' ? C.signalCyan
                      : r.result === 'miss' ? C.flagAmber : C.muted,
                  }}>
                    {r.result === 'hit'     ? '✓ HIT'
                      : r.result === 'miss' ? '✗ MISS'
                      : r.result === 'pending' ? '–'
                      : r.result?.toUpperCase()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* CTA */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '40px', textAlign: 'center' }}>
            <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '12px' }}>
              // ACCESS THE MODEL
            </div>
            <h2 style={{
              fontFamily: F.sans, fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 500,
              color: C.platinum, margin: '0 0 10px', letterSpacing: '-0.03em',
            }}>
              READY TO RUN THE MODEL?
            </h2>
            <p style={{ fontFamily: F.mono, color: C.muted, fontSize: '12px', margin: '0 0 24px', lineHeight: 1.7 }}>
              Join {BRAND.name} and start running precision analytics.
            </p>
            <a href="/join" style={{
              display: 'inline-block', background: C.signalCyan, color: C.void,
              padding: '13px 36px', fontFamily: F.mono, fontWeight: 500,
              fontSize: '13px', letterSpacing: '0.12em',
            }}>
              JOIN THE LAB →
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
