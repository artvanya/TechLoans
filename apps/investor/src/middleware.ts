// apps/investor/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// AUTH DISABLED — uncomment the block below and remove the bypass line to re-enable
export default function middleware(_req: NextRequest) {
  return NextResponse.next()
}

/* AUTH ENABLED — restore this when ready:
import { auth } from '@/lib/auth'

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/api/auth']
const KYC_REQUIRED_ROUTES = ['/portfolio', '/deals', '/wallet', '/auto-invest', '/credit-line']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (session && pathname.startsWith('/login')) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER']
  if (adminRoles.includes(session.user.role)) {
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001', req.url))
  }
  const kycApproved = session.user.kycStatus === 'APPROVED'
  if (!kycApproved && KYC_REQUIRED_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }
  return NextResponse.next()
})
*/

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)', '/api/:path*'],
}
