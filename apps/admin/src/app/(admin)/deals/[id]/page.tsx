// apps/admin/src/app/(admin)/deals/[id]/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@nexus/db'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { DealEditForm } from '@/components/deal-edit-form'

export const dynamic = 'force-dynamic'

export default async function AdminDealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      documents: { where: { deletedAt: null }, orderBy: { uploadedAt: 'desc' } },
      images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      investments: {
        include: { user: { select: { email: true } }, },
        orderBy: { confirmedAt: 'desc' },
      },
      servicingLogs: { orderBy: { eventDate: 'desc' }, take: 20 },
    },
  })

  if (!deal) notFound()

  const totalAllocated = deal.investments.reduce((s, i) => s + Number(i.amount), 0)
  const progress = Number(deal.targetRaise) > 0
    ? Math.round(totalAllocated / Number(deal.targetRaise) * 100)
    : 0

  const statusColors: Record<string, string> = {
    LIVE: '#2CC89A', ACTIVE: '#2CC89A', APPROVED: '#5B9CF6', UNDER_REVIEW: '#E8A030',
    DRAFT: '#7C7A74', REPAID: '#5B9CF6', DEFAULTED: '#E05C5C', REJECTED: '#E05C5C', FUNDED: '#BFA063',
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <Link href="/deals" style={{ fontSize: '12px', color: '#7C7A74', textDecoration: 'none' }}>← Pipeline</Link>
            <span style={{ color: '#3E3D3B' }}>/</span>
            <span style={{ fontSize: '12px', color: '#7C7A74' }}>{deal.internalId}</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>{deal.name}</h1>
          <div style={{ fontSize: '12px', color: '#7C7A74' }}>
            {deal.propertyCity} · {deal.type.replace(/_/g,' ')} · {deal.internalId}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {deal.status === 'UNDER_REVIEW' || deal.status === 'DRAFT' ? (
            <form action={async () => {
              'use server'
              const { prisma: db } = await import('@nexus/db')
              await db.deal.update({ where: { id: deal.id }, data: { status: 'APPROVED' } })
            }}>
              <button style={{ background: 'rgba(44,200,154,0.1)', color: '#2CC89A', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
            </form>
          ) : null}
          {deal.status === 'APPROVED' ? (
            <form action={async () => {
              'use server'
              const res = await fetch(`${process.env.ADMIN_NEXTAUTH_URL}/api/deals/${deal.id}/publish`, { method: 'POST' })
            }}>
              <button style={{ background: '#C4A355', color: '#0A0A0C', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>→ Publish Live</button>
            </form>
          ) : null}
          {(deal.status === 'LIVE' || deal.status === 'ACTIVE') && (
            <form action={async () => {
              'use server'
              const { prisma: db } = await import('@nexus/db')
              await db.deal.update({ where: { id: deal.id }, data: { visibleToInvestors: !deal.visibleToInvestors } })
            }}>
              <button style={{ background: deal.visibleToInvestors ? 'rgba(224,92,92,0.1)' : 'rgba(44,200,154,0.1)', color: deal.visibleToInvestors ? '#E05C5C' : '#2CC89A', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                {deal.visibleToInvestors ? 'Hide from marketplace' : 'Show in marketplace'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status + key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '1px', background: 'rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        {[
          { label: 'Status', value: <span style={{ background: `${statusColors[deal.status] ?? '#7C7A74'}18`, color: statusColors[deal.status] ?? '#7C7A74', fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '5px' }}>{deal.status}</span> },
          { label: 'Loan Amount', value: formatCurrency(Number(deal.loanAmount), 'GBP', true) },
          { label: 'LTV', value: <span style={{ color: Number(deal.ltv) > 72 ? '#E05C5C' : '' }}>{formatPercent(Number(deal.ltv), 0)}</span> },
          { label: 'Investor APR', value: <span style={{ color: '#2CC89A' }}>{formatPercent(Number(deal.investorApr))}</span> },
          { label: 'Funding', value: `${progress}%` },
          { label: 'Investors', value: deal.investments.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#0F1012', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '16px', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <DealEditForm deal={{
        id: deal.id,
        name: deal.name,
        status: deal.status,
        type: deal.type,
        summary: deal.summary ?? '',
        internalNotes: deal.internalNotes ?? '',
        borrowerLegalName: deal.borrowerLegalName ?? '',
        borrowerContact: deal.borrowerContact ?? '',
        creditBackground: deal.creditBackground ?? '',
        underwriterNotes: deal.underwriterNotes ?? '',
        propertyDescription: deal.propertyDescription ?? '',
        collateralSummary: deal.collateralSummary ?? '',
        loanAmount: Number(deal.loanAmount),
        propertyValuation: Number(deal.propertyValuation),
        ltv: Number(deal.ltv),
        investorApr: Number(deal.investorApr),
        targetRaise: Number(deal.targetRaise),
        currentRaised: Number(deal.currentRaised),
        riskGrade: deal.riskGrade ?? '',
        chargeType: deal.chargeType,
        underwritingSummary: deal.underwritingSummary ?? '',
        keyStrengths: deal.keyStrengths ?? '',
        keyRisks: deal.keyRisks ?? '',
        downsideProtection: deal.downsideProtection ?? '',
        valuationSource: deal.valuationSource ?? '',
        visibleToInvestors: deal.visibleToInvestors,
        openForInvestment: deal.openForInvestment,
        approvedInvestorsOnly: deal.approvedInvestorsOnly,
        isFeatured: deal.isFeatured,
        autoInvestEligible: deal.autoInvestEligible,
      }} />

      {/* Allocations */}
      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Investor Allocations</div>
          <div style={{ fontSize: '11px', color: '#7C7A74' }}>{deal.investments.length} investors · {formatCurrency(totalAllocated)} total</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Investor', 'Amount', 'Source', 'Status', 'Date'].map((h) => (
              <th key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3E3D3B', fontWeight: 500, padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {deal.investments.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No allocations yet</td></tr>
            ) : deal.investments.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{inv.user.email}</td>
                <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#2CC89A' }}>{formatCurrency(Number(inv.amount))}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: inv.source === 'auto-invest' ? 'rgba(91,156,246,0.1)' : 'rgba(191,160,99,0.1)', color: inv.source === 'auto-invest' ? '#5B9CF6' : '#BFA063', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>
                    {inv.source ?? 'manual'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: 'rgba(44,200,154,0.1)', color: '#2CC89A', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>{inv.status}</span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '11px', color: '#7C7A74' }}>{formatDate(inv.confirmedAt?.toISOString() ?? inv.createdAt.toISOString(), 'short')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Servicing log */}
      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Servicing Log</div>
        </div>
        {deal.servicingLogs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No servicing events yet</div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            {deal.servicingLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ['INTEREST_RECEIVED','PRINCIPAL_REPAYMENT_FULL'].includes(log.eventType) ? '#2CC89A' : ['DEFAULT_NOTICE','LPA_RECEIVER_APPOINTED'].includes(log.eventType) ? '#E05C5C' : '#E8A030', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{log.eventType.replace(/_/g, ' ')}</div>
                  {log.notes && <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '2px' }}>{log.notes}</div>}
                </div>
                {log.amount && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', color: '#2CC89A' }}>£{Number(log.amount).toLocaleString()}</div>}
                <div style={{ fontSize: '11px', color: '#7C7A74', fontFamily: "'DM Mono', monospace" }}>{formatDate(log.eventDate.toISOString(), 'short')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
