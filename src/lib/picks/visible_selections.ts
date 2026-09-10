import type { SupabaseClient } from '@supabase/supabase-js'
import { BRAND } from '@/config/brand'
import type { Sport } from '@/lib/sport'
import type { PickPublished } from '@/lib/picks/types'

export interface ScheduledGame {
  game_date: string
  week: number | null
}

function shiftDate(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86_400_000)
    .toISOString().slice(0, 10)
}

/** The league-native signal window. Exported for the regression proof. */
export function leagueWindowDates(
  sport: Sport,
  anchor: string,
  games: ScheduledGame[],
): string[] {
  if (sport === 'NBA') return [anchor]
  const ordered = [...games].filter(g => g.week != null)
    .sort((a, b) => a.game_date.localeCompare(b.game_date))
  const reference = ordered.find(g => g.game_date >= anchor)
    ?? ordered[ordered.length - 1]
  if (!reference) return []
  return [...new Set(ordered
    .filter(g => g.week === reference.week)
    .map(g => g.game_date))].sort()
}

/** One subscriber signal read, with date semantics owned in one place.
 *
 * NFL uses the schedule's current week (including dates before/after today);
 * NBA uses today. picks_published has no status column: membership in that
 * table is itself the published state.
 */
export async function visible_selections(
  supabase: SupabaseClient,
  sport: Sport,
  anchor = new Date().toISOString().slice(0, 10),
): Promise<PickPublished[]> {
  let dates = [anchor]
  if (sport === 'NFL') {
    const { data: games, error: gamesError } = await supabase
      .from('picks_games')
      .select('game_date, week')
      .eq('brand_id', BRAND.slug)
      .eq('league', sport)
      .gte('game_date', shiftDate(anchor, -6))
      .lte('game_date', shiftDate(anchor, 7))
      .order('game_date', { ascending: true })
    if (gamesError) throw new Error(gamesError.message)
    dates = leagueWindowDates(sport, anchor, games ?? [])
  }
  if (dates.length === 0) return []

  const { data, error } = await supabase
    .from('picks_published')
    .select('*')
    .eq('brand_id', BRAND.slug)
    .eq('league', sport)
    .in('game_date', dates)
    .order('game_date', { ascending: true })
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as PickPublished[]
}
