// apps/investor/src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexus/db'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=INVALID_TOKEN', req.url))
  }

  const verification = await prisma.emailVerification.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!verification) {
    return NextResponse.redirect(new URL('/login?error=INVALID_TOKEN', req.url))
  }

  if (verification.verifiedAt) {
    return NextResponse.redirect(new URL('/login?info=ALREADY_VERIFIED', req.url))
  }

  if (verification.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/login?error=TOKEN_EXPIRED', req.url))
  }

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { token },
      data: { verifiedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: new Date() },
    }),
  ])

  await writeAuditLog({
    actorId: verification.userId,
    actorEmail: verification.user.email,
    action: 'UPDATE',
    entityType: 'User',
    entityId: verification.userId,
    metadata: { event: 'email_verified' },
  })

  return NextResponse.redirect(
    new URL('/login?success=EMAIL_VERIFIED', req.url)
  )
}
