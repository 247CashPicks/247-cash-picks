import { cookies } from 'next/headers'
import { parseSport, SPORT_COOKIE, type Sport } from './index'

/**
 * The active sport for a server component.
 *
 * Reading cookies() opts the caller into dynamic rendering. Every page that
 * needs this is already force-dynamic (it reads live slate data), so nothing
 * loses static generation that had it.
 */
export async function getSport(): Promise<Sport> {
  const store = await cookies()
  return parseSport(store.get(SPORT_COOKIE)?.value)
}
