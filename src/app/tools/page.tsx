import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getWalletForUser } from '@/lib/auth/session'
import { canUseTool } from '@/lib/picks/tiers'
import { sportConfig } from '@/lib/sport'
import { getSport } from '@/lib/sport/server'
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
  glyph: string
  label: string
  minTier: TierSlug
  minPrice: string
  route: string
  description: string
  details: string[]
}[] = [
  {
    key: 'projection_runner',
    glyph: '◆',
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
      'Compare projections to the published market line',
      'Save analyses to the lab for future reference',
    ],
  },
  {
    key: 'matchup_builder',
    glyph: '⬡',
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
  },
  {
    key: 'lineup_adjuster',
    glyph: '◉',
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
  },
  {
    key: 'backtester',
    glyph: '◎',
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
  },
]

export default async function ToolsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wallet = await getWalletForUser(userId)
  const tier = (wallet?.tier_slug ?? 'free') as TierSlug
  const cfg  = sportConfig(await getSport())

  const usage = await getToolUsage(userId)
  const usageCounts: Record<string, number> = {}
  usage.forEach(u => {
    usageCounts[u.tool_used] = (usageCounts[u.tool_used] || 0) + 1
  })
  const totalRuns = usage.length

  return (
    <div style={{ background: C.void, minHeight: '100vh' }}>

      {/* Fixed grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(47,212,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(47,212,232,0.04) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />


      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>

        {/* Header */}
        <div style={{
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          padding: 'clamp(28px,3vw,44px) clamp(24px,4vw,48px)',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px',
            }}>
              <div>
                <div style={{
                  fontFamily: F.mono, fontSize: '11px',
                  color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '10px',
                }}>
                  // THE LAB
                </div>
                <h1 style={{
                  fontFamily: F.sans, fontSize: 'clamp(28px,4vw,42px)', fontWeight: 500,
                  color: C.platinum, margin: '0 0 10px', lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}>
                  ANALYTICAL <span style={{ color: C.signalCyan }}>TOOLS.</span>
                </h1>
                <div style={{
                  fontFamily: F.mono, fontSize: '12px', color: C.faint, letterSpacing: '0.04em',
                }}>
                  {'> query_tools --tier='}{tier.toUpperCase()}{' --access=unlocked'}
                </div>
              </div>

              <div style={{ borderLeft: `2px solid ${C.signalCyan}`, paddingLeft: '20px' }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 'clamp(32px,3.5vw,44px)', fontWeight: 500,
                  color: C.signalCyan, lineHeight: 1,
                }}>
                  {totalRuns}
                </div>
                <div style={{
                  fontFamily: F.mono, fontSize: '10px', color: C.dim,
                  letterSpacing: '0.1em', marginTop: '4px',
                }}>
                  MODEL EXECUTIONS / MONTH
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tool cards */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(28px,3vw,44px) clamp(24px,4vw,48px)' }}>
          <div className="tools-grid">
            {/* Lineup Adjuster and Matchup Builder are basketball concepts —
                per-36 over shared on-court minutes, and 1-on-1 defender iso
                by height/weight. There is no NFL analogue, so under NFL they
                are hidden rather than shown broken or half-ported. Their APIs
                return unsupported:true for the same reason. */}
            {TOOLS.filter((t) => !cfg.hiddenTools.includes(t.key)).map((tool) => {
              const unlocked = tier ? canUseTool(tier, tool.key) : false
              const runs = usageCounts[tool.key] || 0

              return (
                <div key={tool.key} style={{
                  background: C.panel,
                  border: `1px solid ${unlocked ? C.borderEmphasis : C.border}`,
                  position: 'relative',
                  padding: '28px',
                  opacity: unlocked ? 1 : 0.75,
                }}>

                  {/* Corner badge — tier requirement or run count */}
                  <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    fontFamily: F.mono, fontSize: '10px',
                    color: unlocked && runs > 0 ? C.signalCyan : C.faint,
                    letterSpacing: '0.08em',
                  }}>
                    {unlocked && runs > 0
                      ? `${runs} run${runs !== 1 ? 's' : ''} / mo`
                      : `${tool.minTier.toUpperCase()}+ · ${tool.minPrice}/mo`}
                  </div>

                  {/* Glyph */}
                  <div style={{
                    fontFamily: F.mono, fontSize: '22px',
                    color: unlocked ? C.signalCyan : C.dim,
                    marginBottom: '14px', lineHeight: 1,
                  }}>
                    {tool.glyph}
                  </div>

                  {/* Label */}
                  <h2 style={{
                    fontFamily: F.sans, fontSize: '17px', fontWeight: 500,
                    color: unlocked ? C.platinum : C.dim,
                    margin: '0 0 8px', letterSpacing: '-0.01em',
                  }}>
                    {tool.label}
                  </h2>

                  {/* Description */}
                  <p style={{
                    fontFamily: F.sans, color: C.muted, fontSize: '13px',
                    margin: '0 0 20px', lineHeight: 1.6,
                  }}>
                    {tool.description}
                  </p>

                  {/* Feature list */}
                  <div style={{ marginBottom: '24px' }}>
                    {tool.details.map((d, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '9px', alignItems: 'flex-start',
                        padding: '5px 0',
                        borderBottom: i < tool.details.length - 1
                          ? `1px solid ${C.border}` : 'none',
                      }}>
                        <span style={{
                          fontFamily: F.mono,
                          color: unlocked ? C.signalCyan : C.faint,
                          fontSize: '13px', flexShrink: 0, marginTop: '1px',
                        }}>
                          {unlocked ? '›' : '—'}
                        </span>
                        <span style={{
                          fontFamily: F.sans,
                          color: unlocked ? C.muted : C.faint,
                          fontSize: '13px', lineHeight: 1.5,
                        }}>
                          {d}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {unlocked ? (
                    <a href={tool.route} style={{
                      display: 'block', textAlign: 'center',
                      background: C.signalCyan, color: C.void,
                      padding: '11px',
                      fontFamily: F.mono, fontWeight: 500,
                      fontSize: '12px', letterSpacing: '0.12em',
                      textDecoration: 'none',
                    }}>
                      ENTER →
                    </a>
                  ) : (
                    <a href={`/join?tier=${tool.minTier}`} style={{
                      display: 'block', textAlign: 'center',
                      background: 'transparent', color: C.flagAmber,
                      border: `1px solid rgba(232,163,61,0.3)`,
                      padding: '11px',
                      fontFamily: F.mono, fontWeight: 500,
                      fontSize: '11px', letterSpacing: '0.08em',
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
    </div>
  )
}
