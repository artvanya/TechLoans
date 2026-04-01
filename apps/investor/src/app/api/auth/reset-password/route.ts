// apps/investor/src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { writeAuditLog } from '@/lib/audit'

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', fields: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { token, password } = parsed.data

  const reset = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'This reset link is invalid or has expired. Please request a new one.' } },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { hashedPassword, isLocked: false, failedLoginCount: 0 },
    }),
    prisma.passwordReset.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
    // Invalidate all sessions
    prisma.session.deleteMany({ where: { userId: reset.userId } }),
  ])

  await writeAuditLog({
    actorId: reset.userId,
    actorEmail: reset.user.email,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: reset.userId,
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { message: 'Password updated. You can now sign in.' } })
}
