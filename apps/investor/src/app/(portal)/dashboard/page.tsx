// apps/investor/src/app/(portal)/dashboard/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate, dealTypeLabel, chargeTypeLabel } from '@/lib/utils'
import { MetricCard } from '@/components/ui/panel'
import { Badge } from '@/components/ui/badge'
import { Panel, PanelHeader } from '@/components/ui/panel'
import Link from 'next/link'
import { IncomeBarchart } from '@/components/charts/income-barchart'
import { AllocationDonut } from '@/components/charts/allocation-donut'

export const dynamic = 'force-dynamic'

async function getDashboardData(userId: string) {
  const [investments, wallets, transactions, autoInvestRule] = await Promise.all([
    prisma.investment.findMany({
      where: { userId, status: { in: ['CONFIRMED', 'ACTIVE'] } },
      include: {
        deal: {
          select: {
            id: true, name: true, type: true, status: true,
            investorApr: true, ltv: true, chargeType: true,
            maturityDate: true, loanDurationMonths: true,
            propertyCity: true, propertyRegion: true,
            currentRaised: true, targetRaise: true,
          },
        },
        payouts: { where: { status: 'COMPLETED' }, select: { amount: true, type: true, createdAt: true } },
      },
      orderBy: { confirmedAt: 'desc' },
    }),
    prisma.wallet.findMany({ where: { investorProfile: { userId } } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.autoInvestRule.findUnique({ where: { userId } }),
  ])

  const totalDeployed = investments.reduce((s, i) => s + Number(i.amount), 0)
  const availableBalance = wallets.reduce((s, w) => s + Number(w.balance), 0)

  const ytdStart = new Date(new Date().getFullYear(), 0, 1)
  const realisedYtd = investments.reduce((s, i) =>
    s + i.payouts.filter((p) => p.createdAt >= ytdStart).reduce((ps, p) => ps + Number(p.amount), 0), 0)

  const active = investments.filter((i) => ['LIVE', 'ACTIVE', 'FUNDED'].includes(i.deal.status))
  const weightedLtv = totalDeployed > 0
    ? active.reduce((s, i) => s + Number(i.deal.ltv) * Number(i.amount), 0) / totalDeployed
    : 0
  const weightedApr = totalDeployed > 0
    ? investments.reduce((s, i) => s + Number(i.deal.investorApr) * Number(i.amount), 0) / totalDeployed
    : 0

  // Monthly income for last 6 months
  const monthlyIncome: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = d.toLocaleString('en-GB', { month: 'short' })
    monthlyIncome[key] = 0
  }
  for (const inv of investments) {
    for (const payout of inv.payouts) {
      const key = payout.createdAt.toLocaleString('en-GB', { month: 'short' })
      if (key in monthlyIncome) monthlyIncome[key] += Number(payout.amount)
    }
  }

  return {
    totalDeployed, availableBalance, realisedYtd,
    activeCount: active.length, weightedLtv, weightedApr,
    investments, wallets, transactions, autoInvestRule,
    monthlyIncome,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  const data = await getDashboardData(session!.user.id)

  const annualisedReturn = data.totalDeployed > 0
    ? (data.realisedYtd / data.totalDeployed) * 100 * (12 / new Date().getMonth() || 1)
    : 0

  // Allocation by type
  const typeAlloc: Record<string, number> = {}
  for (const inv of data.investments) {
    const t = dealTypeLabel(inv.deal.type)
    typeAlloc[t] = (typeAlloc[t] ?? 0) + Number(inv.amount)
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Total Deployed Capital"
          value={formatCurrency(data.totalDeployed)}
          delta={{ value: `${data.investments.length} active positions`, direction: 'neutral' }}
        />
        <MetricCard
          label="Available Balance"
          value={formatCurrency(data.availableBalance)}
          sub={data.wallets.map((w) => `${w.currency}: ${formatCurrency(Number(w.balance), w.currency)}`).join(' · ')}
        />
        <MetricCard
          label="Realised Return (YTD)"
          value={formatCurrency(data.realisedYtd)}
          delta={{ value: `${formatPercent(annualisedReturn)} annualised`, direction: 'up' }}
        />
        <MetricCard
          label="Active Positions"
          value={data.activeCount}
          sub={`Wtd avg LTV ${formatPercent(data.weightedLtv)} · APR ${formatPercent(data.weightedApr)}`}
        />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4">

          {/* Active positions table */}
          <Panel>
            <PanelHeader
              title="Active Positions"
              subtitle="Senior secured real estate debt · all registered charges"
              action={
                <Link href="/portfolio" className="text-[11px] text-nexus-muted hover:text-nexus-text transition-colors px-2 py-1 rounded border border-transparent hover:border-nexus">
                  Full portfolio →
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Transaction', 'Deployed', 'APR', 'LTV', 'Maturity', 'Status'].map((h) => (
                      <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus first:text-left [&:not(:first-child)]:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.investments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-nexus-muted">
                        No active investments.{' '}
                        <Link href="/deals" className="text-nexus-gold hover:underline">Browse available deals →</Link>
                      </td>
                    </tr>
                  ) : (
                    data.investments.map((inv) => {
                      const progress = Math.round(Number(inv.deal.currentRaised) / Number(inv.deal.targetRaise) * 100)
                      return (
                        <tr key={inv.id} className="hover:bg-white/[0.018] transition-colors cursor-pointer group">
                          <td className="px-4 py-3.5 border-b border-nexus">
                            <Link href={`/deals/${inv.deal.id}`} className="block">
                              <div className="text-[13px] font-medium group-hover:text-nexus-gold transition-colors">{inv.deal.name}</div>
                              <div className="text-[10.5px] text-nexus-muted mt-0.5">
                                {inv.deal.propertyCity} · {dealTypeLabel(inv.deal.type)} · {chargeTypeLabel(inv.deal.chargeType)}
                              </div>
                              <div className="h-0.5 bg-nexus-bg4 rounded mt-1.5 overflow-hidden w-32">
                                <div className="h-full bg-nexus-teal rounded" style={{ width: `${progress}%` }} />
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px]">
                            {formatCurrency(Number(inv.amount))}
                          </td>
                          <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px] text-nexus-teal">
                            {formatPercent(Number(inv.deal.investorApr))}
                          </td>
                          <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px]">
                            {formatPercent(Number(inv.deal.ltv), 0)}
                          </td>
                          <td className="px-4 py-3.5 border-b border-nexus text-right text-[11px] text-nexus-muted">
                            {formatDate(inv.deal.maturityDate?.toISOString(), 'short')}
                          </td>
                          <td className="px-4 py-3.5 border-b border-nexus text-right">
                            <Badge status={inv.deal.status}>{inv.deal.status}</Badge>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Income statement */}
          <Panel>
            <PanelHeader title="Income Statement" subtitle="Interest receipts credited to wallet" />
            <table className="w-full">
              <thead>
                <tr>
                  {['Transaction', 'Type', 'Amount', 'Date'].map((h) => (
                    <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-nexus-muted">No transactions yet</td></tr>
                ) : data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 border-b border-nexus">
                      <div className="text-[12.5px] font-medium">{tx.description ?? tx.type}</div>
                    </td>
                    <td className="px-4 py-3 border-b border-nexus text-right">
                      <Badge status={tx.status}>{tx.type.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className={`px-4 py-3 border-b border-nexus text-right font-mono text-[12px] ${Number(tx.amount) > 0 ? 'text-nexus-teal' : 'text-nexus-red'}`}>
                      {Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Math.abs(Number(tx.amount)))}
                    </td>
                    <td className="px-4 py-3 border-b border-nexus text-right text-[11px] text-nexus-muted">
                      {formatDate(tx.createdAt.toISOString(), 'short')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <AllocationDonut allocations={typeAlloc} total={data.totalDeployed} />
          <IncomeBarchart data={Object.entries(data.monthlyIncome).map(([month, amount]) => ({ month, amount }))} />

          {/* Auto-invest summary */}
          <Panel>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[13px] font-semibold">Auto-Invest</div>
                  <div className="text-[11px] text-nexus-muted mt-0.5">
                    {data.autoInvestRule?.status === 'ACTIVE' ? '4 criteria active · Engine running' : 'Not configured'}
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full border flex items-center transition-colors ${
                  data.autoInvestRule?.status === 'ACTIVE'
                    ? 'bg-nexus-teal border-nexus-teal'
                    : 'bg-nexus-bg4 border-nexus2'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full transition-all ml-0.5 ${
                    data.autoInvestRule?.status === 'ACTIVE' ? 'translate-x-4 bg-white' : 'bg-nexus-muted'
                  }`} />
                </div>
              </div>
              {data.autoInvestRule ? (
                <div className="space-y-0 text-[12px]">
                  {[
                    ['Min APR', `≥ ${formatPercent(Number(data.autoInvestRule.minApr))}`],
                    ['Max LTV', `≤ ${formatPercent(Number(data.autoInvestRule.maxLtv), 0)}`],
                    ['Max Duration', `${data.autoInvestRule.maxDurationMonths} months`],
                    ['Max per Deal', formatCurrency(Number(data.autoInvestRule.maxPerDeal))],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-nexus last:border-0">
                      <span className="text-nexus-muted">{label}</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-nexus-muted">No rules configured.</p>
              )}
              <Link href="/auto-invest" className="block mt-3 py-2 text-center text-[12px] border border-nexus2 rounded-lg text-nexus-text hover:border-nexus-gold hover:text-nexus-gold transition-colors">
                Configure Rules
              </Link>
            </div>
          </Panel>

          {/* Capital protection notice */}
          <div className="bg-nexus-gold/[0.06] border border-nexus-gold/10 rounded-lg p-4">
            <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-gold mb-2">Capital Protection</div>
            <p className="text-[12.5px] text-nexus-muted leading-[1.75]">
              All positions are secured against UK real estate. Every loan carries a registered legal charge.
              In the event of borrower default, enforcement proceeds return principal to investors first.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
