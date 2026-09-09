import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { operatorFetch, type OperatorMe } from './client'

/**
 * Route guard for the command center.
 *
 *   no session            -> /sign-in
 *   session, not operator -> 404, NOT a "forbidden" page
 *
 * The 404 is deliberate. A 403 tells a subscriber that /command exists and that
 * some accounts can reach it, which is an invitation. A 404 tells them the URL
 * is wrong. The backend still answers 403 to the API call — that distinction is
 * useful to an operator debugging their own access and useless to anyone else,
 * because they never see it.
 */
export async function requireOperatorPage(): Promise<OperatorMe> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const me = await operatorFetch<OperatorMe>('/operator/me')
  if (!me.ok || !me.data) notFound()
  return me.data
}
