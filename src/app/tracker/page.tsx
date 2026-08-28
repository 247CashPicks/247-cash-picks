export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'
import { getSport } from '@/lib/sport/server'
import type { Sport } from '@/lib/sport'
import ResolutionLog, { type ResultRow } from './ResolutionLog'

const C = BRAND.colors
const F = BRAND.fonts


async function getWinRateStats(sport: Sport) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('picks_published')
    .select('result, stat_type, confidence, game_date')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .neq('result', 'pending')
    .neq('result', 'void')
    .order('game_date', { ascending: false })
  return data || []
}

// The ledger is a history view, so it loads a date window rather than a fixed
// row count — the from/to filter in ResolutionLog then narrows within it. The
// cap bounds an otherwise unbounded scan; when it bites, the UI says so rather
// than silently dropping the oldest rows.
const LEDGER_WINDOW_DAYS = 30
const LEDGER_CAP = 500

async function getRecentResults(sport: Sport) {
  const supabase = createServiceClient()
  const from = new Date(Date.now() - LEDGER_WINDOW_DAYS * 86_400_000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('picks_published')
    .select('player_name, team, stat_type, line, direction, result, actual_value, game_date, our_projection, confidence')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .gte('game_date', from)
    .order('game_date', { ascending: false })
    .limit(LEDGER_CAP)
  const rows = data || []
  return { rows, capped: rows.length >= LEDGER_CAP }
}

export default async function TrackerPage() {
  const sport = await getSport()
  const [stats, ledger] = await Promise.all([
    getWinRateStats(sport),
    getRecentResults(sport),
  ])
  const results = ledger.rows

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
                LAST {LEDGER_WINDOW_DAYS} DAYS
              </span>
            </div>

            {ledger.capped && (
              <div style={{
                padding: '10px 24px', borderBottom: `1px solid ${C.border}`,
                fontFamily: F.mono, fontSize: '11px', color: C.flagAmber, letterSpacing: '0.04em',
              }}>
                ⚠ Showing the most recent {LEDGER_CAP} resolved signals in this window — older rows are not loaded. Narrow the date range to inspect earlier history.
              </div>
            )}

            {results.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '13px' }}>
                No results yet — check back after signals are resolved.
              </div>
            ) : (
              <ResolutionLog rows={results as ResultRow[]} sport={sport} />
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
