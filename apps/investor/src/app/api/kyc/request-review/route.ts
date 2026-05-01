// apps/investor/src/app/api/kyc/request-review/route.ts
// Demo / dev shortcut: submit KYC for operator review without uploading documents.
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { writeAuditLog } from '@/lib/audit'

const OPEN_CASE_STATUSES = [
  'DOCUMENTS_REQUESTED',
  'DOCUMENTS_SUBMITTED',
  'UNDER_REVIEW',
  'ADDITIONAL_INFO_REQUIRED',
] as const

export async function POST(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { message: 'Authentication required' } }, { status: 401 })
  }

  const profile = await prisma.investorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) {
    return NextResponse.json({ success: false, error: { message: 'Profile not found' } }, { status: 404 })
  }

  if (profile.kycStatus === 'APPROVED') {
    return NextResponse.json({ success: false, error: { message: 'Your account is already verified' } }, { status: 400 })
  }

  let kycCase = await prisma.kycCase.findFirst({
    where: { investorProfileId: profile.id, status: { in: [...OPEN_CASE_STATUSES] } },
    orderBy: { createdAt: 'desc' },
  })

  if (!kycCase) {
    kycCase = await prisma.kycCase.create({
      data: {
        investorProfileId: profile.id,
        level: profile.kycLevel,
        status: 'UNDER_REVIEW',
      },
    })
  } else {
    await prisma.kycCase.update({
      where: { id: kycCase.id },
      data: { status: 'UNDER_REVIEW' },
    })
  }

  await prisma.investorProfile.update({
    where: { id: profile.id },
    data: { kycStatus: 'UNDER_REVIEW' },
  })

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'KycCase',
    entityId: kycCase.id,
    afterState: { status: 'UNDER_REVIEW', source: 'request_review_no_docs' },
  })

  return NextResponse.json({ success: true, data: { kycCaseId: kycCase.id } })
}
