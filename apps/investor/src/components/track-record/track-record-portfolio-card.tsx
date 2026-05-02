'use client'
// apps/investor/src/components/track-record/track-record-portfolio-card.tsx

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate, dealTypeLabel, chargeTypeLabel } from '@/lib/utils'

export type TrackRecordDealPayload = {
  id: string
  name: string
  internalId: string
  imageUrl: string | null
  status: string
  type: string
  propertyType: string | null
  propertyCity: string | null
  propertyRegion: string | null
  propertyAddress: string | null
  propertyPostcode: string | null
  propertyDescription: string | null
  collateralSummary: string | null
  summary: string | null
  underwritingSummary: string | null
  loanAmount: number
  propertyValuation: number
  ltv: number
  investorApr: number
  loanDurationMonths: number
  chargeType: string
  repaymentType: string
  riskGrade: string | null
  targetRaise: number
  currentRaised: number
  originationDate: string | null
  maturityDate: string | null
  actualClosingDate: string | null
  actualDurationMonths: number | null
  borrowerType: string | null
  borrowerPurpose: string | null
  exitRoute: string | null
}

function repaymentLabel(t: string) {
  return t.replace(/_/g, ' ')
}

export function TrackRecordPortfolioCard({ deal }: { deal: TrackRecordDealPayload }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const statusLabel: Record<string, string> = {
    ACTIVE: 'Active',
    REPAID: 'Repaid',
    CLOSED: 'Closed',
    DEFAULTED: 'In recovery',
    LIVE: 'Live',
    FUNDED: 'Funded',
    DRAFT: 'Draft',
    UNDER_REVIEW: 'Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  }
  const statusColor: Record<string, string> = {
    ACTIVE: '#2CC89A',
    REPAID: '#5B9CF6',
    CLOSED: '#5B9CF6',
    DEFAULTED: '#E05C5C',
    LIVE: '#2CC89A',
    FUNDED: '#BFA063',
    DRAFT: '#7C7A74',
    UNDER_REVIEW: '#E8A030',
    APPROVED: '#5B9CF6',
    REJECTED: '#E05C5C',
  }
  const color = statusColor[deal.status] ?? '#7C7A74'
  const label = statusLabel[deal.status] ?? deal.status

  const headline =
    `${deal.propertyType ?? 'Property'}${deal.propertyCity ? ` · ${deal.propertyCity}` : ''}`

  return (
    <div className="relative bg-nexus-bg2 border border-nexus rounded-xl flex flex-col h-full min-h-0 w-full flex-1">
      {/* Preview — opens in-card dossier */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        tabIndex={open ? -1 : 0}
        className="text-left w-full flex flex-col flex-1 min-h-0 h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/45 focus-visible:ring-inset rounded-xl overflow-hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`track-deal-dossier-${deal.id}`}
      >
        <div className="h-[160px] bg-[#0D0E11] relative shrink-0 pointer-events-none overflow-hidden rounded-t-xl">
          {deal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deal.imageUrl}
              alt={deal.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
              </svg>
            </div>
          )}
          <div
            className="absolute left-2.5 top-2.5 z-[1] max-w-[min(100%-1.25rem,calc(100%-3.5rem))] text-[9.5px] font-bold tracking-wide px-2 py-1 rounded-md border whitespace-nowrap truncate"
            style={{ background: `${color}22`, color, borderColor: `${color}44` }}
          >
            {label.toUpperCase()}
          </div>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
            <span className="text-[10px] text-nexus-muted bg-nexus-bg/80 backdrop-blur px-2 py-1 rounded border border-nexus truncate">
              {deal.name}
            </span>
            <span
              className="shrink-0 w-8 h-8 rounded-lg border border-nexus/80 flex items-center justify-center text-nexus-gold2 bg-nexus-bg/85 backdrop-blur"
              aria-hidden
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </span>
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1 min-h-0 gap-2.5">
          <div className="shrink-0">
            <div className="text-[13.5px] font-semibold mb-0.5 text-nexus-text">{headline}</div>
            {deal.propertyRegion ? (
              <div className="text-[11px] text-nexus-muted">{deal.propertyRegion}</div>
            ) : (
              <div className="text-[11px] text-nexus-muted invisible select-none" aria-hidden>
                &nbsp;
              </div>
            )}
          </div>

          {/* Same vertical slot on every card so metrics + dossier row line up in the grid */}
          <div className="shrink-0 min-h-[5.25rem]">
            {deal.propertyDescription ? (
              <div className="relative rounded-lg bg-white/[0.02] ring-1 ring-white/[0.04] px-2.5 py-2 -mx-0.5 h-full min-h-[5.25rem]">
                <p className="text-[11.5px] text-nexus-muted leading-relaxed m-0 line-clamp-2">
                  {deal.propertyDescription}
                </p>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-11 rounded-b-lg bg-gradient-to-t from-nexus-bg2 via-nexus-bg2/85 to-transparent"
                />
              </div>
            ) : null}
          </div>

          <div className="flex-1 min-h-[1px] min-w-0" aria-hidden />

          <div className="shrink-0 flex flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'Loan',
                  value:
                    deal.loanAmount >= 1000
                      ? `£${(deal.loanAmount / 1000).toFixed(deal.loanAmount % 1000 === 0 ? 0 : 1)}k`
                      : deal.loanAmount > 0
                        ? formatCurrency(deal.loanAmount, 'GBP', true)
                        : '—',
                },
                { label: 'LTV', value: deal.ltv > 0 ? `${deal.ltv.toFixed(0)}%` : '—' },
                { label: 'Rate', value: deal.investorApr > 0 ? `${deal.investorApr.toFixed(1)}%` : '—' },
              ].map(({ label: L, value }) => (
                <div key={L} className="bg-white/[0.03] rounded-md py-2 px-1.5 text-center">
                  <div className="text-[13px] font-semibold font-mono text-nexus-text">{value}</div>
                  <div className="text-[9.5px] text-nexus-hint uppercase tracking-wide mt-0.5">{L}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-nexus/60">
              <span className="text-[9px] uppercase tracking-[0.2em] text-nexus-gold/90 font-medium">
                Case dossier
              </span>
              <span className="text-[11px] text-nexus-muted flex items-center gap-1.5 shrink-0">
                <span className="text-nexus-gold">Open</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-nexus-gold opacity-90" aria-hidden>
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Full detail — glass layer over the card (no accordion) */}
      {open && (
        <div
          id={`track-deal-dossier-${deal.id}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'absolute inset-0 z-40 flex flex-col rounded-xl overflow-hidden isolate',
            'bg-nexus-bg2 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.65)]',
            'animate-fadeIn',
          )}
        >
          <header className="shrink-0 flex items-start justify-between gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-gradient-to-b from-nexus-bg3/90 to-transparent">
            <div className="min-w-0 pt-0.5">
              <p className="text-[9px] uppercase tracking-[0.22em] text-nexus-gold/90 mb-1">Track record</p>
              <h2 id={titleId} className="text-[14px] font-semibold text-nexus-text leading-snug truncate">
                {headline}
              </h2>
              <p className="text-[10px] text-nexus-muted font-mono mt-1 truncate">{deal.internalId}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                'shrink-0 w-9 h-9 rounded-lg border border-nexus flex items-center justify-center',
                'text-nexus-muted hover:text-nexus-text hover:border-nexus-gold/35 hover:bg-nexus-gold/[0.06]',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/50',
              )}
              aria-label="Close case dossier"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 4l8 8M12 4L4 12" />
              </svg>
            </button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-5 text-[12px] text-nexus-muted">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <DetailRow k="Deal ref" v={deal.internalId} mono />
              <DetailRow k="Structure" v={dealTypeLabel(deal.type)} />
              <DetailRow k="Charge" v={chargeTypeLabel(deal.chargeType)} />
              <DetailRow k="Repayment" v={repaymentLabel(deal.repaymentType)} />
              <DetailRow k="Term" v={`${deal.loanDurationMonths} months (scheduled)`} />
              {deal.riskGrade && <DetailRow k="Risk grade" v={deal.riskGrade} />}
              <DetailRow k="Valuation" v={formatCurrency(deal.propertyValuation)} />
              <DetailRow
                k="Target / raised"
                v={`${formatCurrency(deal.targetRaise)} / ${formatCurrency(
                  (deal.status === 'REPAID' || deal.status === 'CLOSED') &&
                    deal.currentRaised < deal.targetRaise
                    ? deal.targetRaise
                    : deal.currentRaised
                )}`}
              />
              {deal.originationDate && <DetailRow k="Originated" v={formatDate(deal.originationDate, 'medium')} />}
              {deal.maturityDate && <DetailRow k="Maturity" v={formatDate(deal.maturityDate, 'medium')} />}
              {deal.actualClosingDate && <DetailRow k="Closed" v={formatDate(deal.actualClosingDate, 'medium')} />}
              {deal.actualDurationMonths != null && (
                <DetailRow k="Actual duration" v={`${deal.actualDurationMonths} months`} />
              )}
            </div>

            {(deal.propertyAddress || deal.propertyPostcode) && (
              <div>
                <div className="text-[9px] uppercase tracking-wider text-nexus-hint mb-1.5">Address</div>
                <div className="text-nexus-text leading-relaxed text-[11.5px]">
                  {[deal.propertyAddress, deal.propertyCity, deal.propertyRegion, deal.propertyPostcode].filter(Boolean).join(', ')}
                </div>
              </div>
            )}

            {deal.propertyDescription && (
              <DossierBlock title="Property" tone="gold">
                <p className="text-nexus-text leading-relaxed m-0 whitespace-pre-wrap text-[11.5px]">{deal.propertyDescription}</p>
              </DossierBlock>
            )}

            {deal.collateralSummary && (
              <DossierBlock title="Collateral">
                <p className="text-nexus-text leading-relaxed m-0 whitespace-pre-wrap text-[11.5px]">{deal.collateralSummary}</p>
              </DossierBlock>
            )}

            {deal.summary && (
              <DossierBlock title="Summary">
                <p className="text-nexus-text leading-relaxed m-0 whitespace-pre-wrap text-[11.5px]">{deal.summary}</p>
              </DossierBlock>
            )}

            {deal.underwritingSummary && (
              <DossierBlock title="Underwriting">
                <p className="text-nexus-text leading-relaxed m-0 whitespace-pre-wrap text-[11.5px]">{deal.underwritingSummary}</p>
              </DossierBlock>
            )}

            {deal.exitRoute && (
              <DossierBlock title="Exit">
                <p className="text-nexus-text leading-relaxed m-0 text-[11.5px]">{deal.exitRoute}</p>
              </DossierBlock>
            )}

            {(deal.borrowerType || deal.borrowerPurpose) && (
              <div className="pt-1 border-t border-nexus text-[11px] text-nexus-muted pb-1">
                {deal.borrowerType && <span className="text-nexus-text">{deal.borrowerType}</span>}
                {deal.borrowerType && deal.borrowerPurpose && <span> · </span>}
                {deal.borrowerPurpose && <span className="text-nexus-text">{deal.borrowerPurpose}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DossierBlock({
  title,
  children,
  tone,
}: {
  title: string
  children: ReactNode
  tone?: 'gold'
}) {
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-3 ring-1 ring-inset',
        tone === 'gold' ? 'bg-nexus-gold/[0.04] ring-nexus-gold/15' : 'bg-white/[0.02] ring-white/[0.06]',
      )}
    >
      <div
        className={cn(
          'text-[9px] uppercase tracking-[0.18em] mb-2 font-medium',
          tone === 'gold' ? 'text-nexus-gold/95' : 'text-nexus-hint',
        )}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function DetailRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-nexus-hint">{k}</span>
      <span className={cn('text-nexus-text font-medium text-[11.5px]', mono && 'font-mono text-[11px]')}>{v}</span>
    </div>
  )
}
