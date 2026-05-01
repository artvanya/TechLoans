// apps/admin/src/app/(admin)/investors/page.tsx
import { prisma } from '@nexus/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvestorActions } from '@/components/investor-actions'

export const dynamic = 'force-dynamic'

interface SearchParams { search?: string; tier?: string; kycStatus?: string; page?: string }

export default async function InvestorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { page: pageParam, search, tier, kycStatus } = await searchParams
  const page = parseInt(pageParam ?? '1')
  const pageSize = 30

  const where: any = {
    role: 'INVESTOR',
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { investorProfile: { firstName: { contains: search, mode: 'insensitive' } } },
        { investorProfile: { lastName: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
    ...(tier ? { investorProfile: { tier } } : {}),
    ...(kycStatus ? { investorProfile: { kycStatus } } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      include: {
        investorProfile: { select: { firstName: true, lastName: true, tier: true, kycStatus: true } },
        investments: { where: { status: { in: ['CONFIRMED', 'ACTIVE'] } }, select: { amount: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  const kycStatusColor: Record<string, string> = {
    APPROVED: '#2CC89A', UNDER_REVIEW: '#5B9CF6', DOCUMENTS_SUBMITTED: '#E8A030',
    ADDITIONAL_INFO_REQUIRED: '#E8A030', REJECTED: '#E05C5C', NOT_STARTED: '#7C7A74',
  }
  const tierColor: Record<string, string> = { PLATINUM: '#BFA063', PREMIUM: '#5B9CF6', STANDARD: '#7C7A74' }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <form method="get" style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
          <input name="search" defaultValue={search ?? ''} placeholder="Search by name or email..."
            style={{ flex: 1, minWidth: 220, padding: '7px 12px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', outline: 'none' }} />
          {[
            { name: 'tier', opts: ['STANDARD', 'PREMIUM', 'PLATINUM'], placeholder: 'All tiers' },
            { name: 'kycStatus', opts: ['APPROVED', 'UNDER_REVIEW', 'DOCUMENTS_SUBMITTED', 'NOT_STARTED', 'REJECTED'], placeholder: 'All KYC' },
          ].map(({ name, opts, placeholder }) => (
            <select key={name} name={name} defaultValue={({ tier, kycStatus } as any)[name] ?? ''}
              style={{ padding: '7px 10px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', outline: 'none', appearance: 'none' }}>
              <option value="">{placeholder}</option>
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          ))}
          <button type="submit" style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', cursor: 'pointer' }}>Search</button>
          <a href="/investors" style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#7C7A74', fontSize: '12px', textDecoration: 'none' }}>Clear</a>
        </form>
        <a href="/api/investors?format=csv" style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#7C7A74', fontSize: '12px', textDecoration: 'none' }}>Export CSV</a>
      </div>

      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Investor Registry</div>
          <div style={{ fontSize: '11px', color: '#7C7A74' }}>{total} investors</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Investor', 'Tier', 'Deployed', 'KYC Status', '2FA', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3E3D3B', fontWeight: 500, padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No investors found</td></tr>
              )}
              {users.map((u) => {
                const totalDeployed = u.investments.reduce((s, i) => s + Number(i.amount), 0)
                const kyc = u.investorProfile?.kycStatus ?? 'NOT_STARTED'
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 500 }}>
                        {u.investorProfile?.firstName} {u.investorProfile?.lastName}
                        {!u.isActive && <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(224,92,92,0.12)', color: '#E05C5C', padding: '1px 5px', borderRadius: 4 }}>RESTRICTED</span>}
                        {u.isLocked && <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(232,160,48,0.12)', color: '#E8A030', padding: '1px 5px', borderRadius: 4 }}>LOCKED</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#7C7A74' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: `${tierColor[u.investorProfile?.tier ?? 'STANDARD']}18`, color: tierColor[u.investorProfile?.tier ?? 'STANDARD'], fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>
                        {u.investorProfile?.tier ?? 'STANDARD'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>
                      {formatCurrency(totalDeployed, 'GBP', true)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: `${kycStatusColor[kyc] ?? '#7C7A74'}18`, color: kycStatusColor[kyc] ?? '#7C7A74', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>
                        {kyc.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '11px', color: '#7C7A74' }}>—</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: u.isActive ? 'rgba(44,200,154,0.1)' : 'rgba(224,92,92,0.1)', color: u.isActive ? '#2CC89A' : '#E05C5C', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>
                        {u.isActive ? 'Active' : 'Restricted'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '11px', color: '#7C7A74', fontFamily: "'DM Mono', monospace" }}>
                      {formatDate(u.createdAt.toISOString(), 'short')}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <InvestorActions userId={u.id} isActive={u.isActive} isLocked={u.isLocked} currentTier={u.investorProfile?.tier ?? 'STANDARD'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {total > pageSize && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {page > 1 && <a href={`?page=${page - 1}`} style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', color: '#7C7A74', textDecoration: 'none', fontSize: '12px' }}>← Prev</a>}
          <span style={{ padding: '6px 14px', fontSize: '12px', color: '#7C7A74' }}>Page {page} of {Math.ceil(total / pageSize)}</span>
          {page < Math.ceil(total / pageSize) && <a href={`?page=${page + 1}`} style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', color: '#7C7A74', textDecoration: 'none', fontSize: '12px' }}>Next →</a>}
        </div>
      )}
    </div>
  )
}
