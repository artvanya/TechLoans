// apps/investor/src/app/(portal)/portfolio/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate, dealTypeLabel, chargeTypeLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Panel, PanelHeader, MetricCard } from '@/components/ui/panel'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PortfolioPage() {
  const session = await getSession()
  const userId = session!.user.id

  const investments = await prisma.investment.findMany({
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
  })

  const totalDeployed = investments.reduce((s, i) => s + Number(i.amount), 0)
  const ytdStart = new Date(new Date().getFullYear(), 0, 1)

  const realisedYtd = investments.reduce((s, i) =>
    s + i.payouts
      .filter((p) => p.status === 'COMPLETED' && p.createdAt >= ytdStart)
      .reduce((ps, p) => ps + Number(p.amount), 0), 0)

  const unrealised = investments.reduce((s, i) => {
    const received = i.payouts.filter((p) => p.status === 'COMPLETED').reduce((ps, p) => ps + Number(p.amount), 0)
    const expectedTotal = Number(i.amount) * (Number(i.deal.investorApr) / 100) * (i.deal.loanDurationMonths / 12)
    return s + Math.max(0, expectedTotal - received)
  }, 0)

  const expectedFullTerm = investments.reduce((s, i) =>
    s + Number(i.amount) * (Number(i.deal.investorApr) / 100) * (i.deal.loanDurationMonths / 12), 0)

  const weightedLtv = totalDeployed > 0
    ? investments.reduce((s, i) => s + Number(i.deal.ltv) * Number(i.amount), 0) / totalDeployed : 0
  const weightedApr = totalDeployed > 0
    ? investments.reduce((s, i) => s + Number(i.deal.investorApr) * Number(i.amount), 0) / totalDeployed : 0
  const weightedDuration = totalDeployed > 0
    ? investments.reduce((s, i) => s + i.deal.loanDurationMonths * Number(i.amount), 0) / totalDeployed : 0

  // Allocation breakdowns
  const byType: Record<string, number> = {}
  const byRegion: Record<string, number> = {}
  const byRisk: Record<string, number> = {}
  for (const inv of investments) {
    const t = dealTypeLabel(inv.deal.type); byType[t] = (byType[t] ?? 0) + Number(inv.amount)
    const r = inv.deal.propertyRegion ?? 'Unknown'; byRegion[r] = (byRegion[r] ?? 0) + Number(inv.amount)
    const g = inv.deal.riskGrade ?? 'Unknown'; byRisk[g] = (byRisk[g] ?? 0) + Number(inv.amount)
  }

  // Upcoming repayments
  const upcoming = await prisma.payout.findMany({
    where: {
      investment: { userId },
      status: { in: ['SCHEDULED'] },
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 6,
    include: { investment: { include: { deal: { select: { name: true } } } } },
  })

  const typeColors: Record<string, string> = {
    'Bridge Finance': '#2CC89A', 'Development Finance': '#BFA063',
    'Buy-to-Let': '#5B9CF6', 'Commercial Bridge': '#9D8DF7', 'Mezzanine': '#E8A030',
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total Portfolio Value" value={formatCurrency(totalDeployed)} delta={{ value: `${investments.length} positions`, direction: 'neutral' }} />
        <MetricCard label="Unrealised Income" value={formatCurrency(unrealised)} sub="Accrued · not yet received" />
        <MetricCard label="Realised Income (YTD)" value={formatCurrency(realisedYtd)} delta={{ value: `${formatPercent(totalDeployed > 0 ? realisedYtd / totalDeployed * 100 : 0)} annualised`, direction: 'up' }} />
        <MetricCard label="Expected Full-Term" value={formatCurrency(expectedFullTerm)} sub={`Wtd avg ${formatPercent(weightedApr)} APR`} />
      </div>

      {/* Portfolio health */}
      <Panel>
        <div className="p-5">
          <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">Portfolio Health Summary</div>
          <div className="grid grid-cols-6 gap-px bg-nexus border border-nexus rounded-lg overflow-hidden">
            {[
              { label: 'Positions',     value: investments.length.toString() },
              { label: 'Wtd Avg LTV',   value: formatPercent(weightedLtv, 0) },
              { label: 'Wtd Avg APR',   value: formatPercent(weightedApr), accent: true },
              { label: 'Avg Duration',  value: `${Math.round(weightedDuration)} mo` },
              { label: 'First Charge',  value: formatPercent(totalDeployed > 0 ? investments.filter(i => i.deal.chargeType === 'FIRST_CHARGE').reduce((s, i) => s + Number(i.amount), 0) / totalDeployed * 100 : 100, 0), teal: true },
              { label: 'Defaults',      value: '0', teal: true },
            ].map(({ label, value, accent, teal }) => (
              <div key={label} className="bg-nexus-bg3 py-3.5 text-center">
                <div className="text-[9.5px] tracking-[1px] uppercase text-nexus-muted mb-1.5">{label}</div>
                <div className={`font-mono text-[19px] font-medium ${accent ? 'text-nexus-gold' : teal ? 'text-nexus-teal' : ''}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          {/* All positions */}
          <Panel>
            <PanelHeader title="All Positions" action={
              <button className="text-[11px] text-nexus-muted hover:text-nexus-text transition-colors px-2 py-1 border border-nexus rounded">
                Export CSV
              </button>
            } />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Loan', 'Deployed', 'APR', 'Expected', 'LTV', 'Matures', 'Status'].map((h) => (
                      <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investments.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[12px] text-nexus-muted">
                      No investments yet. <Link href="/deals" className="text-nexus-gold hover:underline">Browse available deals →</Link>
                    </td></tr>
                  ) : investments.map((inv) => {
                    const expectedReturn = Number(inv.amount) * (Number(inv.deal.investorApr) / 100) * (inv.deal.loanDurationMonths / 12)
                    return (
                      <tr key={inv.id} className="hover:bg-white/[0.018] transition-colors cursor-pointer">
                        <td className="px-4 py-3.5 border-b border-nexus">
                          <Link href={`/deals/${inv.deal.id}`}>
                            <div className="text-[13px] font-medium hover:text-nexus-gold transition-colors">{inv.deal.name}</div>
                            <div className="text-[10.5px] text-nexus-muted mt-0.5">{dealTypeLabel(inv.deal.type)} · {chargeTypeLabel(inv.deal.chargeType)} · Risk {inv.deal.riskGrade ?? '—'}</div>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px]">{formatCurrency(Number(inv.amount))}</td>
                        <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px] text-nexus-teal">{formatPercent(Number(inv.deal.investorApr))}</td>
                        <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px] text-nexus-gold">+{formatCurrency(expectedReturn)}</td>
                        <td className="px-4 py-3.5 border-b border-nexus text-right font-mono text-[12px]">{formatPercent(Number(inv.deal.ltv), 0)}</td>
                        <td className="px-4 py-3.5 border-b border-nexus text-right text-[11px] text-nexus-muted">{formatDate(inv.deal.maturityDate?.toISOString(), 'short')}</td>
                        <td className="px-4 py-3.5 border-b border-nexus text-right"><Badge status={inv.deal.status}>{inv.deal.status}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Repayment schedule */}
          <Panel>
            <PanelHeader title="Repayment Schedule" subtitle="Upcoming principal and interest events" />
            <table className="w-full">
              <thead>
                <tr>{['Event', 'Type', 'Expected Amount', 'Date'].map((h) => (
                  <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {upcoming.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-nexus-muted">No scheduled repayments</td></tr>
                ) : upcoming.map((p) => (
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
        </div>

        {/* Right: allocation breakdowns */}
        <div className="flex flex-col gap-4">
          {[
            { title: 'By Loan Type', data: byType },
            { title: 'By Geography',  data: byRegion },
            { title: 'By Risk Grade', data: byRisk },
          ].map(({ title, data }) => (
            <Panel key={title}>
              <div className="p-4">
                <div className="text-[12.5px] font-semibold mb-3">{title}</div>
                {Object.entries(data).length === 0 ? (
                  <div className="text-[12px] text-nexus-muted py-2">No data</div>
                ) : Object.entries(data).sort((a, b) => b[1] - a[1]).map(([label, amount]) => {
                  const pct = totalDeployed > 0 ? Math.round(amount / totalDeployed * 100) : 0
                  return (
                    <div key={label} className="flex items-center gap-2.5 py-2.5 border-b border-nexus last:border-0">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: typeColors[label] ?? '#5B9CF6' }} />
                        <span className="text-[12px] text-nexus-muted">{label}</span>
                      </div>
                      <div className="flex-1 h-1 bg-nexus-bg4 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: typeColors[label] ?? '#5B9CF6' }} />
                      </div>
                      <span className="font-mono text-[11px] flex-shrink-0">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  )
}
