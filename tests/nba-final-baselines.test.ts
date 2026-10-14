import { describe, expect, it } from 'vitest'

import { LEAGUE_DEFAULTS } from '@/lib/picks/model'
import { SPORT_CONFIG } from '@/lib/sport'

describe('completed 2025-26 NBA baselines', () => {
  it('pins the audited final regular-season values', () => {
    expect(SPORT_CONFIG.NBA.baselineSeason).toBe('2025-26')
    expect(LEAGUE_DEFAULTS).toEqual({
      pace: 100.2,
      defRating: 114.7,
      rebsAllowed: 43.8,
      rebsPer36: 6.53,
      astAllowed: 26.7,
      matchupShare: 0.3,
    })
  })
})

