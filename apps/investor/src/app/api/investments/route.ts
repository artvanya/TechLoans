// apps/investor/src/app/api/investments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'
import type { ApiResponse } from '@nexus/shared'

const createInvestmentSchema = z.object({
  dealId: z.string().cuid(),
  amount: z.number().positive().min(1),
  walletCurrency: z.string().default('GBP'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const body = await req.json()
  const parsed = createInvestmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          fields: parsed.error.flatten().fieldErrors as Record<string, string>,
        },
      },
      { status: 422 }
    )
  }

  const { dealId, amount, walletCurrency } = parsed.data

  // Load deal and validate
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      visibleToInvestors: true,
      openForInvestment: true,
      status: { in: ['LIVE', 'FUNDED'] },
    },
  })

  if (!deal) {
    return NextResponse.json(
      { success: false, error: { code: 'DEAL_NOT_AVAILABLE', message: 'This deal is not open for investment' } },
      { status: 400 }
    )
  }

  // Check minimum investment
  if (amount < Number(deal.minimumInvestment)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BELOW_MINIMUM',
          message: `Minimum investment is £${Number(deal.minimumInvestment).toLocaleString()}`,
        },
      },
      { status: 400 }
    )
  }

  // Check remaining capacity
  const remaining = Number(deal.targetRaise) - Number(deal.currentRaised)
  if (amount > remaining) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXCEEDS_REMAINING',
          message: `Only £${remaining.toLocaleString()} remaining in this deal`,
        },
      },
      { status: 400 }
    )
  }

  // Check investor KYC
  const investorProfile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      wallets: { where: { currency: walletCurrency } },
    },
  })

  if (!investorProfile || investorProfile.kycStatus !== 'APPROVED') {
    return NextResponse.json(
      { success: false, error: { code: 'KYC_REQUIRED', message: 'KYC verification must be complete before investing' } },
      { status: 403 }
    )
  }

  // Check single-deal limit
  if (amount > Number(investorProfile.maxSingleDealAmount)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXCEEDS_DEAL_LIMIT',
          message: `Maximum single deal investment is £${Number(investorProfile.maxSingleDealAmount).toLocaleString()} for your account tier`,
        },
      },
      { status: 400 }
    )
  }

  // Check wallet balance
  const wallet = investorProfile.wallets[0]
  if (!wallet || Number(wallet.balance) < amount) {
    return NextResponse.json(
      { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient wallet balance' } },
      { status: 400 }
    )
  }

  // Create investment and debit wallet atomically
  const [investment] = await prisma.$transaction([
    prisma.investment.create({
      data: {
        userId: session.user.id,
        dealId,
        amount,
        status: 'CONFIRMED',
        source: 'manual',
        confirmedAt: new Date(),
      },
    }),
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.deal.update({
      where: { id: dealId },
      data: { currentRaised: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        walletId: wallet.id,
        type: 'INVESTMENT',
        status: 'COMPLETED',
        amount,
        currency: walletCurrency,
        description: `Investment in ${deal.name}`,
        processedAt: new Date(),
      },
    }),
  ])

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'INVESTMENT',
    entityType: 'Investment',
    entityId: investment.id,
    afterState: { dealId, amount, currency: walletCurrency },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  // TODO: Send confirmation notification
  // await sendNotification(session.user.id, 'INVESTMENT_CONFIRMED', { dealId, amount })

  return NextResponse.json<ApiResponse<{ investmentId: string }>>({
    success: true,
    data: { investmentId: investment.id },
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const investments = await prisma.investment.findMany({
    where: { userId: session.user.id },
    include: {
      deal: {
        select: {
          name: true,
          type: true,
          status: true,
          investorApr: true,
          ltv: true,
          chargeType: true,
          maturityDate: true,
        },
      },
      payouts: {
        where: { status: 'COMPLETED' },
        select: { amount: true, type: true },
      },
    },
    orderBy: { confirmedAt: 'desc' },
  })

  const records = investments.map((inv) => {
    const totalEarned = inv.payouts.reduce((sum, p) => sum + Number(p.amount), 0)
    const monthsRemaining = inv.deal.maturityDate
      ? Math.max(0, Math.ceil((inv.deal.maturityDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))
      : 0
    const expectedTotal = Number(inv.amount) * (Number(inv.deal.investorApr) / 100) * (monthsRemaining / 12)

    return {
      id: inv.id,
      dealId: inv.dealId,
      dealName: inv.deal.name,
      dealType: inv.deal.type,
      dealStatus: inv.deal.status,
      amount: Number(inv.amount),
      status: inv.status,
      investorApr: Number(inv.deal.investorApr),
      ltv: Number(inv.deal.ltv),
      chargeType: inv.deal.chargeType,
      maturityDate: inv.deal.maturityDate?.toISOString() ?? null,
      confirmedAt: inv.confirmedAt?.toISOString() ?? null,
      totalEarned,
      expectedTotal,
    }
  })

  return NextResponse.json<ApiResponse<typeof records>>({ success: true, data: records })
}
