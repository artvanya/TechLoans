// apps/investor/src/app/(portal)/auto-invest/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import { Panel, PanelHeader, MetricCard } from '@/components/ui/panel'
import { Badge } from '@/components/ui/badge'
import { AutoInvestForm } from '@/components/auto-invest/auto-invest-form'

export const dynamic = 'force-dynamic'

export default async function AutoInvestPage() {
  const session = await getSession()
  const userId = session!.user.id

  const rule = await prisma.autoInvestRule.findUnique({
    where: { userId },
    include: {
      matchLog: {
        orderBy: { matchedAt: 'desc' },
        take: 15,
        include: { rule: { select: { userId: true } } },
      },
    },
  })

  const dealIds = rule?.matchLog.map((m) => m.dealId) ?? []
  const deals = dealIds.length > 0 ? await prisma.deal.findMany({
    where: { id: { in: dealIds } },
    select: { id: true, name: true, investorApr: true, ltv: true },
  }) : []
  const dealMap = Object.fromEntries(deals.map((d) => [d.id, d]))

  const totalDeployed = rule?.matchLog
    .filter((m) => m.matched)
    .reduce((s, m) => s + Number(m.amountDeployed ?? 0), 0) ?? 0

  const matchedCount = rule?.matchLog.filter((m) => m.matched).length ?? 0
  const skippedCount = rule?.matchLog.filter((m) => !m.matched).length ?? 0

  const avgApr = matchedCount > 0 && rule
    ? rule.matchLog.filter((m) => m.matched).reduce((s, m) => {
        const deal = dealMap[m.dealId]
        return s + (deal ? Number(deal.investorApr) : 0)
      }, 0) / matchedCount
    : 0

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Auto-Deployed (Total)" value={formatCurrency(totalDeployed)} delta={{ value: `${matchedCount} deals matched`, direction: 'up' }} />
        <MetricCard label="Avg APR Achieved" value={avgApr > 0 ? formatPercent(avgApr) : '—'} sub="On auto-deployed positions" />
        <MetricCard label="Reserve Cash" value={rule ? formatCurrency(Number(rule.reserveCash)) : '£0'} sub="Never auto-invested · liquidity buffer" />
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4 items-start">
        <AutoInvestForm initialRule={rule ? {
          status: rule.status,
          minApr: Number(rule.minApr),
          maxLtv: Number(rule.maxLtv),
          minDurationMonths: rule.minDurationMonths,
          maxDurationMonths: rule.maxDurationMonths,
          maxPerDeal: Number(rule.maxPerDeal),
          reserveCash: Number(rule.reserveCash),
          permittedRiskGrades: rule.permittedRiskGrades,
          permittedLoanTypes: rule.permittedLoanTypes,
          permittedRegions: rule.permittedRegions,
          maxPerRegionPct: rule.maxPerRegionPct ? Number(rule.maxPerRegionPct) : null,
          maxPerTypePct: rule.maxPerTypePct ? Number(rule.maxPerTypePct) : null,
          reinvestRepayments: rule.reinvestRepayments,
        } : null} />

        <div className="flex flex-col gap-4">
          {/* Match log */}
          <Panel>
            <PanelHeader title="Engine Activity Log" subtitle="Deals evaluated by auto-invest engine" />
            {!rule || rule.matchLog.length === 0 ? (
              <div className="px-5 py-6 text-center text-[12px] text-nexus-muted">
                No activity yet. Enable auto-invest and save rules to begin.
              </div>
            ) : (
              <table className="w-full">
                <thead><tr>
                  {['Deal', 'Result', 'Amount', 'Date'].map(h => (
                    <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rule.matchLog.map((m) => {
                    const deal = dealMap[m.dealId]
                    return (
                      <tr key={m.id} className="border-b border-nexus last:border-0">
                        <td className="px-4 py-3">
                          <div className="text-[12.5px] font-medium">{deal?.name ?? 'Deal'}</div>
                          {deal && <div className="text-[10.5px] text-nexus-muted mt-0.5">{formatPercent(Number(deal.investorApr))} APR · LTV {formatPercent(Number(deal.ltv), 0)}</div>}
                          {m.skipReason && <div className="text-[10.5px] text-nexus-amber mt-0.5">{m.skipReason}</div>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={m.matched ? 'green' : 'red'}>{m.matched ? 'Matched' : 'Skipped'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-nexus-teal">
                          {m.matched && m.amountDeployed ? formatCurrency(Number(m.amountDeployed)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-[11px] text-nexus-muted">{formatDate(m.matchedAt.toISOString(), 'short')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          {/* How it works */}
          <Panel>
            <div className="p-5">
              <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">How Auto-Invest Works</div>
              <p className="text-[12.5px] text-nexus-muted leading-[1.8]">
                When a new deal is published, the engine evaluates it against your rules. If all criteria are met and sufficient balance is available above your reserve, capital is deployed automatically.
              </p>
              <p className="text-[12.5px] text-nexus-muted leading-[1.8] mt-3">
                Diversification logic prevents over-concentration in any single loan type or geography. All auto-invested positions appear in your portfolio immediately.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
