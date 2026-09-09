#!/usr/bin/env node
/**
 * Contrast guard — recomputes every documented pair and fails if one drops.
 *
 * docs/design_system.md states ratios. A stated ratio that nobody recomputes is
 * a number that stops being true the first time a token is nudged, and dark UI
 * is exactly where a small nudge crosses the line unnoticed.
 *
 * --blue-dim is declared NON-TEXT: it clears 3:1 (large/non-text) and not
 * 4.5:1, which is why it is listed separately rather than exempted quietly.
 */
const TOKENS = {
  'navy-base': '#0B1220', 'navy-raised': '#111C2E',
  'steel': '#8695A8', 'steel-bright': '#C3CEDB',
  'blue': '#2F9BF0', 'blue-dim': '#1B6FB0',
  'lime': '#8FD14F', 'amber': '#E8A33D', 'alert': '#E2564D',
}
const TEXT_ON = ['steel-bright', 'steel', 'blue', 'lime', 'amber', 'alert']
const NON_TEXT = ['blue-dim']
const GROUNDS = ['navy-base', 'navy-raised']

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = (hex) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
const ratio = (a, b) => {
  const [la, lb] = [lum(a), lum(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const failures = []
for (const ground of GROUNDS) {
  for (const fg of TEXT_ON) {
    const r = ratio(TOKENS[fg], TOKENS[ground])
    if (r < 4.5) failures.push(`--${fg} on --${ground}: ${r.toFixed(2)} < 4.5 (AA body)`)
  }
  for (const fg of NON_TEXT) {
    const r = ratio(TOKENS[fg], TOKENS[ground])
    if (r < 3) failures.push(`--${fg} on --${ground}: ${r.toFixed(2)} < 3.0 (AA non-text)`)
  }
}

if (failures.length) {
  console.error('Contrast guard FAILED:')
  for (const f of failures) console.error('  ' + f)
  process.exit(1)
}
console.log(`Contrast guard passed: ${TEXT_ON.length * GROUNDS.length} text pairs, ${NON_TEXT.length * GROUNDS.length} non-text.`)
