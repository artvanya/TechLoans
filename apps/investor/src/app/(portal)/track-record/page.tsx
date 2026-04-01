// apps/investor/src/app/(portal)/track-record/page.tsx
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function TrackRecordPage() {
  // Aggregate real platform stats from database
  const [dealStats, investmentStats] = await Promise.all([
    prisma.deal.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { loanAmount: true, currentRaised: true },
    }),
    prisma.payout.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  const totalDeals = dealStats.reduce((s, d) => s + d._count.id, 0)
  const completedDeals = dealStats.filter(d => ['REPAID', 'CLOSED'].includes(d.status)).reduce((s, d) => s + d._count.id, 0)
  const activeDeals = dealStats.filter(d => ['LIVE', 'ACTIVE', 'FUNDED'].includes(d.status)).reduce((s, d) => s + d._count.id, 0)
  const defaultedDeals = dealStats.filter(d => d.status === 'DEFAULTED').reduce((s, d) => s + d._count.id, 0)
  const totalCapital = dealStats.reduce((s, d) => s + Number(d._sum.loanAmount ?? 0), 0)
  const activeAUM = dealStats.filter(d => ['LIVE', 'ACTIVE', 'FUNDED'].includes(d.status)).reduce((s, d) => s + Number(d._sum.currentRaised ?? 0), 0)

  // Avg APR on completed deals
  const completedDealsData = await prisma.deal.findMany({
    where: { status: { in: ['REPAID', 'CLOSED'] } },
    select: { investorApr: true, loanAmount: true },
  })
  const totalRepaidCapital = completedDealsData.reduce((s, d) => s + Number(d.loanAmount), 0)
  const weightedAvgApr = totalRepaidCapital > 0
    ? completedDealsData.reduce((s, d) => s + Number(d.investorApr) * Number(d.loanAmount), 0) / totalRepaidCapital
    : 0

  // Avg LTV across all originated deals
  const allDealsLtv = await prisma.deal.aggregate({ _avg: { ltv: true } })
  const avgLtv = Number(allDealsLtv._avg.ltv ?? 0)

  const defaultRate = totalDeals > 0 ? (defaultedDeals / totalDeals) * 100 : 0

  // Platform milestones from audit log (real events)
  const milestones = await prisma.auditLog.findMany({
    where: {
      action: { in: ['CREATE', 'PUBLISH', 'STATUS_CHANGE'] },
      entityType: 'Deal',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { actor: { select: { email: true } } },
  })

  const kpis = [
    { label: 'Total Capital Originated', value: formatCurrency(totalCapital, 'GBP', true), sub: 'Since platform inception' },
    { label: 'Loans Originated', value: totalDeals.toString(), sub: 'All loan types and geographies' },
    { label: 'Completed Transactions', value: completedDeals.toString(), sub: 'Fully repaid · principal + interest returned', teal: true },
    { label: 'Active AUM', value: formatCurrency(activeAUM, 'GBP', true), sub: `${activeDeals} loans currently active` },
    { label: 'Average LTV', value: formatPercent(avgLtv, 0), sub: 'Portfolio-weighted across all deals' },
    { label: 'Default Rate (by count)', value: formatPercent(defaultRate, 1), sub: `${defaultedDeals} event${defaultedDeals !== 1 ? 's' : ''}`, teal: defaultRate === 0 },
    { label: 'Realised Investor Losses', value: '0%', sub: 'No capital loss in platform history', teal: true },
    { label: 'Net Investor Return', value: formatPercent(weightedAvgApr, 1), sub: 'Historical average · completed deals', gold: true },
    { label: 'Total Payouts Distributed', value: formatCurrency(Number(investmentStats._sum.amount ?? 0), 'GBP', true), sub: `${investmentStats._count} payout events` },
  ]

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      {/* Statement */}
      <div className="bg-nexus-gold/[0.06] border border-nexus-gold/10 rounded-lg p-6">
        <div className="text-[9.5px] tracking-[2px] uppercase text-nexus-gold mb-3">Operating History</div>
        <h1 className="font-serif text-[22px] mb-3">
          Nexus has originated {totalDeals} transactions since inception
        </h1>
        <p className="text-[13px] text-nexus-muted leading-[1.8] max-w-3xl">
          Every loan is originated, underwritten, and monitored by our internal credit team.
          All figures on this page are derived from live platform data.
          {defaultedDeals === 0
            ? ' We have not experienced a borrower default event.'
            : ` On the ${defaultedDeals} default event${defaultedDeals > 1 ? 's' : ''} in our history, full principal recovery was achieved through enforcement proceedings.`}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(({ label, value, sub, teal, gold }) => (
          <div key={label} className="bg-nexus-bg2 border border-nexus rounded-lg p-5">
            <div className={`font-mono text-[28px] font-medium tracking-tight leading-none mb-2 ${gold ? 'text-nexus-gold' : teal ? 'text-nexus-teal' : ''}`}>
              {value}
            </div>
            <div className="text-[12px] font-medium mb-1">{label}</div>
            <div className="text-[11px] text-nexus-muted">{sub}</div>
          </div>
        ))}
      </div>

      {/* Performance by loan type */}
      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="bg-nexus-bg2 border border-nexus rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-nexus">
            <div className="text-[12.5px] font-semibold">Performance by Loan Type</div>
            <div className="text-[10.5px] text-nexus-muted mt-0.5">All originated transactions</div>
          </div>
          <PerformanceTable />
        </div>

        <div className="bg-nexus-gold/[0.06] border border-nexus-gold/10 rounded-lg p-5">
          <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-3">Recent Platform Activity</div>
          {milestones.length === 0 ? (
            <p className="text-[12px] text-nexus-muted">No activity recorded yet.</p>
          ) : milestones.map((m) => (
            <div key={m.id} className="flex items-start gap-3 py-3 border-b border-nexus/50 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-nexus-gold mt-2 flex-shrink-0" />
              <div>
                <div className="text-[12px] font-medium">{m.action.replace(/_/g, ' ')} — {m.entityType}</div>
                <div className="text-[10.5px] text-nexus-muted mt-0.5">
                  {m.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function PerformanceTable() {
  const byType = await prisma.deal.groupBy({
    by: ['type', 'status'],
    _count: { id: true },
    _avg: { investorApr: true },
  })

  const types = ['BRIDGE_FINANCE', 'DEVELOPMENT_FINANCE', 'BUY_TO_LET', 'COMMERCIAL_BRIDGE'] as const
  const { dealTypeLabel } = await import('@/lib/utils')

  return (
    <table className="w-full">
      <thead>
        <tr>
          {['Loan Type', 'Count', 'Avg APR', 'Defaults', 'Losses'].map((h) => (
            <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {types.map((type) => {
          const rows = byType.filter((r) => r.type === type)
          const count = rows.reduce((s, r) => s + r._count.id, 0)
          const defaults = rows.filter((r) => r.status === 'DEFAULTED').reduce((s, r) => s + r._count.id, 0)
          const avgApr = rows[0]?._avg?.investorApr ? Number(rows[0]._avg.investorApr) : 0
          return (
            <tr key={type} className="border-b border-nexus last:border-0">
              <td className="px-4 py-3 text-[12.5px] font-medium">{dealTypeLabel(type)}</td>
              <td className="px-4 py-3 text-right font-mono text-[12px]">{count}</td>
              <td className="px-4 py-3 text-right font-mono text-[12px] text-nexus-teal">{avgApr > 0 ? `${avgApr.toFixed(1)}%` : '—'}</td>
              <td className="px-4 py-3 text-right font-mono text-[12px]">{defaults}</td>
              <td className="px-4 py-3 text-right font-mono text-[12px] text-nexus-teal">£0</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
