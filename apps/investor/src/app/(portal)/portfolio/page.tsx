// apps/investor/src/app/(portal)/portfolio/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate, dealTypeLabel, chargeTypeLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Panel, PanelHeader, MetricCard } from '@/components/ui/panel'
import { AllocationDonut } from '@/components/charts/allocation-donut'
import { IncomeBarchart } from '@/components/charts/income-barchart'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PortfolioPage() {
  const session = await getSession()
  const userId = session!.user.id

  const [investments, wallets, transactions] = await Promise.all([
    prisma.investment.findMany({
      where: { userId },
      include: {
        deal: {
          select: {
            id: true, name: true, type: true, status: true,
            investorApr: true, ltv: true, chargeType: true,
            maturityDate: true, loanDurationMonths: true,
            propertyCity: true, propertyRegion: true, riskGrade: true,
            targetRaise: true, currentRaised: true,
          },
        },
        payouts: {
          select: { amount: true, type: true, status: true, scheduledDate: true, createdAt: true },
        },
      },
      orderBy: { confirmedAt: 'desc' },
    }),
    prisma.wallet.findMany({ where: { investorProfile: { userId } } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const totalDeployed = investments.reduce((s, i) => s + Number(i.amount), 0)
  const availableBalance = wallets.reduce((s, w) => s + Number(w.balance), 0)
  const ytdStart = new Date(new Date().getFullYear(), 0, 1)

  const realisedYtd = investments.reduce((s, i) =>
    s + i.payouts
      .filter((p) => p.status === 'COMPLETED' && p.createdAt >= ytdStart)
      .reduce((ps, p) => ps + Number(p.amount), 0), 0)

  const activeInvestments = investments.filter((i) =>
    ['LIVE', 'ACTIVE', 'FUNDED'].includes(i.deal.status)
  )

  const weightedApr = totalDeployed > 0
    ? investments.reduce((s, i) => s + Number(i.deal.investorApr) * Number(i.amount), 0) / totalDeployed
    : 0
  const weightedLtv = totalDeployed > 0
    ? investments.reduce((s, i) => s + Number(i.deal.ltv) * Number(i.amount), 0) / totalDeployed
    : 0

  const expectedFullTerm = investments.reduce((s, i) =>
    s + Number(i.amount) * (Number(i.deal.investorApr) / 100) * (i.deal.loanDurationMonths / 12), 0)

  const annualisedReturn = totalDeployed > 0
    ? (realisedYtd / totalDeployed) * 100 * (12 / (new Date().getMonth() || 1))
    : 0

  // Monthly income for last 6 months
  const monthlyIncome: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = d.toLocaleString('en-GB', { month: 'short' })
    monthlyIncome[key] = 0
  }
  for (const inv of investments) {
    for (const p of inv.payouts) {
      if (p.status === 'COMPLETED') {
        const key = p.createdAt.toLocaleString('en-GB', { month: 'short' })
        if (key in monthlyIncome) monthlyIncome[key] += Number(p.amount)
      }
    }
  }

  // Allocation by type
  const typeAlloc: Record<string, number> = {}
  for (const inv of investments) {
    const t = dealTypeLabel(inv.deal.type)
    typeAlloc[t] = (typeAlloc[t] ?? 0) + Number(inv.amount)
  }

  // Upcoming repayments
  const upcoming = await prisma.payout.findMany({
    where: {
      investment: { userId },
      status: { in: ['SCHEDULED'] },
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 5,
    include: { investment: { include: { deal: { select: { name: true } } } } },
  })

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Total Deployed"
          value={formatCurrency(totalDeployed)}
          delta={{ value: `${investments.length} position${investments.length !== 1 ? 's' : ''}`, direction: 'neutral' }}
        />
        <MetricCard
          label="Available Balance"
          value={formatCurrency(availableBalance)}
          sub={wallets.map((w) => `${w.currency}: ${formatCurrency(Number(w.balance), w.currency)}`).join(' · ') || 'No wallets'}
        />
        <MetricCard
          label="Realised Return (YTD)"
          value={formatCurrency(realisedYtd)}
          delta={{ value: `${formatPercent(annualisedReturn)} annualised`, direction: 'up' }}
        />
        <MetricCard
          label="Expected Full-Term"
          value={formatCurrency(expectedFullTerm)}
          sub={`Wtd avg ${formatPercent(weightedApr)} APR · ${formatPercent(weightedLtv, 0)} LTV`}
        />
      </div>

      {/* Portfolio health bar */}
      {investments.length > 0 && (
        <Panel>
          <div className="p-5">
            <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">Portfolio Health</div>
            <div className="grid grid-cols-5 gap-px bg-nexus border border-nexus rounded-lg overflow-hidden">
              {[
                { label: 'Positions',    value: investments.length.toString() },
                { label: 'Active',       value: activeInvestments.length.toString(), teal: true },
                { label: 'Wtd Avg LTV',  value: formatPercent(weightedLtv, 0) },
                { label: 'Wtd Avg APR',  value: formatPercent(weightedApr), accent: true },
                { label: 'Defaults',     value: '0', teal: true },
              ].map(({ label, value, accent, teal }) => (
                <div key={label} className="bg-nexus-bg3 py-3.5 text-center">
                  <div className="text-[9.5px] tracking-[1px] uppercase text-nexus-muted mb-1.5">{label}</div>
                  <div className={`font-mono text-[19px] font-medium ${accent ? 'text-nexus-gold' : teal ? 'text-nexus-teal' : ''}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4">

          {/* Active positions */}
          <Panel>
            <PanelHeader title="Active Positions" subtitle="Senior secured real estate debt" />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Loan', 'Deployed', 'APR', 'LTV', 'Maturity', 'Status'].map((h) => (
                      <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-nexus-muted">
                        No active investments.{' '}
                        <Link href="/deals" className="text-nexus-gold hover:underline">Browse opportunities →</Link>
                      </td>
                    </tr>
                  ) : investments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.018] transition-colors cursor-pointer">
                      <td className="px-4 py-3.5 border-b border-nexus">
                        <Link href={`/deals/${inv.deal.id}`}>
                          <div className="text-[13px] font-medium hover:text-nexus-gold transition-colors">{inv.deal.name}</div>
                          <div className="text-[10.5px] text-nexus-muted mt-0.5">
                            {inv.deal.propertyCity} · {dealTypeLabel(inv.deal.type)} · {chargeTypeLabel(inv.deal.chargeType)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Recent transactions */}
          <Panel>
            <PanelHeader title="Recent Transactions" subtitle="Interest receipts and capital movements" />
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
                {transactions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-nexus-muted">No transactions yet</td></tr>
                ) : transactions.map((tx) => (
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

          {/* Upcoming repayments */}
          {upcoming.length > 0 && (
            <Panel>
              <PanelHeader title="Upcoming Repayments" subtitle="Scheduled principal and interest events" />
              <table className="w-full">
                <thead>
                  <tr>{['Event', 'Type', 'Expected Amount', 'Date'].map((h) => (
                    <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {upcoming.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3.5 border-b border-nexus">
                        <div className="text-[12.5px] font-medium">{p.investment.deal.name}</div>
                        <div className="text-[10.5px] text-nexus-muted mt-0.5">{p.type === 'interest' ? 'Monthly coupon' : 'Principal repayment'}</div>
                      </td>
                      <td className="px-4 py-3.5 border-b border-nexus text-right">
                        <Badge variant={p.type === 'interest' ? 'gold' : 'green'}>{p.type === 'interest' ? 'Interest' : 'Principal'}</Badge>
                      </td>
                      <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px] text-nexus-teal">+{formatCurrency(Number(p.amount))}</td>
                      <td className="px-4 py-3.5 border-b border-nexus text-right text-[11px] text-nexus-muted">{formatDate(p.scheduledDate.toISOString(), 'short')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <AllocationDonut allocations={typeAlloc} total={totalDeployed} />
          <IncomeBarchart data={Object.entries(monthlyIncome).map(([month, amount]) => ({ month, amount }))} />

          {/* Capital protection notice */}
          <div className="bg-nexus-gold/[0.06] border border-nexus-gold/10 rounded-lg p-4">
            <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-gold mb-2">Capital Protection</div>
            <p className="text-[12.5px] text-nexus-muted leading-[1.75]">
              All positions are secured against UK real estate. Every loan carries a registered legal charge.
              In the event of borrower default, enforcement proceeds return principal to investors first.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-2">
            <Link href="/deals" className="block py-2.5 text-center text-[12px] border border-nexus2 rounded-lg text-nexus-text hover:border-nexus-gold hover:text-nexus-gold transition-colors">
              Browse Investment Opportunities →
            </Link>
            <Link href="/track-record" className="block py-2.5 text-center text-[12px] border border-nexus2 rounded-lg text-nexus-text hover:border-nexus-gold hover:text-nexus-gold transition-colors">
              View Track Record →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
