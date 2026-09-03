import Link from 'next/link'
import { BRAND } from '@/config/brand'
import { createServiceClient } from '@/lib/supabase/service'
import { getSport } from '@/lib/sport/server'
import { editionLabel, formatBriefingRange, type Briefing } from '@/lib/briefings'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts
const PAGE_SIZE = 20

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const sport = await getSport()
  const supabase = createServiceClient()
  const { data, count } = await supabase
    .from('briefings')
    .select('id, league, edition_type, slug, title, subtitle, summary, published_at, status, game_date_start, game_date_end, generated_at', { count: 'exact' })
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const briefings = (data ?? []) as Briefing[]
  const total = count ?? 0
  const hasNext = page * PAGE_SIZE < total

  return (
    <main style={{ minHeight: '100vh', background: C.void, padding: '92px clamp(24px, 4vw, 48px) 48px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: '20px', marginBottom: '22px' }}>
          <div style={{ fontFamily: F.mono, fontSize: '11px', color: C.signalCyan, letterSpacing: '0.12em', marginBottom: '9px' }}>
            // {sport} INSIGHTS
          </div>
          <h1 style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 'clamp(24px, 3vw, 34px)', color: C.platinum, letterSpacing: '-0.03em', margin: 0 }}>
            ENGINE BRIEFINGS
          </h1>
          <p style={{ fontFamily: F.mono, fontSize: '12px', color: C.muted, lineHeight: 1.7, margin: '10px 0 0' }}>
            Published platform reads, sourced from the current {sport} data set.
          </p>
        </div>

        {briefings.length === 0 ? (
          <div style={{ border: `1px solid ${C.border}`, background: C.panel, padding: '46px 24px', textAlign: 'center', fontFamily: F.mono, color: C.muted, fontSize: '12px', lineHeight: 1.7 }}>
            No published {sport} briefings are available yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {briefings.map(briefing => (
              <Link key={briefing.id} href={`/insights/${briefing.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '20px', transition: 'border-color 150ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ color: C.signalCyan, border: `1px solid ${C.borderEmphasis}`, padding: '3px 7px', fontFamily: F.mono, fontSize: '9px', letterSpacing: '0.1em' }}>
                      {editionLabel(briefing.edition_type)}
                    </span>
                    <span style={{ color: C.dim, fontFamily: F.mono, fontSize: '10px', letterSpacing: '0.06em' }}>
                      {formatBriefingRange(briefing.game_date_start, briefing.game_date_end)}
                    </span>
                  </div>
                  <h2 style={{ color: C.platinum, fontFamily: F.sans, fontSize: '20px', fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
                    {briefing.title}
                  </h2>
                  {briefing.subtitle && <p style={{ color: C.muted, fontFamily: F.mono, fontSize: '11px', lineHeight: 1.6, margin: '7px 0 0' }}>{briefing.subtitle}</p>}
                  {briefing.summary && <p style={{ color: C.platinum, fontFamily: F.sans, fontSize: '14px', lineHeight: 1.65, margin: '13px 0 0' }}>{briefing.summary}</p>}
                </article>
              </Link>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <nav aria-label="Briefing pages" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '22px', fontFamily: F.mono, fontSize: '11px' }}>
            {page > 1 ? <Link href={`/insights?page=${page - 1}`} style={{ color: C.signalCyan }}>← NEWER</Link> : <span />}
            <span style={{ color: C.dim }}>PAGE {page} OF {Math.ceil(total / PAGE_SIZE)}</span>
            {hasNext ? <Link href={`/insights?page=${page + 1}`} style={{ color: C.signalCyan }}>OLDER →</Link> : <span />}
          </nav>
        )}
      </div>
    </main>
  )
}
