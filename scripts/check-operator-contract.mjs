/**
 * Fail the build when a TypeScript interface declares a field the operator API
 * does not send.
 *
 * WHY
 *
 * TypeScript cannot catch this. It checks that the panels only read fields the
 * interface declares; it has no idea whether the backend sends them. Two
 * mismatches reached the command center that way, and both rendered as a
 * blank rather than an error:
 *
 *   - the run-health panel read last_run / status / triggered_by /
 *     error_summary against a report returning last_attempt_at /
 *     last_attempt_status / last_attempt_triggered_by / last_error.
 *   - AuditEntry declared actor_user_id, which list_audit never selected, so
 *     the Clerk subject could never appear next to an actor's name.
 *
 * WHAT COUNTS AS A FAILURE
 *
 * Declared-but-never-sent fails. A field in the interface that the backend
 * does not return is `undefined` at runtime, and `undefined` renders as
 * nothing — the exact silent failure this exists to stop.
 *
 * Sent-but-not-declared does NOT fail. The API returning more than this page
 * consumes is normal and harmless; forcing the frontend to declare every
 * column would make every backend addition a frontend break.
 *
 * contract.json is generated in the backend repo by
 * scripts/generate_operator_contract.py, which reads the serving code by AST,
 * and is copied here. Both repos gate on the same document.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const CLIENT = join(root, 'src/lib/operator/client.ts')
const CONTRACT = join(root, 'src/lib/operator/contract.json')

/** Top-level field names of each `export interface`, ignoring nested objects. */
function parseInterfaces(source) {
  const interfaces = {}
  const header = /export interface (\w+)\s*\{/g
  let match
  while ((match = header.exec(source)) !== null) {
    const name = match[1]
    let i = match.index + match[0].length
    let depth = 1
    const start = i
    while (depth > 0 && i < source.length) {
      if (source[i] === '{') depth += 1
      else if (source[i] === '}') depth -= 1
      i += 1
    }
    const body = source.slice(start, i - 1)

    // Only depth-0 members. A nested object literal's own keys belong to that
    // nested shape, not to this interface.
    const fields = []
    let nesting = 0
    for (const line of body.split('\n')) {
      const trimmed = line.trim()
      if (nesting === 0) {
        const field = /^([A-Za-z_]\w*)\??\s*:/.exec(trimmed)
        if (field) fields.push(field[1])
      }
      for (const ch of line) {
        if (ch === '{') nesting += 1
        else if (ch === '}') nesting -= 1
      }
    }
    interfaces[name] = fields
  }
  return interfaces
}

const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')).interfaces
const declared = parseInterfaces(readFileSync(CLIENT, 'utf8'))

const problems = []
let checked = 0

for (const [name, backendFields] of Object.entries(contract)) {
  const frontendFields = declared[name]
  if (!frontendFields) continue // not every served shape needs a type here
  checked += 1
  const sent = new Set(backendFields)
  const phantom = frontendFields.filter((f) => !sent.has(f))
  if (phantom.length > 0) {
    problems.push(
      `  ${name} declares ${phantom.map((f) => `\`${f}\``).join(', ')}, ` +
      `which the operator API never sends.\n` +
      `    The API sends: ${backendFields.join(', ')}`,
    )
  }
}

if (checked === 0) {
  console.error(
    'check-operator-contract: no interface in src/lib/operator/client.ts ' +
    'matched a name in contract.json. The check is not testing anything — ' +
    'either the interfaces were renamed or the contract is stale.',
  )
  process.exit(1)
}

if (problems.length > 0) {
  console.error(
    '\nOperator API contract mismatch — these fields would render as blanks:\n',
  )
  console.error(problems.join('\n\n'))
  console.error(
    '\nFix the interface, or add the field to the backend response and ' +
    'regenerate:\n' +
    '  python scripts/generate_operator_contract.py   (datanexus-backend)\n' +
    '  cp docs/operator_api_contract.json ' +
    '../247cashpicks/src/lib/operator/contract.json\n',
  )
  process.exit(1)
}

console.log(`check-operator-contract: ${checked} interfaces match the API.`)
