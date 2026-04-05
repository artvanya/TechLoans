// apps/admin/src/app/(admin)/deals/page.tsx
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SearchParams { status?: string; type?: string; region?: string; search?: string; portfolio?: string; investment?: string }

export default async function AdminDealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const showPortfolio  = params.portfolio === 'true'
  const showInvestment = params.investment === 'true'

  const where: any = {
    ...(showPortfolio  ? { isPortfolio: true } : {}),
    ...(showInvestment ? { isPortfolio: false, openForInvestment: true } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.region ? { propertyRegion: params.region } : {}),
    ...(params.search ? { OR: [
      { name: { contains: params.search, mode: 'insensitive' } },
      { internalId: { contains: params.search, mode: 'insensitive' } },
      { propertyCity: { contains: params.search, mode: 'insensitive' } },
    ]} : {}),
  }

  const [deals, stats, portfolioCount, investmentCount] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { investments: { select: { id: true } } },
    }),
    prisma.deal.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.deal.count({ where: { isPortfolio: true } }),
    prisma.deal.count({ where: { isPortfolio: false, openForInvestment: true } }),
  ])

  const statusCount = Object.fromEntries(stats.map(s => [s.status, s._count.id]))

  const statusColor: Record<string, string> = {
    LIVE: '#2CC89A', ACTIVE: '#2CC89A', FUNDED: '#BFA063', APPROVED: '#5B9CF6',
    UNDER_REVIEW: '#E8A030', DRAFT: '#7C7A74', REPAID: '#5B9CF6',
    DEFAULTED: '#E05C5C', REJECTED: '#E05C5C', CLOSED: '#7C7A74',
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Investments tab */}
        <a href="?investment=true"
          style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 500, border: `1px solid ${showInvestment ? '#2CC89A' : 'rgba(255,255,255,0.07)'}`, color: showInvestment ? '#2CC89A' : '#7C7A74', background: showInvestment ? 'rgba(44,200,154,0.06)' : 'transparent', textDecoration: 'none' }}>
          Investments {investmentCount > 0 && <span style={{ marginLeft: '4px', opacity: 0.7 }}>({investmentCount})</span>}
        </a>
        {/* Portfolio tab */}
        <a href="?portfolio=true"
          style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 500, border: `1px solid ${showPortfolio ? '#C4A355' : 'rgba(255,255,255,0.07)'}`, color: showPortfolio ? '#C4A355' : '#7C7A74', background: showPortfolio ? 'rgba(196,163,85,0.06)' : 'transparent', textDecoration: 'none' }}>
          Portfolio {portfolioCount > 0 && <span style={{ marginLeft: '4px', opacity: 0.7 }}>({portfolioCount})</span>}
        </a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
        {/* Status tabs */}
        {[null, 'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'LIVE', 'ACTIVE', 'FUNDED', 'REPAID', 'REJECTED'].map((s) => {
          const count = s ? (statusCount[s] ?? 0) : deals.length
          const active = !showPortfolio && !showInvestment && (params.status ?? null) === s
          return (
            <a key={s ?? 'all'} href={s ? `?status=${s}` : '/deals'}
              style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 500, border: `1px solid ${active ? '#C4A355' : 'rgba(255,255,255,0.07)'}`, color: active ? '#C4A355' : '#7C7A74', background: active ? 'rgba(196,163,85,0.06)' : 'transparent', textDecoration: 'none', transition: 'all 0.15s' }}>
              {s ?? 'All'} {count > 0 && <span style={{ marginLeft: '4px', opacity: 0.7 }}>({count})</span>}
            </a>
          )
        })}
        <Link href="/deals/create" style={{ marginLeft: 'auto', background: '#C4A355', color: '#0A0A0C', padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
          + New Deal
        </Link>
      </div>

      {/* Table */}
      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Deal / ID', 'Type', 'Location', 'Loan', 'LTV', 'APR', 'Funding', 'Status', 'Visibility', 'Updated', 'Actions'].map((h) => (
                  <th key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3E3D3B', fontWeight: 500, padding: '9px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 && (
                <tr><td colSpan={11} style={{ padding: '32px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No deals match the current filter</td></tr>
              )}
              {deals.map((deal) => {
                const pct = Number(deal.targetRaise) > 0 ? Math.round(Number(deal.currentRaised) / Number(deal.targetRaise) * 100) : 0
                return (
                  <tr key={deal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{deal.name}</span>
                        {(deal as any).isPortfolio && (
                          <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '1px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(196,163,85,0.12)', color: '#C4A355', flexShrink: 0 }}>
                            PORTFOLIO
                          </span>
                        )}
                        {!(deal as any).isPortfolio && deal.openForInvestment && (
                          <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '1px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(44,200,154,0.12)', color: '#2CC89A', flexShrink: 0 }}>
                            INVESTMENT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: '#7C7A74', fontFamily: "'DM Mono', monospace", marginTop: '2px' }}>{deal.internalId}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '11.5px', color: '#7C7A74' }}>{deal.type.replace(/_/g,' ')}</td>
                    <td style={{ padding: '12px 14px', fontSize: '11.5px', color: '#7C7A74' }}>{deal.propertyCity ?? '—'}</td>
                    <td style={{ padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>{formatCurrency(Number(deal.loanAmount), 'GBP', true)}</td>
                    <td style={{ padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: Number(deal.ltv) > 72 ? '#E05C5C' : '' }}>{formatPercent(Number(deal.ltv), 0)}</td>
                    <td style={{ padding: '12px 14px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#2CC89A' }}>{formatPercent(Number(deal.investorApr))}</td>
                    <td style={{ padding: '12px 14px', minWidth: '100px' }}>
                      <div style={{ fontSize: '10px', color: '#7C7A74', marginBottom: '3px' }}>{pct}%</div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#BFA063', borderRadius: '2px', width: `${pct}%` }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: `${statusColor[deal.status] ?? '#7C7A74'}18`, color: statusColor[deal.status] ?? '#7C7A74', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>
                        {deal.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: deal.visibleToInvestors ? 'rgba(44,200,154,0.1)' : 'rgba(255,255,255,0.05)', color: deal.visibleToInvestors ? '#2CC89A' : '#7C7A74', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>
                        {deal.visibleToInvestors ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '10.5px', color: '#7C7A74', fontFamily: "'DM Mono', monospace" }}>{formatDate(deal.updatedAt.toISOString(), 'short')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <Link href={`/deals/${deal.id}`} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#E8E6DF', textDecoration: 'none' }}>Edit</Link>
                        {deal.status === 'APPROVED' && (
                          <form action={async () => {
                            'use server'
                            const { prisma: db } = await import('@nexus/db')
                            await db.deal.update({ where: { id: deal.id }, data: { status: 'LIVE', visibleToInvestors: true, openForInvestment: true, publishedAt: new Date() } })
                          }}>
                            <button style={{ background: 'rgba(196,163,85,0.1)', color: '#C4A355', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Publish</button>
                          </form>
                        )}
                        {deal.status === 'UNDER_REVIEW' && (
                          <form action={async () => {
                            'use server'
                            const { prisma: db } = await import('@nexus/db')
                            await db.deal.update({ where: { id: deal.id }, data: { status: 'APPROVED' } })
                          }}>
                            <button style={{ background: 'rgba(44,200,154,0.1)', color: '#2CC99A', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Approve</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
