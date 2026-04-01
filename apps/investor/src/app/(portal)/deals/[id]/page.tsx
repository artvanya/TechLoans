// apps/investor/src/app/(portal)/deals/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate, dealTypeLabel, chargeTypeLabel, riskGradeLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getSignedDownloadUrl } from '@/lib/storage'
import { InvestPanel } from '@/components/deals/invest-panel'

export const dynamic = 'force-dynamic'

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()

  const deal = await prisma.deal.findFirst({
    where: { id: (await params).id, visibleToInvestors: true, status: { in: ['LIVE', 'FUNDED', 'ACTIVE'] } },
    include: {
      images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      documents: { where: { deletedAt: null, isInternal: false }, select: { id: true, category: true, fileName: true, uploadedAt: true } },
      investments: { where: { status: { not: 'PENDING' } }, select: { id: true } },
    },
  })

  if (!deal) notFound()

  const imagesWithUrls = await Promise.all(
    deal.images.map(async (img) => ({
      id: img.id, isPrimary: img.isPrimary, sortOrder: img.sortOrder,
      url: await getSignedDownloadUrl(img.storageKey, 3600).catch(() => ''),
    }))
  )

  // Check if user already invested
  const existingInvestment = await prisma.investment.findFirst({
    where: { userId: session!.user.id, dealId: deal.id, status: { not: 'PENDING' } },
    select: { id: true, amount: true },
  })

  const investorProfile = await prisma.investorProfile.findUnique({
    where: { userId: session!.user.id },
    include: { wallets: true },
  })

  const availableBalance = investorProfile?.wallets.reduce((s, w) => s + Number(w.balance), 0) ?? 0
  const remaining = Number(deal.targetRaise) - Number(deal.currentRaised)
  const progress = Math.round(Number(deal.currentRaised) / Number(deal.targetRaise) * 100)

  const docCategoryLabels: Record<string, string> = {
    VALUATION_REPORT: 'Valuation Report',
    LEGAL_PACK: 'Legal Pack',
    BORROWER_SUMMARY: 'Borrower Summary',
    COLLATERAL_DOCS: 'Collateral Documents',
    TERM_SHEET: 'Term Sheet',
    OTHER: 'Supporting Document',
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      {/* Deal header */}
      <div className="bg-nexus-bg2 border border-nexus rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex gap-2 mb-2.5">
              <Badge variant="gold">{dealTypeLabel(deal.type)}</Badge>
              {deal.riskGrade && <Badge variant="purple">Risk Grade {deal.riskGrade}</Badge>}
              {deal.isFeatured && <Badge variant="amber">Featured</Badge>}
              <Badge status={deal.status}>{deal.status}</Badge>
            </div>
            <h1 className="font-serif text-[24px] tracking-tight mb-1">{deal.name}</h1>
            <p className="text-[13px] text-nexus-muted">
              📍 {deal.propertyCity}{deal.propertyRegion ? `, ${deal.propertyRegion}` : ''}
              {deal.propertyPostcode ? ` · ${deal.propertyPostcode}` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-nexus-muted mb-1">Funding progress</div>
            <div className="font-mono text-[13px]">{progress}% funded</div>
            <div className="w-32 h-1 bg-nexus-bg4 rounded mt-1.5 overflow-hidden">
              <div className="h-full bg-nexus-gold rounded" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-6 gap-px bg-nexus border border-nexus rounded-lg overflow-hidden">
          {[
            { label: 'APR', value: formatPercent(Number(deal.investorApr)), accent: true },
            { label: 'LTV', value: formatPercent(Number(deal.ltv), 0) },
            { label: 'Loan Size', value: formatCurrency(Number(deal.loanAmount), 'GBP', true) },
            { label: 'Duration', value: `${deal.loanDurationMonths} mo` },
            { label: 'Min. Invest', value: formatCurrency(Number(deal.minimumInvestment)) },
            { label: 'Risk Grade', value: deal.riskGrade ?? '—', teal: deal.riskGrade === 'A' || deal.riskGrade === 'B' },
          ].map(({ label, value, accent, teal }) => (
            <div key={label} className="bg-nexus-bg3 py-3.5 text-center">
              <div className="text-[9px] tracking-[1px] uppercase text-nexus-muted mb-1.5">{label}</div>
              <div className={`font-mono text-[19px] font-medium ${accent ? 'text-nexus-gold' : teal ? 'text-nexus-teal' : ''}`}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-5 items-start">
        {/* Left: content sections */}
        <div className="flex flex-col gap-4">

          {/* Property images */}
          {imagesWithUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imagesWithUrls.slice(0, 3).map((img) => (
                <div key={img.id} className={`rounded-lg overflow-hidden border ${img.isPrimary ? 'border-nexus-gold col-span-2 row-span-2' : 'border-nexus'}`}
                  style={{ aspectRatio: '16/10' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Section helper */}
          {[
            { title: 'Property & Collateral', content: (
              <>
                <p className="text-[13px] text-nexus-muted leading-[1.8] mb-4">{deal.propertyDescription ?? 'No description available.'}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { l: 'Valuation', v: formatCurrency(Number(deal.propertyValuation)) },
                    { l: 'Valuation Source', v: deal.valuationSource ?? '—' },
                    { l: 'Legal Charge', v: chargeTypeLabel(deal.chargeType), teal: true },
                    { l: 'Exit Route', v: deal.exitRoute ?? '—' },
                  ].map(({ l, v, teal }) => (
                    <div key={l} className="bg-nexus-bg3 rounded-lg p-3">
                      <div className="text-[9.5px] uppercase tracking-[1px] text-nexus-hint mb-1">{l}</div>
                      <div className={`text-[13px] font-medium ${teal ? 'text-nexus-teal' : ''}`}>{v}</div>
                    </div>
                  ))}
                </div>
              </>
            )},
            { title: 'Borrower Profile', content: (
              <p className="text-[13px] text-nexus-muted leading-[1.8]">{deal.borrowerPurpose ?? 'Borrower information available upon investment confirmation.'}</p>
            )},
            { title: 'Investment Case', content: (
              <p className="text-[13px] text-nexus-muted leading-[1.8]">{deal.underwritingSummary ?? 'Underwriting summary not yet published.'}</p>
            )},
            { title: 'Risk Analysis', content: (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-nexus-bg3 rounded-lg p-3">
                  <div className="text-[9.5px] uppercase tracking-[1px] text-nexus-hint mb-2">Key Strengths</div>
                  <pre className="text-[12px] text-nexus-muted leading-[1.7] whitespace-pre-wrap font-sans">{deal.keyStrengths ?? '—'}</pre>
                </div>
                <div className="bg-nexus-bg3 rounded-lg p-3">
                  <div className="text-[9.5px] uppercase tracking-[1px] text-nexus-hint mb-2">Key Risks</div>
                  <pre className="text-[12px] text-nexus-muted leading-[1.7] whitespace-pre-wrap font-sans">{deal.keyRisks ?? '—'}</pre>
                </div>
              </div>
            )},
          ].map(({ title, content }) => (
            <section key={title} className="bg-nexus-bg2 border border-nexus rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4 text-[10px] tracking-[1.5px] uppercase text-nexus-gold">
                <span>{title}</span>
                <div className="flex-1 h-px bg-nexus-gold/20" />
              </div>
              {content}
            </section>
          ))}

          {/* Downside protection — mandatory */}
          <section className="bg-nexus-bg3 border border-nexus2 rounded-lg p-5">
            <div className="text-[10px] tracking-[2px] uppercase text-nexus-gold mb-4">
              Downside Protection · What Happens if the Borrower Defaults
            </div>
            {deal.downsideProtection ? (
              <p className="text-[13px] text-nexus-muted leading-[1.8] mb-4">{deal.downsideProtection}</p>
            ) : null}
            {[
              { n: 1, title: 'Formal Default Notice Issued', desc: 'Upon missed payment or covenant breach, Nexus issues a formal demand. A 14-day cure period applies.' },
              { n: 2, title: 'Legal Enforcement Commences', desc: 'Our appointed legal counsel initiates enforcement under the registered charge. As first-charge holder, Nexus has priority over all creditors.' },
              { n: 3, title: 'LPA Receiver Appointed', desc: 'An LPA receiver takes control of the property. This process typically completes within 4–8 weeks under UK law.' },
              { n: 4, title: 'Property Sold', desc: 'The property is sold on the open market or at auction. Conservative LTV structuring ensures the loan is covered even at a material discount to valuation.' },
              { n: 5, title: 'Investor Principal Returned First', desc: 'From sale proceeds, investor principal is repaid in full before any residual returns to the borrower. Default interest accrues during enforcement.' },
              { n: 6, title: 'Recovery Completed', desc: `Historical recovery rate: 100% across 2 default events. Average recovery time: ${deal.recoveryTimeMonths ?? 5} months.` },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-3.5 py-3 border-b border-nexus last:border-0">
                <div className="w-7 h-7 rounded-full border border-nexus-gold text-nexus-gold text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {n}
                </div>
                <div>
                  <div className="text-[13px] font-semibold mb-1">{title}</div>
                  <div className="text-[12px] text-nexus-muted leading-[1.6]">{desc}</div>
                </div>
              </div>
            ))}
            {deal.scenarioNote && (
              <div className="mt-4 bg-nexus-gold/[0.06] border border-nexus-gold/10 rounded-lg p-3.5">
                <div className="text-[11px] text-nexus-gold mb-1">Stress-Test Scenario</div>
                <div className="text-[12px] text-nexus-muted">{deal.scenarioNote}</div>
              </div>
            )}
          </section>

          {/* Documents */}
          {deal.documents.length > 0 && (
            <section className="bg-nexus-bg2 border border-nexus rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4 text-[10px] tracking-[1.5px] uppercase text-nexus-gold">
                <span>Diligence Documents</span>
                <div className="flex-1 h-px bg-nexus-gold/20" />
              </div>
              <div className="space-y-0">
                {deal.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 py-3 border-b border-nexus last:border-0">
                    <div className="w-8 h-8 bg-nexus-bg3 border border-nexus rounded-lg flex items-center justify-center text-sm flex-shrink-0">📄</div>
                    <div className="flex-1">
                      <div className="text-[12.5px] font-medium">{docCategoryLabels[doc.category] ?? doc.category}</div>
                      <div className="text-[10.5px] text-nexus-muted mt-0.5">{formatDate(doc.uploadedAt.toISOString(), 'medium')}</div>
                    </div>
                    <span className="text-[11px] text-nexus-muted px-2 py-1 border border-nexus rounded">Available post-investment</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: invest panel (client component) */}
        <InvestPanel
          deal={{
            id: deal.id,
            name: deal.name,
            investorApr: Number(deal.investorApr),
            loanDurationMonths: deal.loanDurationMonths,
            minimumInvestment: Number(deal.minimumInvestment),
            openForInvestment: deal.openForInvestment,
            riskGrade: deal.riskGrade,
            chargeType: deal.chargeType,
            maturityDate: deal.maturityDate?.toISOString() ?? null,
            remaining,
          }}
          availableBalance={availableBalance}
          kycApproved={session!.user.kycStatus === 'APPROVED'}
          existingInvestment={existingInvestment ? { id: existingInvestment.id, amount: Number(existingInvestment.amount) } : null}
        />
      </div>
    </div>
  )
}
