// apps/admin/src/app/(admin)/repayments/page.tsx
import { prisma } from '@nexus/db'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function RepaymentsPage() {
  const [scheduled, completed, overdue] = await Promise.all([
    prisma.payout.findMany({
      where: { status: 'SCHEDULED' },
      orderBy: { scheduledDate: 'asc' },
      include: { investment: { include: { deal: { select: { name: true, internalId: true } }, user: { select: { email: true } } } } },
    }),
    prisma.payout.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { processedAt: 'desc' },
      take: 20,
      include: { investment: { include: { deal: { select: { name: true, internalId: true } }, user: { select: { email: true } } } } },
    }),
    prisma.payout.findMany({
      where: { status: 'SCHEDULED', scheduledDate: { lt: new Date() } },
      include: { investment: { include: { deal: { select: { name: true, internalId: true } }, user: { select: { email: true } } } } },
    }),
  ])

  const totalScheduledAmount = scheduled.reduce((s, p) => s + Number(p.amount), 0)
  const totalCompletedAmount = completed.reduce((s, p) => s + Number(p.amount), 0)

  function PayoutTable({ payouts, showApprove }: { payouts: typeof scheduled; showApprove?: boolean }) {
    if (payouts.length === 0) {
      return <div style={{ padding: '32px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No payouts in this category</div>
    }
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Deal', 'Investor', 'Type', 'Amount', 'Due Date', showApprove ? 'Action' : 'Processed'].map((h) => (
              <th key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3E3D3B', fontWeight: 500, padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{p.investment.deal.name}</div>
                <div style={{ fontSize: '10px', color: '#7C7A74', fontFamily: "'DM Mono', monospace" }}>{p.investment.deal.internalId}</div>
              </td>
              <td style={{ padding: '11px 14px', fontSize: '11.5px', color: '#7C7A74' }}>{p.investment.user.email}</td>
              <td style={{ padding: '11px 14px' }}>
                <span style={{ background: p.type === 'interest' ? 'rgba(191,160,99,0.12)' : 'rgba(44,200,154,0.1)', color: p.type === 'interest' ? '#BFA063' : '#2CC89A', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>{p.type}</span>
              </td>
              <td style={{ padding: '11px 14px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#2CC89A' }}>£{Number(p.amount).toLocaleString()}</td>
              <td style={{ padding: '11px 14px', fontSize: '11.5px', color: p.scheduledDate < new Date() ? '#E05C5C' : '#7C7A74', fontFamily: "'DM Mono', monospace" }}>
                {formatDate(p.scheduledDate.toISOString(), 'short')}
                {p.scheduledDate < new Date() && showApprove && <span style={{ marginLeft: 6, fontSize: 9, color: '#E05C5C' }}>OVERDUE</span>}
              </td>
              <td style={{ padding: '11px 14px' }}>
                {showApprove ? (
                  <form action={async () => {
                    'use server'
                    const { prisma: db } = await import('@nexus/db')
                    await db.payout.update({ where: { id: p.id }, data: { status: 'PROCESSING' } })
                  }}>
                    <button style={{ background: 'rgba(44,200,154,0.1)', color: '#2CC89A', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Approve
                    </button>
                  </form>
                ) : (
                  <span style={{ fontSize: '11px', color: '#7C7A74' }}>{formatDate(p.processedAt?.toISOString() ?? '', 'short')}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
        {[
          { label: 'Scheduled Payouts', value: scheduled.length.toString() },
          { label: 'Scheduled Amount', value: `£${totalScheduledAmount.toLocaleString()}` },
          { label: 'Overdue', value: overdue.length.toString(), red: overdue.length > 0 },
          { label: 'Completed (Last 20)', value: `£${totalCompletedAmount.toLocaleString()}` },
        ].map(({ label, value, red }) => (
          <div key={label} style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, color: red ? '#E05C5C' : '' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#E05C5C', fontSize: '14px' }}>⚠</span>
          <span style={{ fontSize: '12.5px', color: '#E05C5C' }}>{overdue.length} payout{overdue.length > 1 ? 's are' : ' is'} overdue. Review and process immediately.</span>
        </div>
      )}

      {/* Batch approve */}
      {scheduled.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <form action={async () => {
            'use server'
            const { prisma: db } = await import('@nexus/db')
            await db.payout.updateMany({ where: { status: 'SCHEDULED' }, data: { status: 'PROCESSING' } })
          }}>
            <button style={{ background: '#C4A355', color: '#0A0A0C', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
              Approve All Scheduled ({scheduled.length})
            </button>
          </form>
        </div>
      )}

      {/* Scheduled table */}
      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Scheduled Payouts</div>
          <div style={{ fontSize: '10.5px', color: '#7C7A74', marginTop: '2px' }}>Awaiting approval and processing</div>
        </div>
        <PayoutTable payouts={scheduled} showApprove />
      </div>

      {/* Completed table */}
      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Recently Completed</div>
        </div>
        <PayoutTable payouts={completed} />
      </div>
    </div>
  )
}
