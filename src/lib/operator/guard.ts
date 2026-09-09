import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { operatorFetch, type OperatorMe } from './client'

/**
 * Route guard for the command center.
 *
 *   no session               -> /sign-in
 *   session, not an operator -> 404, NOT a "forbidden" page
 *   anything else            -> throw, so it renders as an error
 *
 * The 404 for a non-operator is deliberate. A 403 tells a subscriber that
 * /command exists and that some accounts can reach it, which is an invitation.
 * A 404 tells them the URL is wrong. The backend still answers 403 to the API
 * call — useful to an operator debugging their own access, invisible to
 * everyone else.
 *
 * WHY THE THIRD CASE EXISTS
 *
 * This used to read `if (!me.ok || !me.data) notFound()`, which collapsed 401,
 * 500, 503, 504, an unset BACKEND_URL and any network failure into the same
 * 404 as "you are not an operator". On 2026-09-09 that hid a real outage:
 * CLERK_ISSUER on the backend held the literal string
 * `CLERK_ISSUER=https://clerk.theanalyticscommunity.com` — the key name pasted
 * into the value — so the JWKS URL was unparseable and every operator token
 * came back 401. The owner, with a valid session and an active owner row, saw
 * the app's own 404 and nothing else. Every Vercel log line for those requests
 * carried an empty `logs` array, because nothing recorded the reason.
 *
 * Only 403 means "not an operator". Everything else is a fault, and a fault
 * has to look like one.
 */
export async function requireOperatorPage(): Promise<OperatorMe> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const me = await operatorFetch<OperatorMe>('/operator/me')

  if (me.ok && me.data) return me.data

  // The only status meaning "a real user who is not on the list".
  if (me.status === 403) notFound()

  // Anything else is broken, not forbidden. Logged before throwing, because
  // the rendered error page shows the operator nothing actionable and the
  // server log is where the cause has to survive.
  console.error(
    `[command] /operator/me failed: status=${me.status} `
    + `error=${me.error ?? 'none'}`,
  )
  throw new Error(
    'The command center could not verify your operator identity: '
    + `${me.error ?? `the backend returned ${me.status}`}. `
    + 'This is a fault, not a permission change.',
  )
}
