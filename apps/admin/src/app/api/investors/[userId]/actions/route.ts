// apps/admin/src/app/api/investors/[userId]/actions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

const actionSchema = z.object({
  action: z.enum(['restrict', 'restore', 'unlock', 'set_tier', 'send_notification']),
  reason: z.string().optional(),
  tier: z.enum(['STANDARD', 'PREMIUM', 'PLATINUM']).optional(),
  notificationTitle: z.string().optional(),
  notificationBody: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } }, { status: 422 })

  const { action, reason, tier, notificationTitle, notificationBody } = parsed.data
  const operatorId = (session.user as any).id

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Investor not found' } }, { status: 404 })

  if (action === 'restrict') {
    await prisma.user.update({ where: { id: params.userId }, data: { isActive: false, lockReason: reason } })
    await writeAuditLog({ actorId: operatorId, actorEmail: session.user.email!, action: 'ACCOUNT_RESTRICT', entityType: 'User', entityId: params.userId, metadata: { reason } })
    return NextResponse.json({ success: true, data: { action: 'restricted' } })
  }

  if (action === 'restore') {
    await prisma.user.update({ where: { id: params.userId }, data: { isActive: true, isLocked: false, failedLoginCount: 0, lockReason: null } })
    await writeAuditLog({ actorId: operatorId, actorEmail: session.user.email!, action: 'ACCOUNT_RESTORE', entityType: 'User', entityId: params.userId })
    return NextResponse.json({ success: true, data: { action: 'restored' } })
  }

  if (action === 'unlock') {
    await prisma.user.update({ where: { id: params.userId }, data: { isLocked: false, failedLoginCount: 0, lockReason: null } })
    await writeAuditLog({ actorId: operatorId, actorEmail: session.user.email!, action: 'ACCOUNT_RESTORE', entityType: 'User', entityId: params.userId, metadata: { reason: 'Manual unlock' } })
    return NextResponse.json({ success: true, data: { action: 'unlocked' } })
  }

  if (action === 'set_tier') {
    if (!tier) return NextResponse.json({ success: false, error: { code: 'MISSING_TIER', message: 'tier is required' } }, { status: 400 })
    await prisma.investorProfile.update({ where: { userId: params.userId }, data: { tier } })
    await writeAuditLog({ actorId: operatorId, actorEmail: session.user.email!, action: 'UPDATE', entityType: 'InvestorProfile', entityId: params.userId, afterState: { tier } })
    return NextResponse.json({ success: true, data: { action: 'tier_set', tier } })
  }

  if (action === 'send_notification') {
    if (!notificationTitle || !notificationBody) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'title and body required' } }, { status: 400 })
    }
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: 'ADMIN_MESSAGE',
        title: notificationTitle,
        body: notificationBody,
        metadata: { sentBy: operatorId },
      },
    })
    return NextResponse.json({ success: true, data: { action: 'notification_sent' } })
  }

  return NextResponse.json({ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Unknown action' } }, { status: 400 })
}
