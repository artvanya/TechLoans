// apps/investor/src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json()
  const parsed = z.object({ email: z.string().email().toLowerCase() }).safeParse(body)

  if (!parsed.success) {
    // Return success regardless — don't reveal if email exists
    return NextResponse.json({ success: true, data: { message: 'If this email is registered, you will receive a reset link.' } })
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    include: { investorProfile: true },
  })

  // Always return success to prevent email enumeration
  if (!user || user.role !== 'INVESTOR') {
    return NextResponse.json({ success: true, data: { message: 'If this email is registered, you will receive a reset link.' } })
  }

  // Invalidate existing tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() }, // mark as used = expired
  })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  })

  try {
    await sendPasswordResetEmail(
      email,
      user.investorProfile?.firstName ?? 'Investor',
      token
    )
  } catch (err) {
    console.error('[Email] Failed to send password reset:', err)
  }

  return NextResponse.json({ success: true, data: { message: 'If this email is registered, you will receive a reset link.' } })
}
