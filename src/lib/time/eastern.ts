export const PLATFORM_TIME_ZONE = 'America/New_York'

/** Calendar date used by NBA/NFL slates. Timestamps remain UTC. */
export function easternToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PLATFORM_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

/** Date-only arithmetic without inheriting the host machine's timezone. */
export function addCalendarDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86_400_000)
    .toISOString().slice(0, 10)
}
