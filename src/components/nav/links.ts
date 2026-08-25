/**
 * The single definition of the primary nav links.
 *
 * This array was copy-pasted into TWELVE page files — ten as `const NAV`
 * (byte-identical) and two as `const navLinks` on the marketing surfaces.
 * Adding a destination meant twelve edits, and any missed file silently kept
 * the old menu.
 */
export const NAV_LINKS: readonly (readonly [label: string, href: string])[] = [
  ['SIGNALS', '/picks'],
  ['ENGINE', '/tools'],
  ['PIPELINE', '/dashboard'],
  ['TIERS', '/join'],
] as const

/**
 * Routes that keep their own bespoke header: the marketing landing and the
 * tier/checkout page carry a wordmark, a LIVE indicator and a CTA that the
 * in-app bar has no business rendering. SiteNav yields on these rather than
 * double-stacking a second fixed bar on top of theirs — they still import
 * NAV_LINKS above, so the LINKS have one definition even where the CHROME
 * legitimately differs.
 */
export const BESPOKE_NAV_ROUTES = ['/', '/join'] as const
