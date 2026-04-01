// apps/admin/src/app/(admin)/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const session = await getSession()

  const [dealStats, investorCount, payoutsMonth, auditRecent, kycQueue, alerts] = await Promise.all([
    prisma.deal.groupBy({ by: ['status'], _count: { id: true }, _sum: { currentRaised: true } }),
    prisma.user.count({ where: { role: 'INVESTOR', isActive: true } }),
    prisma.payout.aggregate({ where: { status: 'SCHEDULED', scheduledDate: { gte: new Date(new Date().setDate(1)) } }, _sum: { amount: true }, _count: true }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { actor: { select: { email: true } } } }),
    prisma.kycCase.count({ where: { status: { in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] } } }),
    prisma.deal.findMany({ where: { status: 'UNDER_REVIEW' }, select: { id: true, name: true, ltv: true, internalId: true, updatedAt: true }, take: 5, orderBy: { updatedAt: 'desc' } }),
  ])

  const activeAUM = dealStats.filter(d => ['LIVE','ACTIVE','FUNDED'].includes(d.status)).reduce((s, d) => s + Number(d._sum.currentRaised ?? 0), 0)
  const pipelineCount = dealStats.filter(d => ['DRAFT','UNDER_REVIEW','APPROVED'].includes(d.status)).reduce((s, d) => s + d._count.id, 0)
  const activeLoans = dealStats.filter(d => ['LIVE','ACTIVE'].includes(d.status)).reduce((s, d) => s + d._count.id, 0)

  const actionColors: Record<string, string> = {
    CREATE: '#5B9CF6', UPDATE: '#E8A030', STATUS_CHANGE: '#9D8DF7',
    APPROVE: '#2CC89A', REJECT: '#E05C5C', LOGIN: '#BFA063',
    UPLOAD: '#5B9CF6', PAYOUT_RUN: '#2CC89A', KYC_APPROVE: '#2CC89A', KYC_REJECT: '#E05C5C',
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px', padding: '0' }}>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: 'Platform AUM', value: formatCurrency(activeAUM, 'GBP', true) },
          { label: 'Active Investors', value: investorCount.toString() },
          { label: 'Deals in Pipeline', value: pipelineCount.toString() },
          { label: 'Payouts This Month', value: formatCurrency(Number(payoutsMonth._sum.amount ?? 0)) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, letterSpacing: '-1px' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Alerts */}
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600 }}>⚠ Active Alerts</div>
            <div style={{ fontSize: '10px', color: '#7C7A74' }}>{alerts.length + kycQueue} items</div>
          </div>
          <div style={{ padding: '0 16px' }}>
            {kycQueue > 0 && (
              <div style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ background: 'rgba(232,160,48,0.1)', color: '#E8A030', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', flexShrink: 0 }}>KYC</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{kycQueue} investor{kycQueue > 1 ? 's' : ''} awaiting KYC review</div>
                  <div style={{ fontSize: '10.5px', color: '#7C7A74', marginTop: '2px' }}>Documents submitted · pending compliance review</div>
                </div>
                <a href="/kyc" style={{ fontSize: '11px', color: '#C4A355', textDecoration: 'none', flexShrink: 0 }}>Review →</a>
              </div>
            )}
            {alerts.map((deal) => (
              <div key={deal.id} style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ background: 'rgba(196,163,85,0.1)', color: '#C4A355', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', flexShrink: 0 }}>DEAL</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{deal.name}</div>
                  <div style={{ fontSize: '10.5px', color: '#7C7A74', marginTop: '2px' }}>
                    Under review · LTV {Number(deal.ltv).toFixed(1)}% · {deal.internalId}
                    {Number(deal.ltv) > 72 && ' · ⚠ LTV exceeds policy'}
                  </div>
                </div>
                <a href={`/deals/${deal.id}`} style={{ fontSize: '11px', color: '#C4A355', textDecoration: 'none', flexShrink: 0 }}>Review →</a>
              </div>
            ))}
            {alerts.length === 0 && kycQueue === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No active alerts</div>
            )}
          </div>
        </div>

        {/* Audit log */}
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Audit Log — Recent</div>
            <a href="/audit" style={{ fontSize: '11px', color: '#C4A355', textDecoration: 'none' }}>View all →</a>
          </div>
          <div>
            {auditRecent.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '10px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', alignItems: 'center' }}>
                <span style={{ background: `${actionColors[log.action] ?? '#7C7A74'}18`, color: actionColors[log.action] ?? '#7C7A74', fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', flexShrink: 0, letterSpacing: '0.3px' }}>
                  {log.action}
                </span>
                <div style={{ flex: 1, fontSize: '12px', overflow: 'hidden' }}>
                  <span style={{ color: '#E8E6DF' }}>{log.entityType}</span>
                  <span style={{ color: '#7C7A74' }}> · {log.actorEmail ?? log.actor?.email ?? 'system'}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#3E3D3B', flexShrink: 0 }}>
                  {formatDate(log.createdAt.toISOString(), 'short')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming payouts */}
      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Upcoming Payouts (Scheduled)</div>
          <a href="/payouts" style={{ background: '#C4A355', color: '#0A0A0C', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>
            Manage Payouts
          </a>
        </div>
        <UpcomingPayouts />
      </div>
    </div>
  )
}

async function UpcomingPayouts() {
  const payouts = await prisma.payout.findMany({
    where: { status: 'SCHEDULED' },
    orderBy: { scheduledDate: 'asc' },
    take: 5,
    include: { investment: { include: { deal: { select: { name: true, internalId: true } }, user: { select: { email: true } } } } },
  })

  if (payouts.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No scheduled payouts</div>
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Deal', 'Investors', 'Type', 'Amount', 'Due Date', ''].map((h) => (
            <th key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3E3D3B', fontWeight: 500, padding: '8px 14px', textAlign: h === '' ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {payouts.map((p) => (
          <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <td style={{ padding: '11px 14px', fontSize: '12.5px', fontWeight: 500 }}>
              {p.investment.deal.name}
              <div style={{ fontSize: '10px', color: '#7C7A74', marginTop: '2px' }}>{p.investment.deal.internalId}</div>
            </td>
            <td style={{ padding: '11px 14px', fontSize: '12px' }}>1</td>
            <td style={{ padding: '11px 14px' }}>
              <span style={{ background: p.type === 'interest' ? 'rgba(191,160,99,0.12)' : 'rgba(44,200,154,0.1)', color: p.type === 'interest' ? '#BFA063' : '#2CC89A', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>
                {p.type}
              </span>
            </td>
            <td style={{ padding: '11px 14px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#2CC89A' }}>
              £{Number(p.amount).toLocaleString()}
            </td>
            <td style={{ padding: '11px 14px', fontSize: '11px', color: '#7C7A74', fontFamily: "'DM Mono', monospace" }}>
              {formatDate(p.scheduledDate.toISOString(), 'short')}
            </td>
            <td style={{ padding: '11px 14px', textAlign: 'right' }}>
              <ApprovePayout payoutId={p.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ApprovePayout({ payoutId }: { payoutId: string }) {
  return (
    <form action={async () => {
      'use server'
      const { prisma: db } = await import('@nexus/db')
      await db.payout.update({ where: { id: payoutId }, data: { status: 'PROCESSING' } })
    }}>
      <button type="submit" style={{ background: 'rgba(44,200,154,0.1)', color: '#2CC89A', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
        Approve
      </button>
    </form>
  )
}
