// apps/admin/src/app/api/investments/route.ts
// Admin investment management - confirm, activate, mark repaid

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const { searchParams } = req.nextUrl
  const dealId = searchParams.get('dealId')
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')

  const investments = await prisma.investment.findMany({
    where: {
      ...(dealId ? { dealId } : {}),
      ...(userId ? { userId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { confirmedAt: 'desc' },
    include: {
      deal: { select: { name: true, internalId: true, investorApr: true } },
      user: { select: { email: true } },
    },
  })

  return NextResponse.json({
    success: true,
    data: investments.map((i) => ({
      id: i.id,
      dealName: i.deal.name,
      dealId: i.dealId,
      investorEmail: i.user.email,
      amount: Number(i.amount),
      status: i.status,
      source: i.source,
      apr: Number(i.deal.investorApr),
      confirmedAt: i.confirmedAt?.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  })
}

const actionSchema = z.object({
  action: z.enum(['activate', 'mark_repaid', 'mark_defaulted', 'cancel']),
  investmentIds: z.array(z.string().cuid()),
  reason: z.string().optional(),
})

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } }, { status: 422 })

  const { action, investmentIds, reason } = parsed.data

  const statusMap = {
    activate: 'ACTIVE',
    mark_repaid: 'REPAID',
    mark_defaulted: 'DEFAULTED',
    cancel: 'PENDING',
  } as const

  await prisma.investment.updateMany({
    where: { id: { in: investmentIds } },
    data: { status: statusMap[action] },
  })

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'STATUS_CHANGE',
    entityType: 'Investment',
    afterState: { action, investmentIds, newStatus: statusMap[action], reason },
  })

  return NextResponse.json({ success: true, data: { updated: investmentIds.length, newStatus: statusMap[action] } })
}
