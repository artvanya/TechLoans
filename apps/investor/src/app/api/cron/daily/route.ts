// apps/investor/src/app/api/cron/daily/route.ts
// Called by Vercel Cron or external scheduler daily at 08:00 UTC
// Protected by CRON_SECRET header

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexus/db'

export const dynamic = 'force-dynamic'

function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  return secret === process.env.CRON_SECRET
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, any> = {}

  // 1. KYC expiry reminders (30 days before expiry)
  try {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const expiringProfiles = await prisma.investorProfile.findMany({
      where: {
        kycStatus: 'APPROVED',
        kycExpiresAt: { lte: thirtyDaysFromNow, gt: new Date() },
      },
      include: { user: { select: { id: true, email: true } } },
    })

    let kycNotificationsSent = 0
    for (const profile of expiringProfiles) {
      // Check if we already sent this notification
      const existing = await prisma.notification.findFirst({
        where: {
          userId: profile.userId,
          type: 'KYC_REFRESH_DUE',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // within last 7 days
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: profile.userId,
            type: 'KYC_REFRESH_DUE',
            title: 'Annual KYC refresh required',
            body: `Your identity verification expires on ${profile.kycExpiresAt?.toLocaleDateString('en-GB')}. Please complete your annual refresh to maintain full account access.`,
            metadata: { expiresAt: profile.kycExpiresAt?.toISOString() },
          },
        })

        // Update investor profile status
        if (profile.kycExpiresAt && profile.kycExpiresAt < new Date()) {
          await prisma.investorProfile.update({
            where: { id: profile.id },
            data: { kycStatus: 'REFRESH_REQUIRED' },
          })
        }

        kycNotificationsSent++
      }
    }
    results.kycReminders = { processed: expiringProfiles.length, sent: kycNotificationsSent }
  } catch (err) {
    results.kycReminders = { error: String(err) }
  }

  // 2. Mature deals — flag deals past maturity date with no repayment
  try {
    const overdueDealCount = await prisma.deal.count({
      where: {
        status: { in: ['LIVE', 'ACTIVE', 'FUNDED'] },
        maturityDate: { lt: new Date() },
      },
    })
    results.overdueDealCheck = { overdueCount: overdueDealCount }
  } catch (err) {
    results.overdueDealCheck = { error: String(err) }
  }

  // 3. Generate monthly interest payouts for active deals
  try {
    const today = new Date()
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const isFirstOfMonth = today.getDate() === 1

    if (isFirstOfMonth) {
      const activeInvestments = await prisma.investment.findMany({
        where: { status: { in: ['CONFIRMED', 'ACTIVE'] } },
        include: { deal: { select: { investorApr: true, repaymentType: true, maturityDate: true, status: true } } },
      })

      let payoutsCreated = 0
      for (const inv of activeInvestments) {
        if (!['LIVE', 'ACTIVE', 'FUNDED'].includes(inv.deal.status)) continue

        // Check if payout already exists for this month
        const existing = await prisma.payout.findFirst({
          where: {
            investmentId: inv.id,
            type: 'interest',
            scheduledDate: { gte: firstOfMonth, lt: new Date(firstOfMonth.getTime() + 32 * 24 * 60 * 60 * 1000) },
          },
        })

        if (!existing) {
          const monthlyInterest = (Number(inv.amount) * Number(inv.deal.investorApr)) / 100 / 12
          await prisma.payout.create({
            data: {
              investmentId: inv.id,
              type: 'interest',
              amount: Math.round(monthlyInterest * 100) / 100,
              currency: 'GBP',
              status: 'SCHEDULED',
              scheduledDate: new Date(today.getFullYear(), today.getMonth(), 15), // pay on 15th
            },
          })
          payoutsCreated++
        }
      }
      results.monthlyPayouts = { generated: payoutsCreated }
    } else {
      results.monthlyPayouts = { skipped: 'Not first of month' }
    }
  } catch (err) {
    results.monthlyPayouts = { error: String(err) }
  }

  console.log('[Cron/Daily]', results)

  return NextResponse.json({
    success: true,
    data: { ran: new Date().toISOString(), results },
  })
}
