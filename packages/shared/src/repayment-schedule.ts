// packages/shared/src/repayment-schedule.ts
// Generates repayment schedule items for a deal and its investments
// Called when deal status changes to ACTIVE/FUNDED

import type { PrismaClient } from '@prisma/client'

interface ScheduleOptions {
  dealId: string
  loanAmount: number
  investorApr: number
  loanDurationMonths: number
  originationDate: Date
  repaymentType: string
}

/**
 * Generate a repayment schedule for a deal.
 * Creates RepaymentScheduleItem records for interest and principal.
 */
export async function generateDealRepaymentSchedule(
  prisma: PrismaClient,
  options: ScheduleOptions
): Promise<void> {
  const {
    dealId,
    loanAmount,
    investorApr,
    loanDurationMonths,
    originationDate,
    repaymentType,
  } = options

  // Clear existing schedule
  await prisma.repaymentScheduleItem.deleteMany({ where: { dealId, status: 'SCHEDULED' } })

  const monthlyRate = investorApr / 100 / 12
  const items: Array<{
    dealId: string
    type: string
    scheduledDate: Date
    amount: number
    status: string
  }> = []

  if (repaymentType === 'MONTHLY_INTEREST_BULLET' || repaymentType === 'QUARTERLY_INTEREST_BULLET') {
    const isQuarterly = repaymentType === 'QUARTERLY_INTEREST_BULLET'
    const interval = isQuarterly ? 3 : 1
    const monthlyInterest = loanAmount * monthlyRate * interval

    for (let month = interval; month <= loanDurationMonths; month += interval) {
      const date = new Date(originationDate)
      date.setMonth(date.getMonth() + month)
      date.setDate(15) // Pay on the 15th

      items.push({
        dealId,
        type: 'interest',
        scheduledDate: date,
        amount: Math.round(monthlyInterest * 100) / 100,
        status: 'SCHEDULED',
      })
    }

    // Final principal repayment
    const maturityDate = new Date(originationDate)
    maturityDate.setMonth(maturityDate.getMonth() + loanDurationMonths)

    items.push({
      dealId,
      type: 'principal',
      scheduledDate: maturityDate,
      amount: loanAmount,
      status: 'SCHEDULED',
    })
  } else if (repaymentType === 'ROLLED_UP_BULLET') {
    // All interest + principal at maturity
    const totalInterest = loanAmount * monthlyRate * loanDurationMonths
    const maturityDate = new Date(originationDate)
    maturityDate.setMonth(maturityDate.getMonth() + loanDurationMonths)

    items.push({
      dealId,
      type: 'interest',
      scheduledDate: maturityDate,
      amount: Math.round(totalInterest * 100) / 100,
      status: 'SCHEDULED',
    })
    items.push({
      dealId,
      type: 'principal',
      scheduledDate: maturityDate,
      amount: loanAmount,
      status: 'SCHEDULED',
    })
  } else if (repaymentType === 'AMORTISING') {
    // Equal monthly payments (principal + interest)
    const payment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -loanDurationMonths))
    let balance = loanAmount

    for (let month = 1; month <= loanDurationMonths; month++) {
      const date = new Date(originationDate)
      date.setMonth(date.getMonth() + month)
      date.setDate(15)

      const interestPayment = balance * monthlyRate
      const principalPayment = payment - interestPayment
      balance -= principalPayment

      items.push({
        dealId,
        type: 'interest',
        scheduledDate: date,
        amount: Math.round(interestPayment * 100) / 100,
        status: 'SCHEDULED',
      })
      items.push({
        dealId,
        type: 'principal',
        scheduledDate: date,
        amount: Math.round(principalPayment * 100) / 100,
        status: 'SCHEDULED',
      })
    }
  }

  if (items.length > 0) {
    await prisma.repaymentScheduleItem.createMany({ data: items })
  }
}

/**
 * Generate investor-level Payout records from the deal schedule.
 * Pro-rates each payment by each investor's share of the deal.
 * Called after deal is fully funded.
 */
export async function generateInvestorPayouts(
  prisma: PrismaClient,
  dealId: string
): Promise<void> {
  const [scheduleItems, investments] = await Promise.all([
    prisma.repaymentScheduleItem.findMany({
      where: { dealId, status: 'SCHEDULED' },
    }),
    prisma.investment.findMany({
      where: { dealId, status: { in: ['CONFIRMED', 'ACTIVE'] } },
    }),
  ])

  if (scheduleItems.length === 0 || investments.length === 0) return

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { currentRaised: true },
  })

  if (!deal) return

  const totalRaised = Number(deal.currentRaised)
  if (totalRaised === 0) return

  const payoutsToCreate: Array<{
    investmentId: string
    type: string
    amount: number
    currency: string
    status: 'SCHEDULED'
    scheduledDate: Date
  }> = []

  for (const schedItem of scheduleItems) {
    for (const investment of investments) {
      const investorShare = Number(investment.amount) / totalRaised
      const investorAmount = Math.round(Number(schedItem.amount) * investorShare * 100) / 100

      if (investorAmount > 0) {
        // Check payout doesn't already exist
        const existing = await prisma.payout.findFirst({
          where: {
            investmentId: investment.id,
            type: schedItem.type,
            scheduledDate: schedItem.scheduledDate,
          },
        })

        if (!existing) {
          payoutsToCreate.push({
            investmentId: investment.id,
            type: schedItem.type,
            amount: investorAmount,
            currency: 'GBP',
            status: 'SCHEDULED',
            scheduledDate: schedItem.scheduledDate,
          })
        }
      }
    }
  }

  if (payoutsToCreate.length > 0) {
    await prisma.payout.createMany({ data: payoutsToCreate })
    console.log(`[RepaymentSchedule] Created ${payoutsToCreate.length} payout records for deal ${dealId}`)
  }
}
