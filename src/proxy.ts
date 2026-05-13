export { default as proxy } from './middleware/proxy'

// config must be defined statically here — Turbopack cannot parse re-exported config objects
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
