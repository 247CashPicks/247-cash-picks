import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canUseTool } from '@/lib/picks/tiers'
import type { TierSlug, ToolKey } from '@/lib/picks/types'
import { BRAND } from '@/config/brand'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts

async function getToolUsage(clerkUserId: string) {
  const supabase = createServiceClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('picks_tool_sessions')
    .select('tool_used')
    .eq('clerk_user_id', clerkUserId)
    .eq('brand_id', BRAND.slug)
    .gte('created_at', startOfMonth.toISOString())
  return data || []
}

const TOOLS: {
  key: ToolKey
  icon: string
  label: string
  minTier: TierSlug
  minPrice: string
  route: string
  description: string
  details: string[]
  color: string
}[] = [
  {
    key: 'projection_runner',
    icon: '⚡',
    label: 'PROJECTION ENGINE',
    minTier: 'analyst',
    minPrice: '$549',
    route: '/tools/projection-runner',
    description: 'Run the exact model behind every signal.',
    details: [
      'Input any player, any game, any matchup',
      'Agent data pre-fills all fields automatically',
      'Override any input with your own research',
      'See Fpace, Fdef, and reb suppression factors',
      'Compare projections to live PrizePicks lines',
      'Save analyses to the lab for future reference',
    ],
    color: '#818CF8',
  },
  {
    key: 'matchup_builder',
    icon: '🔀',
    label: 'MATCHUP MATRIX',
    minTier: 'vector',
    minPrice: '$799',
    route: '/tools/matchup-builder',
    description: 'Visually assign primary defensive matchups.',
    details: [
      'Both team rosters with size and weight data',
      'Defensive percentile rankings per defender',
      'Automatic weight mismatch detection',
      'Reb suppression boost calculation',
      'Send assignments directly to Projection Engine',
      'Save matchup sets for recurring games',
    ],
    color: C.accentLight,
  },
  {
    key: 'lineup_adjuster',
    icon: '🔧',
    label: 'LINEUP CALIBRATOR',
    minTier: 'vector',
    minPrice: '$799',
    route: '/tools/lineup-adjuster',
    description: 'Apply shared-floor adjustments for star combinations.',
    details: [
      'Select 2-3 players for shared-floor analysis',
      'Individual vs shared-floor stats side by side',
      'Conservative (lower) value auto-selected',
      'Works for teams with mid-season trades',
      'Flags lineups with fewer than 20 games together',
      'Send adjusted stats to Projection Engine',
    ],
    color: C.accentLight,
  },
  {
    key: 'backtester',
    icon: '📊',
    label: 'ACCURACY INDEX',
    minTier: 'nexus',
    minPrice: '$1,199',
    route: '/tools/backtester',
    description: 'Run the model against historical games.',
    details: [
      'Test any date range up to full season',
      'Filter by player, stat type, confidence level',
      'See MAE and accuracy metrics per category',
      'Identify which players the model nails',
      'Identify edge cases and model weaknesses',
      'Export full results to CSV',
    ],
    color: '#a78bfa',
  },
]

function toolBorderRgb(color: string): string {
  if (color === '#818CF8') return '129,140,248'
  return '167,139,250'
}

export default async function ToolsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? 'core') as TierSlug

  const usage = await getToolUsage(userId)
  const usageCounts: Record<string, number> = {}
  usage.forEach(u => {
    usageCounts[u.tool_used] = (usageCounts[u.tool_used] || 0) + 1
  })
  const totalRuns = usage.length

  return (
    <div style={{ background: C.primary, minHeight: '100vh', paddingTop: '64px' }}>

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '40px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px',
          }}>
            <div>
              <div style={{
                fontFamily: F.heading, fontSize: '13px', fontWeight: 700,
                color: C.accentLight, letterSpacing: '2px', marginBottom: '8px',
              }}>
                THE LAB
              </div>
              <h1 style={{
                fontFamily: F.heading, fontSize: '40px', fontWeight: 900,
                margin: 0, lineHeight: 1,
              }}>
                ANALYTICAL TOOLS
              </h1>
            </div>
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '16px 24px', textAlign: 'right',
            }}>
              <div style={{
                fontFamily: F.heading, fontSize: '28px', fontWeight: 900,
                color: C.accentLight,
              }}>
                {totalRuns}
              </div>
              <div style={{ fontSize: '12px', color: C.textMuted }}>
                model executions this month
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {TOOLS.map((tool) => {
            const unlocked = tier ? canUseTool(tier, tool.key) : false
            const runs = usageCounts[tool.key] || 0
            const borderRgb = toolBorderRgb(tool.color)

            return (
              <div key={tool.key} style={{
                background: C.surface,
                border: `1px solid ${unlocked
                  ? `rgba(${borderRgb},0.3)`
                  : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '20px', padding: '36px',
                position: 'relative', overflow: 'hidden',
                opacity: unlocked ? 1 : 0.7,
              }}>

                {/* Locked badge */}
                {!unlocked && (
                  <div style={{
                    position: 'absolute', top: '20px', right: '20px',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '100px', padding: '4px 12px',
                    fontSize: '11px', color: C.textMuted, fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}>
                    🔒 {tool.minTier.toUpperCase()}+ • {tool.minPrice}/mo
                  </div>
                )}

                {/* Usage badge */}
                {unlocked && runs > 0 && (
                  <div style={{
                    position: 'absolute', top: '20px', right: '20px',
                    background: 'rgba(167,139,250,0.1)',
                    border: `1px solid ${C.border}`,
                    borderRadius: '100px', padding: '4px 12px',
                    fontSize: '11px', color: C.accentLight,
                  }}>
                    {runs} run{runs !== 1 ? 's' : ''} this month
                  </div>
                )}

                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{tool.icon}</div>

                <h2 style={{
                  fontFamily: F.heading, fontSize: '24px', fontWeight: 900,
                  color: unlocked ? tool.color : C.textMuted,
                  margin: '0 0 8px', letterSpacing: '0.5px',
                }}>
                  {tool.label}
                </h2>
                <p style={{
                  color: C.textMuted, fontSize: '15px',
                  margin: '0 0 20px', lineHeight: 1.5,
                }}>
                  {tool.description}
                </p>

                {/* Feature list */}
                <div style={{ marginBottom: '28px' }}>
                  {tool.details.map((d, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                      padding: '6px 0',
                      borderBottom: i < tool.details.length - 1
                        ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <span style={{
                        color: unlocked ? tool.color : C.textMuted,
                        fontSize: '14px', flexShrink: 0, marginTop: '1px',
                      }}>
                        {unlocked ? '✓' : '—'}
                      </span>
                      <span style={{
                        color: unlocked ? C.textMuted : 'rgba(148,163,184,0.5)',
                        fontSize: '14px',
                      }}>
                        {d}
                      </span>
                    </div>
                  ))}
                </div>

                {unlocked ? (
                  <a href={tool.route} style={{
                    display: 'block', textAlign: 'center',
                    background: tool.color,
                    color: '#07080E',
                    padding: '14px', borderRadius: '10px',
                    fontFamily: F.heading, fontWeight: 800,
                    fontSize: '16px', letterSpacing: '0.5px',
                    textDecoration: 'none',
                  }}>
                    OPEN {tool.label} →
                  </a>
                ) : (
                  <a href={`/join?tier=${tool.minTier}`} style={{
                    display: 'block', textAlign: 'center',
                    background: 'transparent',
                    color: C.textMuted,
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '14px', borderRadius: '10px',
                    fontFamily: F.heading, fontWeight: 800,
                    fontSize: '16px', letterSpacing: '0.5px',
                    textDecoration: 'none',
                  }}>
                    UPGRADE TO {tool.minTier.toUpperCase()} TO UNLOCK
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
