// apps/investor/src/app/(portal)/deals/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, dealTypeLabel, fundingProgress } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getDealImageDisplayUrl } from '@/lib/storage'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getOpportunities(userId: string) {
  const profile = await prisma.investorProfile.findUnique({
    where: { userId },
    select: { tier: true },
  })
  const canSeeApprovedOnly = profile?.tier === 'PLATINUM' || profile?.tier === 'PREMIUM'

  const where: any = {
    isPortfolio: false,
    openForInvestment: true,
    visibleToInvestors: true,
    status: { in: ['LIVE', 'FUNDED', 'ACTIVE'] },
    ...(canSeeApprovedOnly ? {} : { approvedInvestorsOnly: false }),
  }

  const allDeals = await prisma.deal.findMany({
    where,
    include: {
      images: { where: { isPrimary: true, deletedAt: null }, take: 1 },
      investments: { where: { status: { not: 'PENDING' } }, select: { id: true } },
    },
  })

  // Fisher-Yates shuffle and take 5
  const shuffled = [...allDeals]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const deals = shuffled.slice(0, 5)

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
    primaryImageUrl: d.images[0] ? await getDealImageDisplayUrl(d.images[0].storageKey, 3600) : null,
  })))
}

export default async function InvestmentOpportunitiesPage() {
  const session = await getSession()
  const deals = await getOpportunities(session!.user.id)

  const avgApr = deals.length > 0 ? deals.reduce((s, d) => s + d.investorApr, 0) / deals.length : 0
  const avgLtv = deals.length > 0 ? deals.reduce((s, d) => s + d.ltv, 0) / deals.length : 0

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      {/* Header */}
      <div>
        <h1 className="font-serif text-[22px] mb-1">Investment Opportunities</h1>
        <p className="text-[13px] text-nexus-muted">
          Curated selection of senior secured real estate loans, updated regularly.
        </p>
      </div>

      {/* Stats */}
      {deals.length > 0 && (
        <div className="flex items-center gap-6">
          {[
            { label: 'Showing',        value: `${deals.length} of ${deals.length} live` },
            { label: 'Avg APR',        value: formatPercent(avgApr), accent: true },
            { label: 'Avg LTV',        value: formatPercent(avgLtv, 0) },
          ].map((s, i) => (
            <div key={i} className={i > 0 ? 'border-l border-nexus pl-6' : ''}>
              <div className="text-[9.5px] tracking-[1.2px] uppercase text-nexus-hint mb-1">{s.label}</div>
              <div className={`font-mono text-[19px] font-medium ${s.accent ? 'text-nexus-gold' : ''}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {deals.length === 0 ? (
        <div className="py-16 text-center text-nexus-muted">
          <div className="text-[32px] mb-3 opacity-20">◎</div>
          <div className="text-[14px] font-medium mb-1">No opportunities available right now</div>
          <div className="text-[12px]">Check back soon — new deals are added regularly.</div>
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
                    <img
                      src={deal.primaryImageUrl}
                      alt={deal.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9,22 9,12 15,12 15,22"/>
                      </svg>
                    </div>
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

                  {/* Key metrics */}
                  <div className="grid grid-cols-4 gap-px bg-nexus border border-nexus rounded-lg overflow-hidden mb-3">
                    {[
                      { label: 'APR',    value: formatPercent(deal.investorApr), accent: true },
                      { label: 'LTV',    value: formatPercent(deal.ltv, 0) },
                      { label: 'Term',   value: `${deal.loanDurationMonths} mo` },
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

      <p className="text-[11px] text-nexus-muted text-center mt-2">
        Showing a curated selection. Contact your relationship manager for the full deal pipeline.
      </p>
    </div>
  )
}
