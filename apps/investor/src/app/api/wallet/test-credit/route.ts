// apps/investor/src/app/api/wallet/test-credit/route.ts
// Dummy top-up for local / sandbox testing only.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'

const bodySchema = z.object({
  amount: z.number().positive().max(50_000_000).optional(),
})

function testCreditAllowed(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.ENABLE_TEST_WALLET_TOPUP === 'true'
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!testCreditAllowed()) {
    return NextResponse.json({ success: false, error: { message: 'Test credit is disabled' } }, { status: 403 })
  }

  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 })
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { message: 'Invalid amount' } }, { status: 422 })
  }

  const amount = parsed.data.amount ?? 50_000

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    include: { wallets: true },
  })
  if (!profile) {
    return NextResponse.json({ success: false, error: { message: 'Profile not found' } }, { status: 404 })
  }

  let wallet = profile.wallets.find((w) => w.currency === 'GBP')
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { investorProfileId: profile.id, currency: 'GBP', balance: 0 },
    })
  }

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        walletId: wallet.id,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount,
        currency: 'GBP',
        description: 'Test credit (sandbox — not a real deposit)',
        processedAt: new Date(),
      },
    }),
  ])

  const updated = await prisma.wallet.findUnique({ where: { id: wallet.id } })

  return NextResponse.json({
    success: true,
    data: { balance: Number(updated!.balance) },
  })
}
