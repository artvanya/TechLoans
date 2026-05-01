// apps/investor/src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexus/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(60).trim(),
  lastName:  z.string().min(1, 'Last name is required').max(60).trim(),
  email:     z.string().email('Invalid email address').toLowerCase(),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check your details',
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    )
  }

  const { firstName, lastName, email, password } = parsed.data

  // Check for existing user — same response to avoid email enumeration
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ success: true })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        hashedPassword,
        role: 'INVESTOR',
        emailVerified: new Date(), // no email confirmation step
      },
    })

    await tx.investorProfile.create({
      data: { userId: newUser.id, firstName, lastName },
    })

    await tx.wallet.create({
      data: {
        investorProfile: { connect: { userId: newUser.id } },
        currency: 'GBP',
        balance: 0,
      },
    })
  })

  return NextResponse.json({ success: true })
}
