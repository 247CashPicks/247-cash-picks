'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_SPORT, parseSport, SPORT_COOKIE, type Sport } from './index'

/**
 * The active sport inside a client component.
 *
 * Prefer passing sport down from a server component — that renders correctly
 * on the first paint. This exists for pages that are 'use client' end to end
 * (the tools), where there is no server parent to read the cookie.
 *
 * Deliberately in an effect rather than a useState initializer: reading
 * document during render would make SSR and the client disagree and trip a
 * hydration mismatch. The cost is one frame at the default sport, which for a
 * filter row is invisible; the data itself is resolved server-side from the
 * same cookie, so nothing is ever FETCHED under the wrong league.
 */
export function useSport(): Sport {
  const [sport, setSport] = useState<Sport>(DEFAULT_SPORT)
  useEffect(() => {
    const hit = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${SPORT_COOKIE}=`))
    setSport(parseSport(hit?.split('=')[1]))
  }, [])
  return sport
}
