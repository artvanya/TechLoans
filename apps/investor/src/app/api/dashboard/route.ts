// apps/investor/src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import type { ApiResponse } from '@nexus/shared'

export interface DashboardMetrics {
  totalDeployed: number
  availableBalance: number
  realisedReturnYtd: number
  activePositions: number
  weightedAvgLtv: number
  weightedAvgApr: number
  wallets: Array<{ currency: string; balance: number }>
  recentTransactions: Array<{
    id: string
    type: string
    amount: number
    currency: string
    description: string | null
    createdAt: string
  }>
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const userId = session.user.id

  const [investments, wallets, transactions] = await Promise.all([
    prisma.investment.findMany({
      where: { userId, status: { in: ['CONFIRMED', 'ACTIVE'] } },
      include: {
        deal: { select: { investorApr: true, ltv: true, status: true } },
        payouts: { where: { status: 'COMPLETED' } },
      },
    }),
    prisma.wallet.findMany({ where: { investorProfile: { userId } } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const totalDeployed = investments.reduce((sum, inv) => sum + Number(inv.amount), 0)

  const ytdStart = new Date(new Date().getFullYear(), 0, 1)
  const realisedReturnYtd = investments.reduce((sum, inv) => {
    const ytdPayouts = inv.payouts.filter((p) => p.createdAt >= ytdStart)
    return sum + ytdPayouts.reduce((s, p) => s + Number(p.amount), 0)
  }, 0)

  const activePositions = investments.filter((i) =>
    ['LIVE', 'ACTIVE', 'FUNDED'].includes(i.deal.status)
  ).length

  let weightedLtv = 0
  let weightedApr = 0
  if (totalDeployed > 0) {
    weightedLtv = investments.reduce((sum, inv) => {
      return sum + (Number(inv.deal.ltv) * Number(inv.amount)) / totalDeployed
    }, 0)
    weightedApr = investments.reduce((sum, inv) => {
      return sum + (Number(inv.deal.investorApr) * Number(inv.amount)) / totalDeployed
    }, 0)
  }

  const availableBalance = wallets
    .filter((w) => w.currency === 'GBP' || w.currency === 'USDC')
    .reduce((sum, w) => sum + Number(w.balance), 0)

  const metrics: DashboardMetrics = {
    totalDeployed,
    availableBalance,
    realisedReturnYtd,
    activePositions,
    weightedAvgLtv: Math.round(weightedLtv * 10) / 10,
    weightedAvgApr: Math.round(weightedApr * 10) / 10,
    wallets: wallets.map((w) => ({ currency: w.currency, balance: Number(w.balance) })),
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  }

  return NextResponse.json<ApiResponse<DashboardMetrics>>({ success: true, data: metrics })
}
