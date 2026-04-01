// apps/admin/src/app/api/payouts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'SCHEDULED'

  const payouts = await prisma.payout.findMany({
    where: { status: status as any },
    orderBy: { scheduledDate: 'asc' },
    include: {
      investment: {
        include: {
          deal: { select: { name: true, internalId: true } },
          user: { select: { email: true } },
        },
      },
    },
  })

  const data = payouts.map((p) => ({
    id: p.id,
    type: p.type,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    scheduledDate: p.scheduledDate.toISOString(),
    processedAt: p.processedAt?.toISOString() ?? null,
    dealName: p.investment.deal.name,
    dealInternalId: p.investment.deal.internalId,
    investorEmail: p.investment.user.email,
    investmentId: p.investmentId,
  }))

  return NextResponse.json({ success: true, data })
}

const approvePayoutSchema = z.object({
  payoutId: z.string().cuid(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()

  // Batch approve
  if (body.action === 'batch_approve' && Array.isArray(body.payoutIds)) {
    const results = await Promise.allSettled(
      body.payoutIds.map((id: string) => approveSinglePayout(id, (session.user as any).id, session.user.email!))
    )
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    return NextResponse.json({ success: true, data: { processed: succeeded, failed } })
  }

  const parsed = approvePayoutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } }, { status: 422 })

  try {
    await approveSinglePayout(parsed.data.payoutId, (session.user as any).id, session.user.email!, parsed.data.notes)
    return NextResponse.json({ success: true, data: { processed: true } })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'PAYOUT_FAILED', message: err.message } }, { status: 500 })
  }
}

async function approveSinglePayout(payoutId: string, operatorId: string, operatorEmail: string, notes?: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { investment: { include: { user: true } } },
  })

  if (!payout) throw new Error(`Payout ${payoutId} not found`)
  if (payout.status !== 'SCHEDULED') throw new Error(`Payout ${payoutId} is not in SCHEDULED status`)

  const now = new Date()

  await prisma.$transaction([
    prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED', processedAt: now, processedById: operatorId, notes },
    }),
    // Credit the investor wallet
    prisma.wallet.updateMany({
      where: { investorProfile: { userId: payout.investment.userId }, currency: 'GBP' },
      data: { balance: { increment: payout.amount } },
    }),
    prisma.transaction.create({
      data: {
        userId: payout.investment.userId,
        type: payout.type === 'interest' ? 'REPAYMENT_INTEREST' : 'REPAYMENT_PRINCIPAL',
        status: 'COMPLETED',
        amount: payout.amount,
        currency: payout.currency,
        description: `${payout.type === 'interest' ? 'Interest payment' : 'Principal repayment'} — processed ${now.toLocaleDateString()}`,
        processedAt: now,
      },
    }),
  ])

  await writeAuditLog({
    actorId: operatorId,
    actorEmail: operatorEmail,
    action: 'PAYOUT_RUN',
    entityType: 'Payout',
    entityId: payoutId,
    afterState: { status: 'COMPLETED', amount: Number(payout.amount) },
  })

  // TODO: Send INTEREST_PAID or PRINCIPAL_REPAID notification
}
