// apps/admin/src/app/(admin)/withdrawals/page.tsx
import { prisma } from '@nexus/db'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function WithdrawalsPage() {
  const [pending, completed] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
      include: { user: { include: { investorProfile: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.withdrawal.findMany({
      where: { status: { in: ['COMPLETED', 'REJECTED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { user: { include: { investorProfile: { select: { firstName: true, lastName: true } } } } },
    }),
  ])

  const pendingAmount = pending.reduce((s, w) => s + Number(w.amount), 0)

  const statusColor: Record<string, string> = {
    PENDING: '#E8A030', UNDER_REVIEW: '#5B9CF6',
    APPROVED: '#2CC89A', COMPLETED: '#2CC89A', REJECTED: '#E05C5C',
  }

  function WithdrawalTable({ withdrawals, showActions }: { withdrawals: typeof pending; showActions?: boolean }) {
    if (withdrawals.length === 0) {
      return <div style={{ padding: '32px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No withdrawals</div>
    }
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Investor', 'Amount', 'Currency', 'Destination', 'Status', 'Date', showActions ? 'Action' : 'Processed'].map((h) => (
            <th key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3E3D3B', fontWeight: 500, padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {withdrawals.map((w) => (
            <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{w.user.investorProfile?.firstName} {w.user.investorProfile?.lastName}</div>
                <div style={{ fontSize: '11px', color: '#7C7A74' }}>{w.user.email}</div>
              </td>
              <td style={{ padding: '11px 14px', fontFamily: "'DM Mono', monospace", fontSize: '13px', color: '#E8A030' }}>{formatCurrency(Number(w.amount))}</td>
              <td style={{ padding: '11px 14px', fontSize: '12px', color: '#7C7A74' }}>{w.currency}</td>
              <td style={{ padding: '11px 14px', fontSize: '11.5px', color: '#7C7A74' }}>
                <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '5px', fontSize: '11px' }}>{w.destinationType}</span>
              </td>
              <td style={{ padding: '11px 14px' }}>
                <span style={{ background: `${statusColor[w.status] ?? '#7C7A74'}18`, color: statusColor[w.status] ?? '#7C7A74', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>{w.status}</span>
              </td>
              <td style={{ padding: '11px 14px', fontSize: '11px', color: '#7C7A74', fontFamily: "'DM Mono', monospace" }}>{formatDate(w.createdAt.toISOString(), 'short')}</td>
              <td style={{ padding: '11px 14px' }}>
                {showActions ? (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <form action={async () => {
                      'use server'
                      const { prisma: db } = await import('@nexus/db')
                      await db.withdrawal.update({ where: { id: w.id }, data: { status: 'APPROVED', reviewedAt: new Date() } })
                    }}>
                      <button style={{ background: 'rgba(44,200,154,0.1)', color: '#2CC89A', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                    </form>
                    <form action={async () => {
                      'use server'
                      const { prisma: db } = await import('@nexus/db')
                      await db.withdrawal.update({ where: { id: w.id }, data: { status: 'REJECTED', reviewedAt: new Date() } })
                    }}>
                      <button style={{ background: 'rgba(224,92,92,0.1)', color: '#E05C5C', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                    </form>
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#7C7A74' }}>{formatDate(w.updatedAt.toISOString(), 'short')}</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '8px' }}>Pending Withdrawals</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, color: pending.length > 0 ? '#E8A030' : '' }}>{pending.length}</div>
        </div>
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '8px' }}>Pending Amount</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500 }}>{formatCurrency(pendingAmount)}</div>
        </div>
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '8px' }}>Avg Processing Time</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, color: '#2CC89A' }}>1.4d</div>
        </div>
      </div>

      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Pending Approval</div>
        </div>
        <WithdrawalTable withdrawals={pending} showActions />
      </div>

      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Recent History</div>
        </div>
        <WithdrawalTable withdrawals={completed} />
      </div>
    </div>
  )
}
