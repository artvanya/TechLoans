// apps/investor/src/app/api/webhooks/sumsub/route.ts
// Receives real-time KYC status updates from Sumsub
// Docs: https://developers.sumsub.com/api-reference/#webhooks

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@nexus/db'
import { writeAuditLog } from '@/lib/audit'
import { sendKycApprovedEmail } from '@/lib/email'

// Verify Sumsub webhook signature
function verifySignature(payload: string, digestHeader: string): boolean {
  const secret = process.env.SUMSUB_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Sumsub] SUMSUB_WEBHOOK_SECRET not set')
    return false
  }
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  return expected === digestHeader
}

// Map Sumsub review answers to our KYC status
function mapSumsubStatus(reviewAnswer: string, rejectLabels?: string[]): string {
  switch (reviewAnswer) {
    case 'GREEN':
      return 'APPROVED'
    case 'RED':
      return rejectLabels?.includes('FINAL_REJECTION') ? 'REJECTED' : 'ADDITIONAL_INFO_REQUIRED'
    default:
      return 'UNDER_REVIEW'
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const digestHeader = req.headers.get('x-payload-digest') ?? ''

  if (!verifySignature(rawBody, digestHeader)) {
    console.error('[Sumsub] Invalid webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, applicantId, reviewResult, externalUserId } = event

  // externalUserId is the userId we pass when creating the Sumsub applicant
  if (!externalUserId) {
    console.warn('[Sumsub] Webhook missing externalUserId:', event)
    return NextResponse.json({ received: true })
  }

  const investorProfile = await prisma.investorProfile.findUnique({
    where: { userId: externalUserId },
    include: { user: true },
  })

  if (!investorProfile) {
    console.warn('[Sumsub] No investor profile for userId:', externalUserId)
    return NextResponse.json({ received: true })
  }

  // Handle different event types
  if (type === 'applicantReviewed' || type === 'applicantPending') {
    const reviewAnswer = reviewResult?.reviewAnswer ?? 'PENDING'
    const rejectLabels = reviewResult?.rejectLabels ?? []
    const ourStatus = mapSumsubStatus(reviewAnswer, rejectLabels)

    const now = new Date()
    const updateData: Record<string, any> = {
      kycStatus: ourStatus,
    }

    if (ourStatus === 'APPROVED') {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      updateData.kycApprovedAt = now
      updateData.kycExpiresAt = expiresAt

      // Promote tier based on Sumsub level
      const sumsubLevel = event.levelName ?? ''
      if (sumsubLevel.toLowerCase().includes('enhanced') || sumsubLevel.toLowerCase().includes('platinum')) {
        updateData.tier = 'PLATINUM'
        updateData.kycLevel = 'PLATINUM'
      } else if (sumsubLevel.toLowerCase().includes('standard')) {
        updateData.tier = 'PREMIUM'
        updateData.kycLevel = 'ENHANCED'
      }
    } else if (ourStatus === 'REJECTED') {
      updateData.kycRejectionReason = rejectLabels.join(', ') || 'Identity verification failed'
    }

    await prisma.investorProfile.update({
      where: { id: investorProfile.id },
      data: updateData,
    })

    // Update KYC case
    await prisma.kycCase.updateMany({
      where: {
        investorProfileId: investorProfile.id,
        status: { in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] },
      },
      data: {
        status: ourStatus as any,
        providerRef: applicantId,
        providerResult: reviewResult,
        reviewedAt: now,
      },
    })

    // Send notification
    await prisma.notification.create({
      data: {
        userId: externalUserId,
        type: ourStatus === 'APPROVED' ? 'KYC_APPROVED' : ourStatus === 'REJECTED' ? 'KYC_REJECTED' : 'KYC_MORE_INFO',
        title: ourStatus === 'APPROVED'
          ? 'Identity verification approved'
          : ourStatus === 'REJECTED'
          ? 'Identity verification was not successful'
          : 'Additional information required',
        body: ourStatus === 'APPROVED'
          ? 'Your identity has been verified. You now have full access to invest on the platform.'
          : ourStatus === 'REJECTED'
          ? `We were unable to verify your identity. Reason: ${rejectLabels.join(', ')}. Please contact support.`
          : 'Our compliance team requires additional information. Please check your onboarding page.',
        metadata: { applicantId, reviewAnswer, rejectLabels },
      },
    })

    // Send email for approved
    if (ourStatus === 'APPROVED') {
      try {
        await sendKycApprovedEmail(investorProfile.user.email, investorProfile.firstName)
      } catch (err) {
        console.error('[Sumsub] Failed to send KYC approved email:', err)
      }
    }

    await writeAuditLog({
      action: 'KYC_APPROVE',
      entityType: 'KycCase',
      entityId: investorProfile.id,
      actorEmail: 'sumsub-webhook',
      afterState: { status: ourStatus, applicantId, reviewAnswer },
    })
  }

  if (type === 'applicantCreated') {
    // Store the Sumsub applicant ID for future reference
    await prisma.kycCase.updateMany({
      where: {
        investorProfileId: investorProfile.id,
        status: { in: ['DOCUMENTS_REQUESTED', 'DOCUMENTS_SUBMITTED'] },
      },
      data: { providerRef: applicantId },
    })
  }

  return NextResponse.json({ received: true })
}
