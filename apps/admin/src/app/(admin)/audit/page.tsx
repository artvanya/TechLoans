// apps/admin/src/app/(admin)/audit/page.tsx
import { prisma } from '@nexus/db'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SearchParams { action?: string; entityType?: string; from?: string; to?: string; page?: string }

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parseInt(searchParams.page ?? '1')
  const pageSize = 50

  const where: any = {
    ...(searchParams.action ? { action: searchParams.action } : {}),
    ...(searchParams.entityType ? { entityType: searchParams.entityType } : {}),
    ...(searchParams.from || searchParams.to ? {
      createdAt: {
        ...(searchParams.from ? { gte: new Date(searchParams.from) } : {}),
        ...(searchParams.to ? { lte: new Date(searchParams.to) } : {}),
      }
    } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      include: { actor: { select: { email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ])

  const actionColors: Record<string, string> = {
    CREATE: '#5B9CF6', UPDATE: '#E8A030', DELETE: '#E05C5C', STATUS_CHANGE: '#9D8DF7',
    LOGIN: '#BFA063', LOGOUT: '#7C7A74', FAILED_LOGIN: '#E05C5C',
    APPROVE: '#2CC89A', REJECT: '#E05C5C', PUBLISH: '#2CC89A', UNPUBLISH: '#E8A030',
    UPLOAD: '#5B9CF6', DOWNLOAD: '#BFA063', EXPORT: '#BFA063',
    PAYOUT_RUN: '#2CC89A', INVESTMENT: '#BFA063', KYC_APPROVE: '#2CC89A', KYC_REJECT: '#E05C5C',
    ACCOUNT_RESTRICT: '#E05C5C', ACCOUNT_RESTORE: '#2CC89A',
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>Audit Log</div>
          <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '3px' }}>
            All operator actions · {total.toLocaleString()} total records · immutable
          </div>
        </div>
        <a href="/api/audit?format=csv" style={{ background: '#C4A355', color: '#0A0A0C', padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form method="get" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { name: 'action', placeholder: 'Filter by action', options: ['CREATE','UPDATE','DELETE','STATUS_CHANGE','LOGIN','APPROVE','REJECT','PUBLISH','PAYOUT_RUN','INVESTMENT','KYC_APPROVE','KYC_REJECT','ACCOUNT_RESTRICT'] },
          { name: 'entityType', placeholder: 'Entity type', options: ['Deal','Investment','User','KycCase','Payout','Withdrawal','AdminSession'] },
        ].map(({ name, placeholder, options }) => (
          <select key={name} name={name} defaultValue={(searchParams as any)[name] ?? ''}
            style={{ padding: '7px 10px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', outline: 'none', appearance: 'none' }}>
            <option value="">{placeholder}</option>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
        <input type="date" name="from" defaultValue={searchParams.from ?? ''}
          style={{ padding: '7px 10px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', outline: 'none' }} />
        <input type="date" name="to" defaultValue={searchParams.to ?? ''}
          style={{ padding: '7px 10px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', outline: 'none' }} />
        <button type="submit" style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', cursor: 'pointer' }}>Apply</button>
        <a href="/audit" style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#7C7A74', fontSize: '12px', textDecoration: 'none' }}>Clear</a>
      </form>

      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Timestamp', 'Operator', 'Action', 'Entity', 'Detail', 'IP'].map((h) => (
                <th key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3E3D3B', fontWeight: 500, padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#7C7A74', fontSize: '12px' }}>No audit records match your filter</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: '10.5px', color: '#7C7A74', whiteSpace: 'nowrap' }}>
                  {log.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#E8E6DF' }}>
                  {log.actorEmail ?? log.actor?.email ?? 'system'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: `${actionColors[log.action] ?? '#7C7A74'}18`, color: actionColors[log.action] ?? '#7C7A74', fontSize: '9.5px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.3px' }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#7C7A74' }}>{log.entityType}</td>
                <td style={{ padding: '10px 14px', fontSize: '11.5px', color: '#7C7A74', maxWidth: '280px' }}>
                  {log.entityId && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', marginRight: '6px', color: '#3E3D3B' }}>{log.entityId.slice(0, 12)}...</span>}
                  {log.afterState ? JSON.stringify(log.afterState).slice(0, 60) + '...' : log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : ''}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#3E3D3B' }}>
                  {log.ipAddress ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
