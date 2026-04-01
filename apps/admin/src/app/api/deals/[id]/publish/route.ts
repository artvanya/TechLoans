// apps/admin/src/app/api/deals/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { writeAuditLog } from '@/lib/audit'
import { runAutoInvestForDeal } from '@nexus/shared'

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

  if (!['APPROVED', 'DRAFT'].includes(deal.status)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_STATUS', message: `Cannot publish a deal with status: ${deal.status}` } },
      { status: 400 }
    )
  }

  // Publish the deal
  await prisma.deal.update({
    where: { id: params.id },
    data: {
      status: 'LIVE',
      visibleToInvestors: true,
      openForInvestment: true,
      publishedAt: new Date(),
    },
  })

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'PUBLISH',
    entityType: 'Deal',
    entityId: params.id,
    beforeState: { status: deal.status },
    afterState: { status: 'LIVE', publishedAt: new Date().toISOString() },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  // Run auto-invest engine asynchronously — don't block the response
  // In production use a background queue (BullMQ, Inngest, etc.)
  setImmediate(async () => {
    try {
      const result = await runAutoInvestForDeal(prisma, params.id)
      console.log(`[AutoInvest] Deal ${params.id}: ${result.invested} investments, ${result.skipped} skipped`)
    } catch (err) {
      console.error('[AutoInvest] Engine error:', err)
    }
  })

  return NextResponse.json({
    success: true,
    data: { id: params.id, status: 'LIVE', message: 'Deal published. Auto-invest engine triggered.' },
  })
}

export async function DELETE(
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

  await prisma.deal.update({
    where: { id: params.id },
    data: { visibleToInvestors: false, openForInvestment: false },
  })

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'UNPUBLISH',
    entityType: 'Deal',
    entityId: params.id,
    afterState: { visibleToInvestors: false },
  })

  return NextResponse.json({ success: true, data: { id: params.id, unpublished: true } })
}
