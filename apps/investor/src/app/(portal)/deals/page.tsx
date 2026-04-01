// apps/investor/src/app/(portal)/deals/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, dealTypeLabel, fundingProgress } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getSignedDownloadUrl } from '@/lib/storage'
import Link from 'next/link'
import { DealsFilterBar } from '@/components/deals/deals-filter-bar'

export const dynamic = 'force-dynamic'

interface SearchParams {
  type?: string
  region?: string
  riskGrade?: string
  minApr?: string
  maxLtv?: string
}

async function getDeals(userId: string, filters: SearchParams) {
  const profile = await prisma.investorProfile.findUnique({
    where: { userId },
    select: { tier: true },
  })
  const canSeeApprovedOnly = profile?.tier === 'PLATINUM' || profile?.tier === 'PREMIUM'

  const where: any = {
    visibleToInvestors: true,
    status: { in: ['LIVE', 'FUNDED', 'ACTIVE'] },
    ...(canSeeApprovedOnly ? {} : { approvedInvestorsOnly: false }),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.region ? { propertyRegion: filters.region } : {}),
    ...(filters.riskGrade ? { riskGrade: filters.riskGrade } : {}),
    ...(filters.minApr ? { investorApr: { gte: parseFloat(filters.minApr) } } : {}),
    ...(filters.maxLtv ? { ltv: { lte: parseFloat(filters.maxLtv) } } : {}),
  }

  const deals = await prisma.deal.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
    include: {
      images: { where: { isPrimary: true, deletedAt: null }, take: 1 },
      investments: { where: { status: { not: 'PENDING' } }, select: { id: true } },
    },
  })

  return Promise.all(deals.map(async (d) => ({
    ...d,
    loanAmount: Number(d.loanAmount),
    propertyValuation: Number(d.propertyValuation),
    ltv: Number(d.ltv),
    investorApr: Number(d.investorApr),
    minimumInvestment: Number(d.minimumInvestment),
    targetRaise: Number(d.targetRaise),
    currentRaised: Number(d.currentRaised),
    investorCount: d.investments.length,
    primaryImageUrl: d.images[0]
      ? await getSignedDownloadUrl(d.images[0].storageKey, 3600).catch(() => null)
      : null,
  })))
}

export default async function DealsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  const deals = await getDeals(session!.user.id, searchParams)

  const totalCapital = deals.reduce((s, d) => s + d.targetRaise, 0)
  const avgApr = deals.length > 0 ? deals.reduce((s, d) => s + d.investorApr, 0) / deals.length : 0
  const avgLtv = deals.length > 0 ? deals.reduce((s, d) => s + d.ltv, 0) / deals.length : 0

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      {/* Stats bar */}
      <div className="flex items-center gap-6">
        {[
          { label: 'Live Opportunities', value: deals.length.toString() },
          { label: 'Weighted Avg APR',   value: formatPercent(avgApr),        accent: true },
          { label: 'Total Capital',       value: formatCurrency(totalCapital, 'GBP', true), accent: true },
          { label: 'Avg LTV',            value: formatPercent(avgLtv, 0) },
        ].map((s, i) => (
          <div key={i} className={i > 0 ? 'border-l border-nexus pl-6' : ''}>
            <div className="text-[9.5px] tracking-[1.2px] uppercase text-nexus-hint mb-1">{s.label}</div>
            <div className={`font-mono text-[19px] font-medium ${s.accent ? 'text-nexus-gold' : ''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DealsFilterBar currentFilters={searchParams} />

      {deals.length === 0 ? (
        <div className="py-16 text-center text-nexus-muted">
          <div className="text-[32px] mb-3 opacity-20">◎</div>
          <div className="text-[14px] font-medium mb-1">No deals match your filters</div>
          <div className="text-[12px]">Try adjusting your criteria or check back soon.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {deals.map((deal) => {
            const progress = fundingProgress(deal.currentRaised, deal.targetRaise)
            return (
              <Link key={deal.id} href={`/deals/${deal.id}`}
                className="bg-nexus-bg2 border border-nexus rounded-lg overflow-hidden hover:border-nexus-gold transition-all duration-200 group block"
              >
                {/* Property image or placeholder */}
                <div className="h-[140px] bg-nexus-bg3 flex items-center justify-center relative overflow-hidden">
                  {deal.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={deal.primaryImageUrl} alt={deal.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity" />
                  ) : (
                    <span className="text-4xl opacity-20">🏙️</span>
                  )}
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <Badge variant="gold">{dealTypeLabel(deal.type)}</Badge>
                    {deal.riskGrade && <Badge variant="purple">Risk Grade {deal.riskGrade}</Badge>}
                    {deal.isFeatured && <Badge variant="amber">Featured</Badge>}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 border-t border-nexus">
                  <div className="text-[15px] font-semibold mb-0.5 group-hover:text-nexus-gold transition-colors">{deal.name}</div>
                  <div className="text-[11.5px] text-nexus-muted mb-3">
                    📍 {deal.propertyCity}{deal.propertyRegion ? `, ${deal.propertyRegion}` : ''} · {deal.chargeType.replace('_', ' ')}
                  </div>

                  {/* Key metrics grid */}
                  <div className="grid grid-cols-4 gap-px bg-nexus border border-nexus rounded-lg overflow-hidden mb-3">
                    {[
                      { label: 'APR', value: formatPercent(deal.investorApr), accent: true },
                      { label: 'LTV', value: formatPercent(deal.ltv, 0) },
                      { label: 'Term', value: `${deal.loanDurationMonths} mo` },
                      { label: 'Charge', value: deal.chargeType === 'FIRST_CHARGE' ? 'First' : 'Second', teal: true },
                    ].map(({ label, value, accent, teal }) => (
                      <div key={label} className="bg-nexus-bg3 p-2.5 text-center">
                        <div className="text-[9px] tracking-[0.8px] uppercase text-nexus-muted mb-1">{label}</div>
                        <div className={`font-mono text-[17px] font-medium ${accent ? 'text-nexus-gold' : teal ? 'text-nexus-teal' : ''}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
                  <div className="flex items-center justify-between text-[11.5px] text-nexus-muted mb-1.5">
                    <span>Funding progress</span>
                    <span className="font-mono">{formatCurrency(deal.currentRaised, 'GBP', true)} / {formatCurrency(deal.targetRaise, 'GBP', true)}</span>
                  </div>
                  <div className="h-1 bg-nexus-bg4 rounded-full overflow-hidden mb-3.5">
                    <div className="h-full bg-nexus-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9.5px] text-nexus-hint mb-0.5">Min. investment</div>
                      <div className="font-mono text-[13px]">{formatCurrency(deal.minimumInvestment)}</div>
                    </div>
                    <div className="px-4 py-2 bg-nexus-gold text-nexus-bg text-[12px] font-semibold rounded-lg group-hover:bg-nexus-gold2 transition-colors">
                      Review &amp; Invest
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
