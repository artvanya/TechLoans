// apps/admin/src/app/api/deals/[id]/generate-schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { generateDealRepaymentSchedule, generateInvestorPayouts } from '@nexus/shared'
import { writeAuditLog } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const deal = await prisma.deal.findUnique({ where: { id: params.id } })
  if (!deal) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } }, { status: 404 })
  }

  if (!deal.maturityDate || !deal.originationDate) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_DATES', message: 'Deal must have origination and maturity dates set' } },
      { status: 400 }
    )
  }

  try {
    await generateDealRepaymentSchedule(prisma, {
      dealId: deal.id,
      loanAmount: Number(deal.loanAmount),
      investorApr: Number(deal.investorApr),
      loanDurationMonths: deal.loanDurationMonths,
      originationDate: deal.originationDate,
      repaymentType: deal.repaymentType,
    })

    await generateInvestorPayouts(prisma, deal.id)

    const scheduleCount = await prisma.repaymentScheduleItem.count({ where: { dealId: deal.id } })
    const payoutCount = await prisma.payout.count({ where: { investment: { dealId: deal.id } } })

    await writeAuditLog({
      actorId: (session.user as any).id,
      actorEmail: session.user.email!,
      action: 'UPDATE',
      entityType: 'Deal',
      entityId: deal.id,
      metadata: { event: 'schedule_generated', scheduleItems: scheduleCount, payouts: payoutCount },
    })

    return NextResponse.json({
      success: true,
      data: { scheduleItems: scheduleCount, payouts: payoutCount },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SCHEDULE_ERROR', message: err.message } },
      { status: 500 }
    )
  }
}
