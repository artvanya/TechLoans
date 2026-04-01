// apps/investor/src/app/api/portfolio/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import type { ApiResponse } from '@nexus/shared'

export interface PortfolioSummary {
  totalDeployed: number
  realisedYtd: number
  unrealisedAccrued: number
  expectedFullTerm: number
  weightedAvgLtv: number
  weightedAvgApr: number
  weightedAvgDuration: number
  firstChargePercent: number
  activePositions: number
  completedPositions: number
  defaultedPositions: number
  byType: Record<string, number>
  byRegion: Record<string, number>
  byRiskGrade: Record<string, number>
}

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } },
      { status: 401 }
    )
  }

  const investments = await prisma.investment.findMany({
    where: { userId: session.user.id },
    include: {
      deal: {
        select: {
          type: true, status: true, investorApr: true, ltv: true,
          chargeType: true, loanDurationMonths: true,
          propertyRegion: true, riskGrade: true,
        },
      },
      payouts: {
        where: { status: 'COMPLETED' },
        select: { amount: true, type: true, createdAt: true },
      },
    },
  })

  const totalDeployed = investments.reduce((s, i) => s + Number(i.amount), 0)
  const ytdStart = new Date(new Date().getFullYear(), 0, 1)

  const realisedYtd = investments.reduce(
    (s, i) => s + i.payouts.filter((p) => p.createdAt >= ytdStart).reduce((ps, p) => ps + Number(p.amount), 0),
    0
  )

  const unrealisedAccrued = investments.reduce((s, inv) => {
    const received = inv.payouts.reduce((ps, p) => ps + Number(p.amount), 0)
    const expectedTotal =
      Number(inv.amount) * (Number(inv.deal.investorApr) / 100) * (inv.deal.loanDurationMonths / 12)
    return s + Math.max(0, expectedTotal - received)
  }, 0)

  const expectedFullTerm = investments.reduce(
    (s, i) =>
      s + Number(i.amount) * (Number(i.deal.investorApr) / 100) * (i.deal.loanDurationMonths / 12),
    0
  )

  const wLtv =
    totalDeployed > 0
      ? investments.reduce((s, i) => s + Number(i.deal.ltv) * Number(i.amount), 0) / totalDeployed
      : 0
  const wApr =
    totalDeployed > 0
      ? investments.reduce((s, i) => s + Number(i.deal.investorApr) * Number(i.amount), 0) / totalDeployed
      : 0
  const wDur =
    totalDeployed > 0
      ? investments.reduce((s, i) => s + i.deal.loanDurationMonths * Number(i.amount), 0) / totalDeployed
      : 0

  const firstChargeAmount = investments
    .filter((i) => i.deal.chargeType === 'FIRST_CHARGE')
    .reduce((s, i) => s + Number(i.amount), 0)

  const byType: Record<string, number> = {}
  const byRegion: Record<string, number> = {}
  const byRisk: Record<string, number> = {}

  for (const inv of investments) {
    const amt = Number(inv.amount)
    byType[inv.deal.type] = (byType[inv.deal.type] ?? 0) + amt
    const r = inv.deal.propertyRegion ?? 'Unknown'
    byRegion[r] = (byRegion[r] ?? 0) + amt
    const g = inv.deal.riskGrade ?? 'Unknown'
    byRisk[g] = (byRisk[g] ?? 0) + amt
  }

  const summary: PortfolioSummary = {
    totalDeployed,
    realisedYtd,
    unrealisedAccrued,
    expectedFullTerm,
    weightedAvgLtv: Math.round(wLtv * 10) / 10,
    weightedAvgApr: Math.round(wApr * 10) / 10,
    weightedAvgDuration: Math.round(wDur * 10) / 10,
    firstChargePercent: totalDeployed > 0 ? Math.round((firstChargeAmount / totalDeployed) * 100) : 100,
    activePositions: investments.filter((i) => ['CONFIRMED', 'ACTIVE'].includes(i.status)).length,
    completedPositions: investments.filter((i) => i.status === 'REPAID').length,
    defaultedPositions: investments.filter((i) => i.status === 'DEFAULTED').length,
    byType,
    byRegion,
    byRiskGrade: byRisk,
  }

  return NextResponse.json<ApiResponse<PortfolioSummary>>({ success: true, data: summary })
}
