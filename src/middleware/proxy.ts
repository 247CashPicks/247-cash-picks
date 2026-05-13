import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/tracker',
  '/join(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/tools/projection-runner',
  '/tools/matchup-builder',
  '/tools/lineup-adjuster',
  '/tools/backtester',
  '/api/stripe/webhook',
  '/api/picks',
])

const isOperatorRoute = createRouteMatcher([
  '/dashboard(.*)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims } = await auth()

  // Public routes — allow through
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Unauthenticated on protected route → redirect to join
  if (!userId) {
    const joinUrl = new URL('/join', req.url)
    joinUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(joinUrl)
  }

  // Operator routes — check role
  if (isOperatorRoute(req)) {
    const role = (sessionClaims?.metadata as { role?: string })?.role
    if (role !== 'operator') {
      return NextResponse.redirect(new URL('/picks', req.url))
    }
  }

  return NextResponse.next()
})

