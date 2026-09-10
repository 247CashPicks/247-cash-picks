#!/usr/bin/env node
/**
 * Copy guard — fails the build if wagering language reaches user-facing copy.
 *
 * Same shape as the briefing writer's _assert_safe_body check on the backend:
 * a deny set, an explicit allowlist for the legitimate cases, and a hard failure
 * that names every violation rather than warning and continuing.
 *
 * This brand was previously flagged as a gambling site. It is a sports analytics
 * service: it publishes projections and the gap between those projections and
 * published market numbers. It does not take or recommend wagers, and the copy
 * must not read as though it does.
 *
 * SCOPE: pages, components and brand config — the surfaces a reader or a
 * classifier actually sees. Backend integrations and DB column names are out of
 * scope by design; ingesting a market line is the analysis, not promotion.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src/app', 'src/components', 'src/config']
const SCAN_EXT = /\.(tsx|ts)$/

// ── Bucket B: wagering verbs and nouns ───────────────────────────────────
const BUCKET_B = [
  'bet', 'bets', 'betting', 'bettor', 'bettors', 'wager', 'wagers', 'wagering',
  'gamble', 'gambling', 'gambler', 'odds', 'parlay', 'parlays', 'sportsbook',
  'sportsbooks', 'bookie', 'juice', 'vig', 'vigorish', 'bankroll', 'handicap',
  'handicapper', 'payout', 'payouts', 'cashout', 'moneyline', 'teaser',
  'prizepicks', 'underdog', 'draftkings', 'fanduel', 'betmgm',
]
// ── Bucket C: directive / recommendation phrasing ────────────────────────
const BUCKET_C = [
  'take the over', 'take the under', 'play the over', 'play the under',
  'bet on', 'back him', 'back her', 'back them', 'ride the', 'smash the',
  'lock of the', 'free money', 'hammer the', 'fade the', 'tail the',
  'beat the line', 'beat the book',
]
// ── Bucket D: outcome promises (unambiguous phrases only) ────────────────
const BUCKET_D = [
  'guaranteed profit', 'guaranteed win', 'guaranteed winner', "can't lose",
  'cant lose', 'sure thing', 'risk free', 'risk-free', 'never lose',
]
// Cross-league timing promises. NFL is week-shaped; these phrases silently
// reintroduce the NBA same-day assumption onto the shared signal surface.
const BUCKET_E = [
  'published by 3:30 pm et', 'daily signals', 'daily output slate',
  'fetch_signals --date=today',
]

/**
 * Allowlist — legitimate uses confirmed in the Task-1 inventory. Each entry
 * documents WHY the match is not promotional copy. A line matching any of these
 * is exempt.
 */
const ALLOWLIST = [
  // Source-code comment recording where the NFL stat vocabulary comes from, so
  // the frontend map stays in step with the backend. A comment, never shipped.
  { re: /agents\/picks_lines\.py/, why: 'dev comment citing backend module' },
]

const violations = []
function walk(dir) {
  let entries
  try { entries = readdirSync(dir) } catch { return }
  for (const e of entries) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (SCAN_EXT.test(p)) scan(p)
  }
}

function scan(file) {
  const rel = relative(ROOT, file)
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (ALLOWLIST.some(a => a.re.test(line))) return
    const lower = line.toLowerCase()
    for (const term of BUCKET_B) {
      if (new RegExp(`\\b${term}\\b`, 'i').test(line)) {
        violations.push({ rel, n: i + 1, term, bucket: 'B', line: line.trim() })
      }
    }
    for (const phrase of [...BUCKET_C, ...BUCKET_D, ...BUCKET_E]) {
      if (lower.includes(phrase)) {
        const bucket = BUCKET_C.includes(phrase) ? 'C'
          : BUCKET_D.includes(phrase) ? 'D' : 'E'
        violations.push({ rel, n: i + 1, term: phrase, bucket, line: line.trim() })
      }
    }
  })
}

for (const d of SCAN_DIRS) walk(join(ROOT, d))

if (violations.length) {
  console.error('\n✗ COPY GUARD FAILED — wagering language in user-facing copy\n')
  for (const v of violations) {
    console.error(`  [${v.bucket}] ${v.rel}:${v.n}  "${v.term}"`)
    console.error(`      ${v.line.slice(0, 120)}`)
  }
  console.error(`\n  ${violations.length} violation(s). This platform publishes projections, not wagers.`)
  console.error('  Rephrase, or add a documented ALLOWLIST entry in scripts/check-copy.mjs.\n')
  process.exit(1)
}
console.log('✓ copy guard: no wagering language in user-facing copy')
