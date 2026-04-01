// apps/admin/src/app/api/deals/[id]/servicing/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

const logEventSchema = z.object({
  eventType: z.enum([
    'INTEREST_RECEIVED', 'PRINCIPAL_REPAYMENT_FULL', 'PARTIAL_REPAYMENT',
    'LATE_PAYMENT', 'PENALTY_APPLIED', 'MATURITY_EXTENSION', 'DEFAULT_NOTICE',
    'LPA_RECEIVER_APPOINTED', 'PROPERTY_LISTED', 'COLLATERAL_SALE_COMPLETED',
    'ENFORCEMENT_COMPLETED', 'DEAL_CLOSED', 'NOTE_ADDED',
  ]),
  amount: z.number().optional(),
  eventDate: z.string(),
  notes: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const logs = await prisma.servicingLog.findMany({
    where: { dealId: params.id },
    orderBy: { eventDate: 'desc' },
    include: { loggedBy: { select: { firstName: true, lastName: true } } },
  })

  return NextResponse.json({
    success: true,
    data: logs.map((l) => ({
      id: l.id,
      eventType: l.eventType,
      amount: l.amount ? Number(l.amount) : null,
      eventDate: l.eventDate.toISOString(),
      notes: l.notes,
      loggedBy: l.loggedBy ? `${l.loggedBy.firstName} ${l.loggedBy.lastName}` : 'System',
      createdAt: l.createdAt.toISOString(),
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()
  const parsed = logEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid event data' } }, { status: 422 })

  const { eventType, amount, eventDate, notes } = parsed.data

  // Get admin profile id for loggedById
  const adminProfile = await prisma.adminProfile.findUnique({ where: { userId: (session.user as any).id } })

  const log = await prisma.servicingLog.create({
    data: {
      dealId: params.id,
      eventType: eventType as any,
      amount: amount ?? undefined,
      eventDate: new Date(eventDate),
      notes,
      loggedById: adminProfile?.id,
    },
  })

  // Handle status-changing events
  const statusMap: Record<string, string> = {
    DEFAULT_NOTICE: 'ACTIVE', // stays active until enforcement
    ENFORCEMENT_COMPLETED: 'CLOSED',
    DEAL_CLOSED: 'CLOSED',
    PRINCIPAL_REPAYMENT_FULL: 'REPAID',
  }
  if (statusMap[eventType]) {
    await prisma.deal.update({
      where: { id: params.id },
      data: { status: statusMap[eventType] as any },
    })
  }

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'ServicingLog',
    entityId: log.id,
    metadata: { dealId: params.id, eventType, amount },
  })

  return NextResponse.json({ success: true, data: { id: log.id } })
}
