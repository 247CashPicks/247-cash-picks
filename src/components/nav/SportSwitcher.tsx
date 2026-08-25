'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { BRAND } from '@/config/brand'
import { SPORTS, SPORT_COOKIE, type Sport } from '@/lib/sport'

const C = BRAND.colors
const F = BRAND.fonts

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * NBA / NFL switch.
 *
 * Writes the sport cookie the server components read, then router.refresh()
 * re-runs them so the whole page re-queries under the new league. No client
 * cache of slate data exists to invalidate — every data surface is a server
 * component — so the refresh IS the state update.
 *
 * The optimistic local state matters: refresh() round-trips to the server, and
 * without it the pressed button stays visually unselected for that whole time
 * and reads as a dropped click.
 */
export default function SportSwitcher({ sport }: { sport: Sport }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState<Sport>(sport)

  function choose(next: Sport) {
    if (next === optimistic) return
    setOptimistic(next)
    // Lax rather than Strict: the cookie must survive a top-level navigation
    // back into the app (e.g. following a link from an email or Stripe).
    document.cookie =
      `${SPORT_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <div
      role="group"
      aria-label="Sport"
      style={{
        display: 'flex',
        border: `1px solid ${C.border}`,
        borderRadius: '3px',
        overflow: 'hidden',
        opacity: pending ? 0.6 : 1,
        transition: 'opacity 120ms ease',
      }}
    >
      {SPORTS.map((s) => {
        const active = s === optimistic
        return (
          <button
            key={s}
            type="button"
            onClick={() => choose(s)}
            aria-pressed={active}
            style={{
              fontFamily: F.mono,
              fontSize: '10px',
              letterSpacing: '0.12em',
              padding: '4px 10px',
              cursor: active ? 'default' : 'pointer',
              border: 'none',
              background: active ? C.signalCyan : 'transparent',
              color: active ? '#000000' : C.dim,
            }}
          >
            {s}
          </button>
        )
      })}
    </div>
  )
}
