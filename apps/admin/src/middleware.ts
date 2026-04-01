// apps/admin/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// AUTH DISABLED — uncomment the block below and remove the bypass line to re-enable
export default function middleware(_req: NextRequest) {
  return NextResponse.next()
}

/* AUTH ENABLED — restore this when ready:
import { auth } from '@/lib/auth'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER']
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/deals/create': ['deal:create'],
  '/deals/publish': ['deal:publish'],
  '/investors': ['investor:read'],
  '/investors/restrict': ['investor:restrict'],
  '/kyc': ['kyc:review'],
  '/payouts': ['payout:approve'],
  '/withdrawals': ['withdrawal:approve'],
  '/audit': ['audit:read'],
  '/settings': ['settings:write'],
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (pathname.startsWith('/api/auth') || pathname.startsWith('/login')) {
    if (session) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  const role = (session.user as any).role
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_INVESTOR_URL ?? 'http://localhost:3000', req.url))
  }
  const permissions: string[] = (session.user as any).permissions ?? []
  for (const [route, required] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      if (role === 'SUPER_ADMIN') break
      const hasPermission = required.every((p) => permissions.includes(p))
      if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions', required }, { status: 403 })
    }
  }
  return NextResponse.next()
})
*/

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)', '/api/:path*'],
}
