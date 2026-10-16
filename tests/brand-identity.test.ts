import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BRAND } from '@/config/brand'

describe('247 Sports Intel identity', () => {
  it('keeps the stable internal tenant while exposing the approved brand', () => {
    expect(BRAND.slug).toBe('datanexus')
    expect(BRAND.name).toBe('247 Sports Intel')
    expect(BRAND.domain).toBe('247sportsintel.com')
    expect(BRAND.supportEmail).toBe('support@247sportsintel.com')
  })

  it('does not render the retired Analytics Community name in the app shell', () => {
    const shell = [
      'src/config/brand.ts',
      'src/app/page.tsx',
      'src/app/join/page.tsx',
      'src/app/layout.tsx',
      'src/components/nav/SiteNav.tsx',
    ].map((path) => readFileSync(path, 'utf8')).join('\n')

    expect(shell).not.toContain('The Analytics Community')
    expect(shell).not.toContain('THE_ANALYTICS')
    expect(shell).not.toContain('ANALYTICS_COMMUNITY')
  })
})
