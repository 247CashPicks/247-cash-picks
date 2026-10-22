import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  PRIZEPICKS_REFERENCE_LABEL,
  ReferenceOnlyLabel,
  marketSourcePolicy,
} from '@/lib/market-source-policy'


describe('owner wagering-source policy', () => {
  it('classifies PrizePicks as reference-only with no execution path', () => {
    const policy = marketSourcePolicy('Prize Picks')
    expect(policy.classification).toBe('reference_only')
    expect(policy.label).toBe(PRIZEPICKS_REFERENCE_LABEL)
    expect(policy.executionEligible).toBe(false)
    expect(policy.placementInstructionsAllowed).toBe(false)
    expect(policy.deepLink).toBeNull()
  })

  it.each(['Kalshi', 'Polymarket', 'Underdog'])(
    'classifies %s as approved subject to controls', source => {
      const policy = marketSourcePolicy(source)
      expect(policy.classification).toBe('approved_subject_to_controls')
      expect(policy.executionEligible).toBe(true)
      expect(policy.placementInstructionsAllowed).toBe(false)
      expect(policy.deepLink).toBeNull()
    })

  it('fails an unlisted source closed', () => {
    const policy = marketSourcePolicy('other-book')
    expect(policy.classification).toBe('unapproved')
    expect(policy.executionEligible).toBe(false)
    expect(policy.deepLink).toBeNull()
  })

  it('renders the exact PrizePicks warning and no link', () => {
    const { container } = render(<ReferenceOnlyLabel source="prizepicks" />)
    expect(screen.getByText(PRIZEPICKS_REFERENCE_LABEL)).toBeTruthy()
    expect(container.querySelector('a')).toBeNull()
  })

  it('does not label an approved destination as reference-only', () => {
    const { container } = render(<ReferenceOnlyLabel source="underdog" />)
    expect(container.textContent).toBe('')
  })
})
