import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { BRAND } from '@/config/brand'
import { createServiceClient } from '@/lib/supabase/service'
import { getSport } from '@/lib/sport/server'
import { editionLabel, formatBriefingRange, formatBriefingTimestamp, type Briefing, type BriefingSource } from '@/lib/briefings'

export const dynamic = 'force-dynamic'

const C = BRAND.colors
const F = BRAND.fonts

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => <h1 style={{ color: C.platinum, fontFamily: F.sans, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.03em', margin: '30px 0 12px' }}>{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 style={{ color: C.signalCyan, fontFamily: F.mono, fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em', margin: '32px 0 12px' }}>{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 style={{ color: C.platinum, fontFamily: F.mono, fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', margin: '24px 0 10px' }}>{children}</h3>,
  p: ({ children }: { children?: React.ReactNode }) => <p style={{ color: C.platinum, fontFamily: F.mono, fontSize: '13px', lineHeight: 1.85, margin: '0 0 14px' }}>{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul style={{ color: C.platinum, fontFamily: F.mono, fontSize: '13px', lineHeight: 1.8, margin: '0 0 16px', paddingLeft: '21px' }}>{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol style={{ color: C.platinum, fontFamily: F.mono, fontSize: '13px', lineHeight: 1.8, margin: '0 0 16px', paddingLeft: '21px' }}>{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li style={{ marginBottom: '5px' }}>{children}</li>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote style={{ borderLeft: `2px solid ${C.signalCyan}`, color: C.muted, fontFamily: F.mono, margin: '0 0 16px', padding: '4px 0 4px 14px' }}>{children}</blockquote>,
  code: ({ children }: { children?: React.ReactNode }) => <code style={{ background: C.void, border: `1px solid ${C.border}`, color: C.signalCyan, fontFamily: F.mono, fontSize: '12px', padding: '1px 4px' }}>{children}</code>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined} style={{ color: C.signalCyan }}>{children}</a>,
}

export default async function BriefingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sport = await getSport()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('briefings')
    .select('id, brand_id, league, edition_type, slug, title, subtitle, body_md, summary, published_at, status, game_date_start, game_date_end, generated_at, edited_at')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) notFound()
  const briefing = data as Briefing
  const { data: sourceData } = await supabase
    .from('briefing_sources')
    .select('id, briefing_id, source_name, source_url, headline, published_at')
    .eq('briefing_id', briefing.id)
    .order('published_at', { ascending: false })
  const sources = (sourceData ?? []) as BriefingSource[]

  return (
    <main style={{ minHeight: '100vh', background: C.void, padding: '92px clamp(24px, 4vw, 48px) 52px' }}>
      <article style={{ maxWidth: '820px', margin: '0 auto' }}>
        <Link href="/insights" style={{ color: C.signalCyan, fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.08em' }}>← ALL INSIGHTS</Link>
        <header style={{ borderBottom: `1px solid ${C.border}`, padding: '22px 0 20px', marginBottom: '26px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{ color: C.signalCyan, border: `1px solid ${C.borderEmphasis}`, padding: '3px 7px', fontFamily: F.mono, fontSize: '9px', letterSpacing: '0.1em' }}>{editionLabel(briefing.edition_type)}</span>
            <span style={{ color: C.dim, fontFamily: F.mono, fontSize: '10px' }}>{formatBriefingRange(briefing.game_date_start, briefing.game_date_end)}</span>
          </div>
          <h1 style={{ color: C.platinum, fontFamily: F.sans, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1.05, margin: 0 }}>{briefing.title}</h1>
          {briefing.subtitle && <p style={{ color: C.muted, fontFamily: F.mono, fontSize: '12px', lineHeight: 1.7, margin: '12px 0 0' }}>{briefing.subtitle}</p>}
          <div style={{ color: C.faint, fontFamily: F.mono, fontSize: '10px', letterSpacing: '0.06em', marginTop: '15px' }}>GENERATED {formatBriefingTimestamp(briefing.generated_at)}</div>
        </header>

        <div><ReactMarkdown rehypePlugins={[rehypeSanitize]} components={markdownComponents}>{briefing.body_md}</ReactMarkdown></div>

        {sources.length > 0 && (
          <section style={{ borderTop: `1px solid ${C.border}`, marginTop: '32px', paddingTop: '22px' }}>
            <h2 style={{ color: C.signalCyan, fontFamily: F.mono, fontSize: '12px', letterSpacing: '0.12em', margin: '0 0 12px' }}>SOURCES</h2>
            <div style={{ display: 'grid', gap: '9px' }}>
              {sources.map(source => (
                <a key={`${source.briefing_id}-${source.source_url}`} href={source.source_url} target="_blank" rel="noopener noreferrer" style={{ border: `1px solid ${C.border}`, color: C.platinum, fontFamily: F.mono, fontSize: '12px', lineHeight: 1.55, padding: '11px 12px', textDecoration: 'none' }}>
                  {source.headline}<span style={{ color: C.signalCyan }}> ↗</span>
                  <span style={{ color: C.dim, display: 'block', fontSize: '10px', marginTop: '4px', letterSpacing: '0.06em' }}>EXTERNAL · {source.source_name ?? 'SOURCE'}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  )
}
