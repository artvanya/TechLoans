// apps/admin/src/app/api/investors/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import type { ApiResponse, AdminInvestorRow } from '@nexus/shared'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search')
  const tier = searchParams.get('tier')
  const kycStatus = searchParams.get('kycStatus')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '25'), 100)

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
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        investorProfile: { select: { firstName: true, lastName: true, tier: true, kycStatus: true } },
        investments: {
          where: { status: { in: ['CONFIRMED', 'ACTIVE'] } },
          select: { amount: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  const rows: AdminInvestorRow[] = users.map((u) => ({
    userId: u.id,
    email: u.email,
    firstName: u.investorProfile?.firstName ?? '',
    lastName: u.investorProfile?.lastName ?? '',
    tier: u.investorProfile?.tier ?? 'STANDARD',
    kycStatus: (u.investorProfile?.kycStatus ?? 'NOT_STARTED') as any,
    totalDeployed: u.investments.reduce((sum, i) => sum + Number(i.amount), 0),
    isActive: u.isActive,
    isLocked: u.isLocked,
    createdAt: u.createdAt.toISOString(),
  }))

  return NextResponse.json<ApiResponse<AdminInvestorRow[]>>({
    success: true,
    data: rows,
    meta: { total, page, pageSize },
  })
}
