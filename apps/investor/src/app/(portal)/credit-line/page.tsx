// apps/investor/src/app/(portal)/credit-line/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import { Panel, PanelHeader, MetricCard } from '@/components/ui/panel'
import { Badge } from '@/components/ui/badge'
import { CreditLineForm } from '@/components/credit-line/credit-line-form'

export const dynamic = 'force-dynamic'

export default async function CreditLinePage() {
  const session = await getSession()
  const userId = session!.user.id

  const creditLine = await prisma.creditLine.findUnique({ where: { userId } })
  const utilisedPct = creditLine && Number(creditLine.approvedLimit) > 0
    ? (Number(creditLine.utilised) / Number(creditLine.approvedLimit)) * 100
    : 0

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Approved Credit Limit"
          value={creditLine ? formatCurrency(Number(creditLine.approvedLimit)) : '—'}
          sub={creditLine?.status === 'ACTIVE' ? 'Active · revolving' : creditLine ? `Status: ${creditLine.status}` : 'No credit line'}
        />
        <MetricCard
          label="Currently Drawn"
          value={creditLine ? formatCurrency(Number(creditLine.utilised)) : '—'}
          delta={creditLine ? { value: `${utilisedPct.toFixed(0)}% utilisation`, direction: 'neutral' } : undefined}
        />
        <MetricCard
          label="Available to Draw"
          value={creditLine ? formatCurrency(Number(creditLine.approvedLimit) - Number(creditLine.utilised)) : '—'}
          sub={creditLine?.expiresAt ? `Expires ${formatDate(creditLine.expiresAt.toISOString(), 'short')}` : undefined}
        />
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          {/* Utilisation bar */}
          {creditLine && (
            <Panel>
              <div className="p-5">
                <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">Credit Line Utilisation</div>
                <div className="flex items-center justify-between text-[12px] text-nexus-muted mb-2">
                  <span>{formatCurrency(Number(creditLine.utilised))} drawn of {formatCurrency(Number(creditLine.approvedLimit))}</span>
                  <span className="font-mono">{utilisedPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-nexus-bg4 rounded-full overflow-hidden">
                  <div className="h-full bg-nexus-gold rounded-full transition-all" style={{ width: `${utilisedPct}%` }} />
                </div>
                <p className="text-[12.5px] text-nexus-muted mt-4 leading-[1.75]">
                  Your credit line allows the platform to draw capital from your approved limit on qualifying deals
                  without requiring per-deal manual approval. You retain full control over rules and limits at all times.
                </p>
              </div>
            </Panel>
          )}

          {/* Rules configuration */}
          {creditLine ? (
            <CreditLineForm creditLine={{
              status: creditLine.status,
              approvedLimit: Number(creditLine.approvedLimit),
              utilised: Number(creditLine.utilised),
              maxPerDeal: creditLine.maxPerDeal ? Number(creditLine.maxPerDeal) : null,
              maxPerMonth: creditLine.maxPerMonth ? Number(creditLine.maxPerMonth) : null,
              minApr: creditLine.minApr ? Number(creditLine.minApr) : null,
              maxLtv: creditLine.maxLtv ? Number(creditLine.maxLtv) : null,
              maxDurationMonths: creditLine.maxDurationMonths,
              permittedRiskGrades: creditLine.permittedRiskGrades,
              permittedLoanTypes: creditLine.permittedLoanTypes,
              autoDrawEnabled: creditLine.autoDrawEnabled,
              expiresAt: creditLine.expiresAt?.toISOString() ?? null,
            }} />
          ) : (
            <Panel>
              <div className="p-8 text-center">
                <div className="text-[28px] mb-3 opacity-20">◎</div>
                <div className="text-[14px] font-medium mb-2">No Credit Line Configured</div>
                <p className="text-[12.5px] text-nexus-muted leading-[1.75] max-w-md mx-auto mb-5">
                  A credit line allows the platform to automatically deploy your capital into qualifying deals
                  without manual approval per transaction. Contact your account manager to apply.
                </p>
                <a href="mailto:credit@nexusprivatecredit.com"
                  className="inline-block px-5 py-2.5 bg-nexus-gold text-nexus-bg text-[12.5px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors">
                  Apply for Credit Line
                </a>
              </div>
            </Panel>
          )}
        </div>

        {/* Right: How it works */}
        <div className="flex flex-col gap-4">
          <Panel>
            <div className="p-5">
              <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">How the Credit Line Works</div>
              {[
                { n: 1, title: 'You set the limit and rules', desc: 'Define maximum total exposure, per-deal caps, loan type restrictions, and minimum return thresholds.' },
                { n: 2, title: 'A qualifying deal is originated', desc: 'When a new deal matches your rules, the platform draws from your credit line and allocates your capital.' },
                { n: 3, title: 'You are notified immediately', desc: 'An instant notification confirms the draw, deal details, and expected return.' },
                { n: 4, title: 'Interest and principal repay normally', desc: 'Repayments credit your wallet. The credit line revolves — repaid capital becomes available to draw again.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-3 py-3 border-b border-nexus last:border-0">
                  <div className="w-6 h-6 rounded-full border border-nexus-gold text-nexus-gold text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
                  <div>
                    <div className="text-[12.5px] font-medium mb-1">{title}</div>
                    <div className="text-[11.5px] text-nexus-muted leading-[1.6]">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="bg-nexus-gold/[0.06] border border-nexus-gold/10 rounded-lg p-4">
            <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-gold mb-2">Capital Commitment</div>
            <p className="text-[12.5px] text-nexus-muted leading-[1.75]">
              A credit line is a contractual commitment to deploy capital on pre-agreed terms.
              Unused capacity does not generate returns. Maximising utilisation within your defined rules is
              the mechanism for optimising yield.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
