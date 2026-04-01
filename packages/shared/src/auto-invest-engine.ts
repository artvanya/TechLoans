// packages/shared/src/auto-invest-engine.ts
// Core auto-invest matching logic — shared between API and background job

import type { PrismaClient } from '@prisma/client'

interface MatchResult {
  ruleId: string
  userId: string
  dealId: string
  matched: boolean
  skipReason?: string
  amountToInvest?: number
}

export async function runAutoInvestForDeal(
  prisma: PrismaClient,
  dealId: string
): Promise<{ processed: number; invested: number; skipped: number }> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true, name: true, type: true, status: true,
      investorApr: true, ltv: true, loanDurationMonths: true,
      riskGrade: true, propertyRegion: true,
      targetRaise: true, currentRaised: true,
      minimumInvestment: true, openForInvestment: true,
      autoInvestEligible: true,
    },
  })

  if (!deal || !deal.openForInvestment || !deal.autoInvestEligible) {
    return { processed: 0, invested: 0, skipped: 0 }
  }

  const rules = await prisma.autoInvestRule.findMany({
    where: { status: 'ACTIVE' },
    include: { user: { include: { investorProfile: { include: { wallets: true } } } } },
  })

  let invested = 0
  let skipped = 0

  for (const rule of rules) {
    const result = await evaluateRule(prisma, rule, deal)

    await prisma.autoInvestMatch.create({
      data: {
        ruleId: rule.id,
        dealId: deal.id,
        matched: result.matched,
        skipReason: result.skipReason,
        amountDeployed: result.amountToInvest,
      },
    })

    if (result.matched && result.amountToInvest) {
      try {
        await executeInvestment(prisma, rule.userId, deal.id, result.amountToInvest, rule.id)
        invested++
        // Queue notification
        await prisma.notification.create({
          data: {
            userId: rule.userId,
            type: 'INVESTMENT_CONFIRMED',
            title: 'Auto-invest allocation confirmed',
            body: `£${result.amountToInvest.toLocaleString()} has been allocated to ${deal.name} via your auto-invest rules.`,
            metadata: { dealId: deal.id, amount: result.amountToInvest, source: 'auto-invest' },
          },
        })
      } catch (err) {
        console.error(`[AutoInvest] Failed to execute investment for user ${rule.userId}:`, err)
        skipped++
      }
    } else {
      skipped++
    }
  }

  return { processed: rules.length, invested, skipped }
}

async function evaluateRule(
  prisma: PrismaClient,
  rule: any,
  deal: any
): Promise<MatchResult> {
  const base = { ruleId: rule.id, userId: rule.userId, dealId: deal.id }

  // APR check
  if (Number(rule.minApr) > 0 && Number(deal.investorApr) < Number(rule.minApr)) {
    return { ...base, matched: false, skipReason: `APR ${Number(deal.investorApr).toFixed(1)}% below minimum ${Number(rule.minApr).toFixed(1)}%` }
  }

  // LTV check
  if (Number(rule.maxLtv) > 0 && Number(deal.ltv) > Number(rule.maxLtv)) {
    return { ...base, matched: false, skipReason: `LTV ${Number(deal.ltv).toFixed(1)}% exceeds maximum ${Number(rule.maxLtv).toFixed(1)}%` }
  }

  // Duration check
  if (rule.maxDurationMonths && deal.loanDurationMonths > rule.maxDurationMonths) {
    return { ...base, matched: false, skipReason: `Duration ${deal.loanDurationMonths}mo exceeds maximum ${rule.maxDurationMonths}mo` }
  }
  if (rule.minDurationMonths && deal.loanDurationMonths < rule.minDurationMonths) {
    return { ...base, matched: false, skipReason: `Duration ${deal.loanDurationMonths}mo below minimum ${rule.minDurationMonths}mo` }
  }

  // Risk grade check
  if (rule.permittedRiskGrades.length > 0 && deal.riskGrade && !rule.permittedRiskGrades.includes(deal.riskGrade)) {
    return { ...base, matched: false, skipReason: `Risk grade ${deal.riskGrade} not in permitted grades: ${rule.permittedRiskGrades.join(', ')}` }
  }

  // Loan type check
  if (rule.permittedLoanTypes.length > 0 && !rule.permittedLoanTypes.includes(deal.type)) {
    return { ...base, matched: false, skipReason: `Loan type ${deal.type} not in permitted types` }
  }

  // Region check
  if (rule.permittedRegions.length > 0 && deal.propertyRegion && !rule.permittedRegions.includes(deal.propertyRegion)) {
    return { ...base, matched: false, skipReason: `Region ${deal.propertyRegion} not in permitted regions` }
  }

  // Check remaining capacity in deal
  const remaining = Number(deal.targetRaise) - Number(deal.currentRaised)
  if (remaining <= 0) {
    return { ...base, matched: false, skipReason: 'Deal fully funded' }
  }

  // Check wallet balance above reserve
  const profile = rule.user.investorProfile
  if (!profile) return { ...base, matched: false, skipReason: 'No investor profile' }

  const gbpWallet = profile.wallets.find((w: any) => w.currency === 'GBP')
  const availableBalance = gbpWallet ? Number(gbpWallet.balance) - Number(rule.reserveCash) : 0

  if (availableBalance <= 0) {
    return { ...base, matched: false, skipReason: 'Insufficient balance above reserve threshold' }
  }

  // Check KYC
  if (profile.kycStatus !== 'APPROVED') {
    return { ...base, matched: false, skipReason: 'KYC not approved' }
  }

  // Calculate amount to invest
  const maxPerDeal = Number(rule.maxPerDeal)
  const amountToInvest = Math.min(
    maxPerDeal,
    availableBalance,
    remaining,
    Number(profile.maxSingleDealAmount)
  )

  if (amountToInvest < Number(deal.minimumInvestment)) {
    return { ...base, matched: false, skipReason: `Available ${amountToInvest.toFixed(0)} below minimum investment ${Number(deal.minimumInvestment).toFixed(0)}` }
  }

  // Diversification: check type concentration
  if (rule.maxPerTypePct) {
    const totalDeployed = await prisma.investment.aggregate({
      where: { userId: rule.userId, status: { in: ['CONFIRMED', 'ACTIVE'] } },
      _sum: { amount: true },
    })
    const totalByType = await prisma.investment.aggregate({
      where: { userId: rule.userId, status: { in: ['CONFIRMED', 'ACTIVE'] }, deal: { type: deal.type } },
      _sum: { amount: true },
    })
    const totalAmt = Number(totalDeployed._sum.amount ?? 0)
    const typeAmt = Number(totalByType._sum.amount ?? 0)
    if (totalAmt > 0) {
      const typeConcentration = ((typeAmt + amountToInvest) / (totalAmt + amountToInvest)) * 100
      if (typeConcentration > Number(rule.maxPerTypePct)) {
        return { ...base, matched: false, skipReason: `Type concentration ${typeConcentration.toFixed(0)}% would exceed max ${Number(rule.maxPerTypePct).toFixed(0)}%` }
      }
    }
  }

  return { ...base, matched: true, amountToInvest }
}

async function executeInvestment(
  prisma: PrismaClient,
  userId: string,
  dealId: string,
  amount: number,
  ruleId: string
) {
  const profile = await prisma.investorProfile.findUnique({
    where: { userId },
    include: { wallets: { where: { currency: 'GBP' } } },
  })

  const wallet = profile?.wallets[0]
  if (!wallet || Number(wallet.balance) < amount) {
    throw new Error('Insufficient balance at execution time')
  }

  await prisma.$transaction([
    prisma.investment.create({
      data: {
        userId,
        dealId,
        amount,
        status: 'CONFIRMED',
        source: 'auto-invest',
        confirmedAt: new Date(),
      },
    }),
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.deal.update({
      where: { id: dealId },
      data: { currentRaised: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type: 'INVESTMENT',
        status: 'COMPLETED',
        amount,
        currency: 'GBP',
        description: `Auto-invest allocation`,
        processedAt: new Date(),
      },
    }),
  ])
}
