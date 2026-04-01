// apps/admin/src/app/api/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import type { ApiResponse, KycQueueItem } from '@nexus/shared'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? undefined
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '25'), 100)

  const where: any = {
    status: status ? { equals: status } : {
      in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED'],
    },
  }

  const [cases, total] = await Promise.all([
    prisma.kycCase.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        investorProfile: {
          include: {
            user: { select: { email: true } },
          },
        },
        documents: { where: { deletedAt: null }, select: { id: true } },
      },
    }),
    prisma.kycCase.count({ where }),
  ])

  const items: KycQueueItem[] = cases.map((c) => ({
    kycCaseId: c.id,
    investorProfileId: c.investorProfileId,
    userId: c.investorProfile.userId,
    email: c.investorProfile.user.email,
    firstName: c.investorProfile.firstName,
    lastName: c.investorProfile.lastName,
    kycLevel: c.level,
    status: c.status as any,
    submittedAt: c.updatedAt.toISOString(),
    documentCount: c.documents.length,
  }))

  return NextResponse.json<ApiResponse<KycQueueItem[]>>({
    success: true,
    data: items,
    meta: { total, page, pageSize },
  })
}
