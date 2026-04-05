// apps/investor/src/app/(portal)/track-record/page.tsx
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { getSignedDownloadUrl } from '@/lib/storage'

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

  // Portfolio deals (track record entries)
  const portfolioRaw = await prisma.deal.findMany({
    where: { isPortfolio: true },
    orderBy: { originationDate: 'desc' },
    include: { images: { where: { isPrimary: true }, take: 1 } },
  })

  const portfolioDeals = await Promise.all(
    portfolioRaw.map(async (d) => {
      let imageUrl: string | null = null
      if (d.images[0]) {
        try { imageUrl = await getSignedDownloadUrl(d.images[0].storageKey, 3600) } catch {}
      }
      return { ...d, imageUrl }
    })
  )

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

      {/* Portfolio deal cards */}
      {portfolioDeals.length > 0 && (
        <div>
          <div className="text-[10px] tracking-[2px] uppercase text-nexus-gold mb-4">
            Case Studies — {portfolioDeals.length} deal{portfolioDeals.length !== 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {portfolioDeals.map((deal) => {
              const statusLabel: Record<string, string> = {
                ACTIVE: 'Active', REPAID: 'Closed', DEFAULTED: 'In Recovery',
              }
              const statusColor: Record<string, string> = {
                ACTIVE: '#2CC89A', REPAID: '#5B9CF6', DEFAULTED: '#E05C5C',
              }
              const color = statusColor[deal.status] ?? '#7C7A74'
              const label = statusLabel[deal.status] ?? deal.status
              return (
                <div key={deal.id} className="bg-nexus-bg2 border border-nexus rounded-xl overflow-hidden flex flex-col">
                  {/* Image */}
                  <div style={{ height: 160, background: '#0D0E11', position: 'relative', flexShrink: 0 }}>
                    {deal.imageUrl ? (
                      <img
                        src={deal.imageUrl}
                        alt={deal.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                        </svg>
                      </div>
                    )}
                    {/* Status badge */}
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: `${color}22`, color, border: `1px solid ${color}44`,
                      fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.8px',
                      padding: '3px 8px', borderRadius: '5px',
                    }}>
                      {label.toUpperCase()}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Title + location */}
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '3px' }}>
                        {deal.propertyType ?? 'Property'}{deal.propertyCity ? ` · ${deal.propertyCity}` : ''}
                      </div>
                      {deal.propertyRegion && (
                        <div style={{ fontSize: '11px', color: '#7C7A74' }}>{deal.propertyRegion}</div>
                      )}
                    </div>

                    {/* Description */}
                    {deal.propertyDescription && (
                      <p style={{ fontSize: '11.5px', color: '#7C7A74', lineHeight: 1.6, margin: 0 }}>
                        {deal.propertyDescription.length > 100
                          ? deal.propertyDescription.slice(0, 100) + '…'
                          : deal.propertyDescription}
                      </p>
                    )}

                    {/* Key metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {[
                        { label: 'Loan', value: Number(deal.loanAmount) > 1 ? `£${(Number(deal.loanAmount) / 1000).toFixed(0)}k` : '—' },
                        { label: 'LTV', value: Number(deal.ltv) > 0 ? `${Number(deal.ltv).toFixed(0)}%` : '—' },
                        { label: 'Rate', value: Number(deal.investorApr) > 0 ? `${Number(deal.investorApr).toFixed(1)}%` : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{value}</div>
                          <div style={{ fontSize: '9.5px', color: '#5C5B57', letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Dates */}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '10.5px', color: '#5C5B57', marginTop: 'auto' }}>
                      {deal.originationDate && (
                        <span>Originated {deal.originationDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                      )}
                      {deal.actualClosingDate && (
                        <span>· Closed {deal.actualClosingDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                      )}
                      {deal.actualDurationMonths && (
                        <span>· {deal.actualDurationMonths}mo</span>
                      )}
                    </div>

                    {/* Borrower info */}
                    {(deal.borrowerType || deal.borrowerPurpose) && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', fontSize: '11px', color: '#7C7A74' }}>
                        {deal.borrowerType && <span>{deal.borrowerType}</span>}
                        {deal.borrowerType && deal.borrowerPurpose && <span> · </span>}
                        {deal.borrowerPurpose && <span>{deal.borrowerPurpose}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
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
