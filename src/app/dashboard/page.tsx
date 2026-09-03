import { redirect } from 'next/navigation'
import { sessionTier, OPERATOR_TIER } from '@/lib/auth/guards'
import { canAccess } from '@/lib/picks/tiers'
import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/config/brand'
import { PROJECTION_COLUMNS } from '@/lib/picks/stats'
import { getSport } from '@/lib/sport/server'
import { sportConfig, type Sport } from '@/lib/sport'
import { AGENTS_BY_SPORT } from '@/lib/picks/agents'
import AgentPipeline from './AgentPipeline'
import ProjectionsPanel, { type ProjRow } from './ProjectionsPanel'
import SignalQueuePanel, { type Selection } from './SignalQueuePanel'
import BriefingsPanel from './BriefingsPanel'
import { editionLabel, formatBriefingRange, type Briefing } from '@/lib/briefings'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts


// What the board is showing. NBA is always a single day (today); NFL is an
// upcoming window that can span one or more weeks, labelled from the actual
// game weeks in the data rather than from "today".
type Slate =
  | { kind: 'day' }
  | { kind: 'window'; label: string; range: string }

const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })

function describeSlate(
  windowDays: number,
  projections: { game_date?: string | null }[],
  games: { game_date: string; week: number | null }[],
): Slate {
  if (windowDays === 0) return { kind: 'day' }

  const dates = [...new Set(
    projections.map(p => p.game_date).filter((d): d is string => !!d),
  )].sort()
  const inSlate = new Set(dates)
  const weeks = [...new Set(
    games.filter(g => inSlate.has(g.game_date))
         .map(g => g.week)
         .filter((w): w is number => w != null),
  )].sort((a, b) => a - b)

  // Prefer the week number (WEEK 1) an operator thinks in; fall back to the
  // date range if the games table has no week for these dates.
  const label = weeks.length === 0
    ? 'UPCOMING SLATE'
    : weeks.length === 1
      ? `WEEK ${weeks[0]}`
      : `WEEKS ${weeks[0]}–${weeks[weeks.length - 1]}`

  const range = dates.length === 0
    ? ''
    : dates.length === 1
      ? fmtDay(dates[0])
      : `${fmtDay(dates[0])} – ${fmtDay(dates[dates.length - 1])}`

  return { kind: 'window', label, range }
}

async function getDashboardData(sport: Sport) {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const windowDays = sportConfig(sport).slateWindowDays
  // NBA: today only, unchanged. NFL: the upcoming window [today, today + N] —
  // a whole week stages at once, so a same-day filter showed an empty board on
  // five days out of six while ten selections sat waiting.
  const upper = windowDays > 0
    ? new Date(Date.parse(today) + windowDays * 86_400_000).toISOString().split('T')[0]
    : today

  let projQ = supabase
    .from('picks_projections').select('*')
    .eq('brand_id', BRAND.slug).eq('league', sport)
  projQ = windowDays > 0
    ? projQ.gte('game_date', today).lte('game_date', upper)
    : projQ.eq('game_date', today)

  let selQ = supabase
    .from('picks_selections').select('*')
    .eq('brand_id', BRAND.slug).eq('league', sport)
    .in('status', ['pending', 'confirmed'])
  selQ = windowDays > 0
    ? selQ.gte('game_date', today).lte('game_date', upper)
    : selQ.eq('game_date', today)

  let lineQ = supabase
    .from('picks_lines')
    .select('player_name, stat_type, line, platform, edge_pct, recommended_side')
    .eq('brand_id', BRAND.slug).eq('league', sport)
  lineQ = windowDays > 0
    ? lineQ.gte('game_date', today).lte('game_date', upper)
    : lineQ.eq('game_date', today)

  const [projectionsRes, selectionsRes, linesRes, gamesRes, briefingsRes, latestBriefingRes] = await Promise.all([
    projQ.order('game_date', { ascending: true }).order('confidence_score', { ascending: false }),
    selQ.order('game_date', { ascending: true }).order('display_order', { ascending: true }),
    lineQ.order('edge_pct', { ascending: false }),
    windowDays > 0
      ? supabase.from('picks_games').select('game_date, week')
          .eq('brand_id', BRAND.slug).eq('league', sport)
          .gte('game_date', today).lte('game_date', upper)
      : Promise.resolve({ data: [] as { game_date: string; week: number | null }[] }),
    supabase.from('briefings')
      .select('id, brand_id, league, edition_type, slug, title, subtitle, body_md, summary, published_at, status, game_date_start, game_date_end, generated_at, edited_at')
      .eq('brand_id', BRAND.slug).eq('league', sport)
      .order('generated_at', { ascending: false }).limit(100),
    supabase.from('briefings')
      .select('id, brand_id, league, edition_type, slug, title, subtitle, body_md, summary, published_at, status, game_date_start, game_date_end, generated_at, edited_at')
      .eq('brand_id', BRAND.slug).eq('league', sport).eq('status', 'published')
      .order('published_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const projections = projectionsRes.data || []
  return {
    projections,
    selections: selectionsRes.data || [],
    lines:      linesRes.data      || [],
    briefings:  (briefingsRes.data || []) as Briefing[],
    latestBriefing: (latestBriefingRes.data || null) as Briefing | null,
    slate:      describeSlate(windowDays, projections, gamesRes.data || []),
  }
}

export default async function DashboardPage() {
  // Was login-only: ANY signed-in member, including a free-tier account,
  // could read the operator command centre — the full unpublished slate,
  // every projection and line before it is released to paying tiers.
  const { userId, tier } = await sessionTier()
  if (!userId) redirect('/sign-in')
  if (!canAccess(tier, OPERATOR_TIER)) redirect('/tools')

  const sport = await getSport()
  const { projections, selections, lines, slate, briefings, latestBriefing } = await getDashboardData(sport)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // The headline line for each player, i.e. the one the EDGE column reports.
  //
  // This used to be a `${player}_pts` lookup. NBA has a canonical headline
  // stat, so that worked there — and can never match under NFL, where no
  // 'pts' line exists and the column would read '—' for every row.
  //
  // NBA keeps the pts line, so nothing an operator is used to changes. NFL has
  // no single headline stat (a WR's is rec_yds, a RB's rush_yds), so it shows
  // the strongest edge available for that player, which is the one worth
  // acting on.
  const headline = new Map<string, typeof lines[number]>()
  for (const l of lines) {
    if (sport === 'NBA') {
      if (l.stat_type === 'pts') headline.set(l.player_name, l)
      continue
    }
    const held = headline.get(l.player_name)
    const better = held == null
      || Math.abs(l.edge_pct ?? 0) > Math.abs(held.edge_pct ?? 0)
    if (better) headline.set(l.player_name, l)
  }

  const cols = PROJECTION_COLUMNS[sport]

  // Enrich each projection with the headline line's edge + stat so the client
  // panel can filter/sort on them (the projection row itself carries neither).
  const projRows: ProjRow[] = projections.map(p => {
    const h = headline.get(p.player_name)
    return { ...p, _edgePct: h?.edge_pct ?? null, _headlineStat: h?.stat_type ?? null }
  })

  const pendingCount   = selections.filter(s => s.status === 'pending').length
  const confirmedCount = selections.filter(s => s.status === 'confirmed').length

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
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '10px' }}>
                // OPERATOR COMMAND CENTER
              </div>
              <h1 style={{
                fontFamily: F.sans, fontSize: 'clamp(18px,2.2vw,26px)', fontWeight: 500,
                color: C.platinum, margin: '0 0 6px', lineHeight: 1, letterSpacing: '-0.03em',
              }}>
                {slate.kind === 'window' ? slate.label : today.toUpperCase()}
              </h1>
              <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
                {slate.kind === 'window'
                  ? `${slate.range ? `${slate.range} · ` : ''}${sport} operator-run weekly slate`
                  : '> dashboard --operator=true --live=true'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: F.mono, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 500, color: C.platinum, lineHeight: 1 }}>
                  {projections.length}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, marginTop: '4px', letterSpacing: '0.08em' }}>PROJECTIONS</div>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: F.mono, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 500, color: confirmedCount > 0 ? C.signalCyan : C.muted, lineHeight: 1 }}>
                  {confirmedCount}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '10px', color: C.dim, marginTop: '4px', letterSpacing: '0.08em' }}>READY TO TRANSMIT</div>
              </div>
              {confirmedCount > 0 && (
                <a href="/dashboard/publish" style={{
                  display: 'inline-block', background: C.signalCyan, color: C.void,
                  padding: '12px 24px', fontFamily: F.mono, fontWeight: 500,
                  fontSize: '13px', letterSpacing: '0.12em',
                }}>
                  TRANSMIT {confirmedCount} SIGNAL{confirmedCount !== 1 ? 'S' : ''} →
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(24px,2.5vw,36px) clamp(24px,4vw,48px)' }}>

          <AgentPipeline agents={AGENTS_BY_SPORT[sport]} sport={sport} />

          {latestBriefing && (
            <a href={`/insights/${latestBriefing.slug}`} style={{ display: 'block', background: C.panel, border: `1px solid ${C.borderEmphasis}`, color: 'inherit', marginBottom: '24px', padding: '16px 20px', textDecoration: 'none' }}>
              <div style={{ alignItems: 'center', display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: C.signalCyan, fontFamily: F.mono, fontSize: '10px', letterSpacing: '0.12em', marginBottom: '6px' }}>// LATEST BRIEFING · {editionLabel(latestBriefing.edition_type)}</div>
                  <div style={{ color: C.platinum, fontFamily: F.sans, fontSize: '17px', fontWeight: 500 }}>{latestBriefing.title}</div>
                  <div style={{ color: C.dim, fontFamily: F.mono, fontSize: '10px', marginTop: '5px' }}>{formatBriefingRange(latestBriefing.game_date_start, latestBriefing.game_date_end)}</div>
                </div>
                <span style={{ color: C.signalCyan, fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.08em' }}>READ INSIGHT →</span>
              </div>
            </a>
          )}

          <div className="dashboard-layout">

            {/* Projections table */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{
                padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em' }}>
                  // {slate.kind === 'window' ? `${slate.label} PROJECTIONS` : `TODAY'S PROJECTIONS`}
                </div>
              </div>

              {projections.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
                  {slate.kind === 'window' ? (
                    <>No projections for the upcoming {sport} slate yet.<br />
                    Run the pipeline above to begin.</>
                  ) : (
                    <>No projections yet today.<br />
                    Run the Scout agent at 6 AM to begin the pipeline.</>
                  )}
                </div>
              ) : (
                <div style={{ padding: '14px 20px' }}>
                  <ProjectionsPanel rows={projRows} cols={cols} sport={sport} />
                </div>
              )}
            </div>

            {/* Signal queue */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '4px' }}>
                  // SIGNAL QUEUE
                </div>
                <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.dim, letterSpacing: '0.06em' }}>
                  {pendingCount} PENDING · {confirmedCount} CONFIRMED
                </div>
              </div>

              {selections.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
                  No signals queued yet.<br />
                  Add signals from the projections table.
                </div>
              ) : (
                <SignalQueuePanel rows={selections as Selection[]} sport={sport} />
              )}

              {confirmedCount > 0 && (
                <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
                  <a href="/dashboard/publish" style={{
                    display: 'block', textAlign: 'center',
                    background: C.signalCyan, color: C.void,
                    padding: '12px', fontFamily: F.mono, fontWeight: 500,
                    fontSize: '13px', letterSpacing: '0.12em',
                  }}>
                    TRANSMIT {confirmedCount} SIGNAL{confirmedCount !== 1 ? 'S' : ''} →
                  </a>
                </div>
              )}
            </div>
          </div>
          <BriefingsPanel rows={briefings} sport={sport} />
        </div>
      </div>
    </div>
  )
}
