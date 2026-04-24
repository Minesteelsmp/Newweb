/**
 * middleware.ts
 * Route protection + security headers for all requests.
 *
 * Protected routes (require session cookie):
 *   /dashboard/*   user area
 *   /account/*     account settings
 *   /order/*       order form
 *   /admin/*       admin area (full check in layout/route handlers)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_ROUTES  = ['/dashboard', '/order', '/account']
const ADMIN_ROUTES = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('cubiqhost_session')

  // Admin route: require session (full isAdmin check in layout)
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && !session) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Auth-required routes
  if (AUTH_ROUTES.some(r => pathname.startsWith(r)) && !session) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect already-authenticated users away from auth pages
  if (
    session &&
    (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/sign-up'))
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Security headers on all responses
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
