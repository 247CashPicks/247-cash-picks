'use client'

import { usePathname } from 'next/navigation'
import { BRAND } from '@/config/brand'
import type { Sport } from '@/lib/sport'
import { BESPOKE_NAV_ROUTES, NAV_LINKS } from './links'
import SportSwitcher from './SportSwitcher'

const C = BRAND.colors
const F = BRAND.fonts

/**
 * The one nav bar, mounted once in layout.tsx.
 *
 * Replaces ten byte-identical inline copies. Mounted at the layout rather than
 * per-page or per-dashboard because sport has to reach picks, tools, tracker,
 * portal and dashboard alike: a dashboard-level toggle is the wrong scope, and
 * a per-tool selector would fragment the state across every page.
 *
 * Client, not server, for two reasons — usePathname drives both the active
 * link and the bespoke-route yield, and the switcher needs an event handler.
 * The sport itself is read on the SERVER (layout calls getSport()) and passed
 * down, so first paint already shows the right league with no flicker.
 */
export default function SiteNav({ sport }: { sport: Sport }) {
  const pathname = usePathname()

  if ((BESPOKE_NAV_ROUTES as readonly string[]).includes(pathname)) return null

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '56px', background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(24px,4vw,48px)', gap: '32px',
      }}
    >
      <a
        href="/"
        style={{
          fontFamily: F.mono, fontSize: '13px', fontWeight: 500,
          color: C.signalCyan, letterSpacing: '0.05em', marginRight: 'auto',
          textDecoration: 'none',
        }}
      >
        {BRAND.name}
      </a>

      {NAV_LINKS.map(([label, href]) => {
        // '/' would prefix-match everything, but it is a bespoke route and
        // never reaches this loop.
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              fontFamily: F.mono, fontSize: '11px', letterSpacing: '0.1em',
              color: active ? C.signalCyan : C.dim, textDecoration: 'none',
            }}
          >
            {label}
          </a>
        )
      })}

      <SportSwitcher sport={sport} />
    </nav>
  )
}
