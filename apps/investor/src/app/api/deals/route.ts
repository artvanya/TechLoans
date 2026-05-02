// apps/investor/src/app/api/deals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma, type Prisma } from '@nexus/db'
import { getDealImageDisplayUrl } from '@/lib/storage'
import type { ApiResponse, DealSummary } from '@nexus/shared'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const region = searchParams.get('region')
  const riskGrade = searchParams.get('riskGrade')
  const minApr = searchParams.get('minApr')
  const maxLtv = searchParams.get('maxLtv')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '20'), 50)

  // Determine if user can see approved-only deals
  const investorProfile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    select: { tier: true },
  })
  const canSeeApprovedOnly =
    investorProfile?.tier === 'PLATINUM' || investorProfile?.tier === 'PREMIUM'

  const where: Prisma.DealWhereInput = {
    visibleToInvestors: true,
    status: { in: ['LIVE', 'FUNDED', 'ACTIVE'] },
    ...(canSeeApprovedOnly ? {} : { approvedInvestorsOnly: false }),
    ...(type ? { type: type as any } : {}),
    ...(region ? { propertyRegion: region } : {}),
    ...(riskGrade ? { riskGrade: riskGrade as any } : {}),
    ...(minApr ? { investorApr: { gte: parseFloat(minApr) } } : {}),
    ...(maxLtv ? { ltv: { lte: parseFloat(maxLtv) } } : {}),
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: {
          where: { isPrimary: true, deletedAt: null },
          take: 1,
        },
        investments: {
          where: { status: { not: 'PENDING' } },
          select: { id: true },
        },
      },
    }),
    prisma.deal.count({ where }),
  ])

  const dealSummaries: DealSummary[] = await Promise.all(
    deals.map(async (d) => {
      let primaryImageUrl: string | null = null
      if (d.images[0]) {
        primaryImageUrl = await getDealImageDisplayUrl(d.images[0].storageKey, 3600)
      }

      return {
        id: d.id,
        internalId: d.internalId,
        name: d.name,
        status: d.status as any,
        type: d.type as any,
        propertyCity: d.propertyCity,
        propertyRegion: d.propertyRegion,
        loanAmount: Number(d.loanAmount),
        propertyValuation: Number(d.propertyValuation),
        ltv: Number(d.ltv),
        investorApr: Number(d.investorApr),
        minimumInvestment: Number(d.minimumInvestment),
        loanDurationMonths: d.loanDurationMonths,
        targetRaise: Number(d.targetRaise),
        currentRaised: Number(d.currentRaised),
        riskGrade: d.riskGrade as any,
        chargeType: d.chargeType,
        isFeatured: d.isFeatured,
        publishedAt: d.publishedAt?.toISOString() ?? null,
        primaryImageUrl,
        investorCount: d.investments.length,
      }
    })
  )

  return NextResponse.json<ApiResponse<DealSummary[]>>({
    success: true,
    data: dealSummaries,
    meta: { total, page, pageSize },
  })
}
