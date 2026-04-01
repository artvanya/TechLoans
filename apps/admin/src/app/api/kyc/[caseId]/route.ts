// apps/admin/src/app/api/kyc/[caseId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_info', 'escalate']),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
  kycLevel: z.enum(['STANDARD', 'ENHANCED', 'PLATINUM']).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const role = (session.user as any).role
  if (!['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(role)) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'KYC review requires compliance role' } }, { status: 403 })
  }

  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid review data' } }, { status: 422 })
  }

  const { action, rejectionReason, notes, kycLevel } = parsed.data

  const kycCase = await prisma.kycCase.findUnique({
    where: { id: params.caseId },
    include: { investorProfile: { include: { user: true } } },
  })

  if (!kycCase) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'KYC case not found' } }, { status: 404 })

  const now = new Date()
  const operatorId = (session.user as any).id

  if (action === 'approve') {
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1-year KYC validity

    await prisma.$transaction([
      prisma.kycCase.update({
        where: { id: params.caseId },
        data: { status: 'APPROVED', reviewedById: operatorId, reviewedAt: now, notes, expiresAt },
      }),
      prisma.investorProfile.update({
        where: { id: kycCase.investorProfileId },
        data: {
          kycStatus: 'APPROVED',
          kycLevel: kycLevel ?? kycCase.level,
          kycApprovedAt: now,
          kycExpiresAt: expiresAt,
          tier: kycLevel === 'PLATINUM' ? 'PLATINUM' : kycLevel === 'ENHANCED' ? 'PREMIUM' : 'STANDARD',
        },
      }),
    ])

    // TODO: Send KYC_APPROVED notification
    // await queueNotification(kycCase.investorProfile.userId, 'KYC_APPROVED', {})

    await writeAuditLog({
      actorId: operatorId,
      actorEmail: session.user.email!,
      action: 'KYC_APPROVE',
      entityType: 'KycCase',
      entityId: params.caseId,
      beforeState: { status: kycCase.status },
      afterState: { status: 'APPROVED', level: kycLevel },
    })

    return NextResponse.json({ success: true, data: { action: 'approved', caseId: params.caseId } })
  }

  if (action === 'reject') {
    if (!rejectionReason) {
      return NextResponse.json({ success: false, error: { code: 'REASON_REQUIRED', message: 'A rejection reason is required' } }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.kycCase.update({
        where: { id: params.caseId },
        data: { status: 'REJECTED', reviewedById: operatorId, reviewedAt: now, rejectionReason, notes },
      }),
      prisma.investorProfile.update({
        where: { id: kycCase.investorProfileId },
        data: { kycStatus: 'REJECTED', kycRejectionReason: rejectionReason },
      }),
    ])

    // TODO: Send KYC_REJECTED notification
    // await queueNotification(kycCase.investorProfile.userId, 'KYC_REJECTED', { reason: rejectionReason })

    await writeAuditLog({
      actorId: operatorId,
      actorEmail: session.user.email!,
      action: 'KYC_REJECT',
      entityType: 'KycCase',
      entityId: params.caseId,
      beforeState: { status: kycCase.status },
      afterState: { status: 'REJECTED', rejectionReason },
    })

    return NextResponse.json({ success: true, data: { action: 'rejected', caseId: params.caseId } })
  }

  if (action === 'request_info') {
    await prisma.kycCase.update({
      where: { id: params.caseId },
      data: { status: 'ADDITIONAL_INFO_REQUIRED', reviewedById: operatorId, notes },
    })
    await prisma.investorProfile.update({
      where: { id: kycCase.investorProfileId },
      data: { kycStatus: 'ADDITIONAL_INFO_REQUIRED' },
    })
    // TODO: Send KYC_MORE_INFO notification
    return NextResponse.json({ success: true, data: { action: 'info_requested', caseId: params.caseId } })
  }

  return NextResponse.json({ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Unknown action' } }, { status: 400 })
}
