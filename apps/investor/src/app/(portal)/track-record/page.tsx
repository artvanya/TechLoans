// apps/investor/src/app/(portal)/track-record/page.tsx
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { getSignedDownloadUrl } from '@/lib/storage'
import { TrackRecordPortfolioCard, type TrackRecordDealPayload } from '@/components/track-record/track-record-portfolio-card'

export const dynamic = 'force-dynamic'

export default async function TrackRecordPage() {
  // Platform-level stats
  const dealStats = await prisma.deal.groupBy({
    by: ['status'],
    _count: { id: true },
    _sum: { loanAmount: true, currentRaised: true },
  })

  const totalDeals = dealStats.reduce((s, d) => s + d._count.id, 0)
  const completedDeals = dealStats.filter(d => ['REPAID', 'CLOSED'].includes(d.status)).reduce((s, d) => s + d._count.id, 0)
  const activeDeals = dealStats.filter(d => ['LIVE', 'ACTIVE', 'FUNDED'].includes(d.status)).reduce((s, d) => s + d._count.id, 0)
  const defaultedDeals = dealStats.filter(d => d.status === 'DEFAULTED').reduce((s, d) => s + d._count.id, 0)
  const totalCapital = dealStats.reduce((s, d) => s + Number(d._sum.loanAmount ?? 0), 0)

  const completedDealsData = await prisma.deal.findMany({
    where: { status: { in: ['REPAID', 'CLOSED'] } },
    select: { investorApr: true, loanAmount: true },
  })
  const totalRepaidCapital = completedDealsData.reduce((s, d) => s + Number(d.loanAmount), 0)
  const weightedAvgApr = totalRepaidCapital > 0
    ? completedDealsData.reduce((s, d) => s + Number(d.investorApr) * Number(d.loanAmount), 0) / totalRepaidCapital
    : 0

  const defaultRate = totalDeals > 0 ? (defaultedDeals / totalDeals) * 100 : 0

  // Portfolio case studies — past deals admin created
  const portfolioRaw = await prisma.deal.findMany({
    where: { isPortfolio: true },
    orderBy: { originationDate: 'desc' },
    include: { images: { where: { isPrimary: true, deletedAt: null }, take: 1 } },
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

  function toPayload(d: (typeof portfolioDeals)[number]): TrackRecordDealPayload {
    return {
      id: d.id,
      name: d.name,
      internalId: d.internalId,
      imageUrl: d.imageUrl,
      status: d.status,
      type: d.type,
      propertyType: d.propertyType,
      propertyCity: d.propertyCity,
      propertyRegion: d.propertyRegion,
      propertyAddress: d.propertyAddress,
      propertyPostcode: d.propertyPostcode,
      propertyDescription: d.propertyDescription,
      collateralSummary: d.collateralSummary,
      summary: d.summary,
      underwritingSummary: d.underwritingSummary,
      loanAmount: Number(d.loanAmount),
      propertyValuation: Number(d.propertyValuation),
      ltv: Number(d.ltv),
      investorApr: Number(d.investorApr),
      loanDurationMonths: d.loanDurationMonths,
      chargeType: d.chargeType,
      repaymentType: d.repaymentType,
      riskGrade: d.riskGrade,
      targetRaise: Number(d.targetRaise),
      currentRaised: Number(d.currentRaised),
      originationDate: d.originationDate?.toISOString() ?? null,
      maturityDate: d.maturityDate?.toISOString() ?? null,
      actualClosingDate: d.actualClosingDate?.toISOString() ?? null,
      actualDurationMonths: d.actualDurationMonths,
      borrowerType: d.borrowerType,
      borrowerPurpose: d.borrowerPurpose,
      exitRoute: d.exitRoute,
    }
  }

  const kpis = [
    { label: 'Capital Originated',      value: formatCurrency(totalCapital, 'GBP', true),   sub: 'Total loan book' },
    { label: 'Loans Originated',        value: totalDeals.toString(),                         sub: 'All deal types' },
    { label: 'Completed Transactions',  value: completedDeals.toString(),                     sub: 'Principal + interest returned', teal: true },
    { label: 'Active Loans',            value: activeDeals.toString(),                        sub: 'Currently live' },
    { label: 'Net Investor Return',      value: formatPercent(weightedAvgApr, 1),             sub: 'Historical avg · completed deals', gold: true },
    { label: 'Default Rate',             value: formatPercent(defaultRate, 1),                sub: defaultedDeals === 0 ? 'No defaults to date' : `${defaultedDeals} event${defaultedDeals > 1 ? 's' : ''}`, teal: defaultRate === 0 },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(({ label, value, sub, teal, gold }) => (
          <div key={label} className="bg-nexus-bg2 border border-nexus rounded-xl p-5">
            <div className={`font-mono text-[28px] font-medium tracking-tight leading-none mb-2 ${gold ? 'text-nexus-gold' : teal ? 'text-nexus-teal' : ''}`}>
              {value}
            </div>
            <div className="text-[12px] font-medium mb-1">{label}</div>
            <div className="text-[11px] text-nexus-muted">{sub}</div>
          </div>
        ))}
      </div>

      {/* Portfolio case studies */}
      {portfolioDeals.length > 0 ? (
        <div>
          <div className="text-[10px] tracking-[2px] uppercase text-nexus-gold mb-4">
            Past Deals — {portfolioDeals.length} case stud{portfolioDeals.length !== 1 ? 'ies' : 'y'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {portfolioDeals.map((deal) => (
              <div key={deal.id} className="h-full min-h-0 flex w-full">
                <TrackRecordPortfolioCard deal={toPayload(deal)} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-nexus-bg2 border border-nexus rounded-xl p-10 text-center">
          <div className="text-[32px] mb-3 opacity-20">◎</div>
          <div className="text-[14px] font-medium mb-2">No past deals published yet</div>
          <div className="text-[12px] text-nexus-muted">
            Case studies from completed transactions will appear here once published by the platform team.
          </div>
        </div>
      )}
    </div>
  )
}
