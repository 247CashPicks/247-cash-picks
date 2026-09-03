import { NextRequest, NextResponse } from 'next/server'
import { guardOperatorRoute } from '@/lib/auth/guards'
import { BRAND } from '@/config/brand'
import { parseSport } from '@/lib/sport'
import { createServiceClient } from '@/lib/supabase/service'
import type { BriefingStatus } from '@/lib/briefings'

const PUBLICATION_STATUSES = new Set<BriefingStatus>(['published', 'unpublished'])

/** Operator-only mutation endpoint for auto-published briefing editions. */
export async function PATCH(req: NextRequest) {
  const denied = await guardOperatorRoute()
  if (denied) return denied

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON body required' }, { status: 400 })
  const id = typeof body.id === 'string' ? body.id : ''
  const sport = parseSport(typeof body.sport === 'string' ? body.sport : null)
  const action = typeof body.action === 'string' ? body.action : ''
  if (!id) return NextResponse.json({ error: 'briefing id required' }, { status: 400 })

  const supabase = createServiceClient()
  if (action === 'status') {
    const status = body.status as BriefingStatus
    if (!PUBLICATION_STATUSES.has(status)) {
      return NextResponse.json({ error: 'status must be published or unpublished' }, { status: 400 })
    }
    const updates: { status: BriefingStatus; published_at?: string } = { status }
    if (status === 'published') updates.published_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('briefings')
      .update(updates)
      .eq('id', id)
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .select('id, status')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'Briefing not found' }, { status: 404 })
    return NextResponse.json({ ok: true, briefing: data[0] })
  }

  if (action === 'edit') {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : ''
    const bodyMd = typeof body.body_md === 'string' ? body.body_md : ''
    if (!title || !bodyMd) return NextResponse.json({ error: 'title and body_md are required' }, { status: 400 })
    if (title.length > 240 || subtitle.length > 500 || bodyMd.length > 100_000) {
      return NextResponse.json({ error: 'Briefing field exceeds its allowed length' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('briefings')
      .update({ title, subtitle: subtitle || null, body_md: bodyMd, edited_at: new Date().toISOString() })
      .eq('id', id)
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .select('id, edited_at')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'Briefing not found' }, { status: 404 })
    return NextResponse.json({ ok: true, briefing: data[0] })
  }

  return NextResponse.json({ error: 'Unknown briefing action' }, { status: 400 })
}
