export const PRIZEPICKS_REFERENCE_LABEL = 'REFERENCE ONLY — DO NOT PLACE'
export const MARKET_SOURCE_POLICY_VERSION = 'owner-market-source-policy-v1'

export type SourceClassification =
  | 'reference_only'
  | 'approved_subject_to_controls'
  | 'unapproved'

const eligibleDestinations = new Set(['kalshi', 'polymarket', 'underdog'])

function sourceKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replaceAll(' ', '')
}

export function marketSourcePolicy(value: unknown) {
  const source = sourceKey(value)
  if (source === 'prizepicks') {
    return {
      source,
      classification: 'reference_only' as SourceClassification,
      label: PRIZEPICKS_REFERENCE_LABEL,
      executionEligible: false,
      placementInstructionsAllowed: false,
      deepLink: null,
      policyVersion: MARKET_SOURCE_POLICY_VERSION,
    }
  }
  if (eligibleDestinations.has(source)) {
    return {
      source,
      classification: 'approved_subject_to_controls' as SourceClassification,
      label: 'APPROVED DESTINATION — CONTROLS REQUIRED',
      executionEligible: true,
      placementInstructionsAllowed: false,
      deepLink: null,
      policyVersion: MARKET_SOURCE_POLICY_VERSION,
    }
  }
  return {
    source,
    classification: 'unapproved' as SourceClassification,
    label: 'UNAPPROVED DESTINATION',
    executionEligible: false,
    placementInstructionsAllowed: false,
    deepLink: null,
    policyVersion: MARKET_SOURCE_POLICY_VERSION,
  }
}

export function ReferenceOnlyLabel({ source }: { source: unknown }) {
  const policy = marketSourcePolicy(source)
  if (policy.classification !== 'reference_only') return null
  return <span aria-label={`PrizePicks ${PRIZEPICKS_REFERENCE_LABEL}`}
    style={{ display: 'inline-flex', marginTop: '4px', padding: '2px 6px',
      border: '1px solid var(--alert)', color: 'var(--alert)',
      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '.04em' }}>
    {PRIZEPICKS_REFERENCE_LABEL}
  </span>
}
