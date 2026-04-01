// apps/investor/src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { writeAuditLog } from '@/lib/audit'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', fields: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  })

  if (!user?.hashedPassword) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_PASSWORD', message: 'Account has no password set' } },
      { status: 400 }
    )
  }

  const currentValid = await bcrypt.compare(currentPassword, user.hashedPassword)
  if (!currentValid) {
    return NextResponse.json(
      { success: false, error: { code: 'WRONG_PASSWORD', message: 'Current password is incorrect' } },
      { status: 400 }
    )
  }

  // Ensure new password is different
  const samePassword = await bcrypt.compare(newPassword, user.hashedPassword)
  if (samePassword) {
    return NextResponse.json(
      { success: false, error: { code: 'SAME_PASSWORD', message: 'New password must be different from your current password' } },
      { status: 400 }
    )
  }

  const newHashed = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword: newHashed },
    }),
    // Invalidate all other sessions (not current one)
    prisma.session.deleteMany({ where: { userId: session.user.id } }),
  ])

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'User',
    entityId: session.user.id,
    metadata: { event: 'password_changed' },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { message: 'Password updated successfully' } })
}
