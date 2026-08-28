import { BRAND } from '@/config/brand'
import { statLabel } from '@/lib/picks/stats'
import type { PickPublished } from '@/lib/picks/types'

const C = BRAND.colors
const F = BRAND.fonts

// Pure presentational card — no directive, so it renders server-side for the
// locked teasers and client-side inside PicksBrowser for the filtered set.
export default function PickCard({ pick, locked }: { pick: PickPublished; locked?: boolean }) {
  const confColor = pick.confidence === 'high' ? C.signalCyan
    : pick.confidence === 'medium' ? C.platinum : C.muted
  const dirColor  = pick.direction === 'over' ? C.signalCyan : C.platinum
  const resultColor = pick.result === 'hit' ? C.signalCyan
    : pick.result === 'miss' ? C.flagAmber : C.muted

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${pick.confidence === 'high' ? C.borderEmphasis : C.border}`,
      position: 'relative', overflow: 'hidden',
      opacity: locked ? 0.35 : 1,
      filter: locked ? 'blur(3px)' : 'none',
      padding: '24px',
    }}>
      {pick.confidence === 'high' && !locked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: C.signalCyan,
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: '15px', color: C.platinum }}>
            {pick.player_name}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, marginTop: '3px', letterSpacing: '0.05em' }}>
            {pick.team} · {pick.platform}
          </div>
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: '10px', color: confColor,
          border: `1px solid ${confColor}`, padding: '3px 9px', letterSpacing: '0.1em',
        }}>
          {pick.confidence.toUpperCase()}
        </div>
      </div>

      {/* Stat line */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        padding: '16px 0', marginBottom: '20px',
      }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.1em', marginBottom: '6px' }}>
            {statLabel(pick.stat_type)} LINE
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '38px', fontWeight: 500, color: C.platinum, lineHeight: 1 }}>
            {pick.line}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: F.mono, fontSize: '26px', fontWeight: 500, color: dirColor, letterSpacing: '0.05em' }}>
            {pick.direction.toUpperCase()}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, marginTop: '4px' }}>
            PROJ: {pick.our_projection}
          </div>
        </div>
      </div>

      {/* Result */}
      {pick.result !== 'pending' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          background: pick.result === 'hit' ? 'rgba(47,212,232,0.05)' : 'rgba(232,163,61,0.05)',
          border: `1px solid ${resultColor}`,
        }}>
          <span style={{ fontFamily: F.mono, color: resultColor, fontWeight: 500, fontSize: '13px', letterSpacing: '0.08em' }}>
            {pick.result === 'hit' ? '✓ HIT' : pick.result === 'miss' ? '✗ MISS' : pick.result.toUpperCase()}
          </span>
          {pick.actual_value && (
            <span style={{ fontFamily: F.mono, color: C.dim, fontSize: '12px' }}>
              · ACTUAL: {pick.actual_value}
            </span>
          )}
        </div>
      )}

      {pick.operator_notes && (
        <div style={{
          marginTop: '12px', fontFamily: F.sans, fontSize: '13px', color: C.muted,
          borderTop: `1px solid ${C.border}`, paddingTop: '12px', lineHeight: 1.5,
        }}>
          {pick.operator_notes}
        </div>
      )}
    </div>
  )
}
