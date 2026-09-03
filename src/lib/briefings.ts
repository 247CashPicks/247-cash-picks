/** Public and operator-facing shape of sql/014's briefing rows. */
export type BriefingEditionType = 'daily' | 'weekly' | 'alert'
export type BriefingStatus = 'published' | 'unpublished' | 'draft'

export interface Briefing {
  id: string
  brand_id: string
  league: string
  edition_type: BriefingEditionType
  slug: string
  title: string
  subtitle: string | null
  body_md: string
  summary: string | null
  published_at: string | null
  status: BriefingStatus
  game_date_start: string | null
  game_date_end: string | null
  generated_at: string | null
  edited_at: string | null
}

export interface BriefingSource {
  id?: string
  briefing_id: string
  source_name: string | null
  source_url: string
  headline: string
  published_at: string | null
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
})
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC',
})

export function formatBriefingRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Slate dates pending'
  const format = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00Z`))
  if (!end || start === end) return format(start ?? end!)
  return `${format(start!)} – ${format(end)}`
}

export function formatBriefingTimestamp(value: string | null): string {
  return value ? timeFormatter.format(new Date(value)) : 'Not recorded'
}

export function editionLabel(type: BriefingEditionType): string {
  return type.toUpperCase()
}
