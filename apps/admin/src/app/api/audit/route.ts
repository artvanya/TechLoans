// apps/admin/src/app/api/audit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const { searchParams } = req.nextUrl
  const action = searchParams.get('action') ?? undefined
  const entityType = searchParams.get('entityType') ?? undefined
  const actorId = searchParams.get('actorId') ?? undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const format = searchParams.get('format') // 'csv' for export
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '50'), 200)

  const where: any = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(actorId ? { actorId } : {}),
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: format === 'csv' ? 0 : (page - 1) * pageSize,
      take: format === 'csv' ? 10000 : pageSize,
      include: {
        actor: { select: { email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  if (format === 'csv') {
    const rows = [
      'timestamp,actor,action,entity_type,entity_id,ip_address',
      ...logs.map((l) =>
        [
          l.createdAt.toISOString(),
          l.actorEmail ?? l.actor?.email ?? 'system',
          l.action,
          l.entityType,
          l.entityId ?? '',
          l.ipAddress ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    return new NextResponse(rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="nexus-audit-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return NextResponse.json({
    success: true,
    data: logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      actorEmail: l.actorEmail ?? l.actor?.email ?? 'system',
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      ipAddress: l.ipAddress,
      beforeState: l.beforeState,
      afterState: l.afterState,
      metadata: l.metadata,
    })),
    meta: { total, page, pageSize },
  })
}
