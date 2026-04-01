// apps/investor/src/app/api/deals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { getSignedDownloadUrl } from '@/lib/storage'
import type { ApiResponse, DealDetail } from '@nexus/shared'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const deal = await prisma.deal.findFirst({
    where: {
      id: (await params).id,
      visibleToInvestors: true,
      status: { in: ['LIVE', 'FUNDED', 'ACTIVE'] },
    },
    include: {
      images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      documents: {
        where: { deletedAt: null, isInternal: false },
        select: { id: true, category: true, fileName: true, uploadedAt: true },
      },
      investments: {
        where: { status: { not: 'PENDING' } },
        select: { id: true },
      },
    },
  })

  if (!deal) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } },
      { status: 404 }
    )
  }

  // Resolve signed URLs for images
  const imagesWithUrls = await Promise.all(
    deal.images.map(async (img) => ({
      id: img.id,
      url: await getSignedDownloadUrl(img.storageKey, 3600).catch(() => ''),
      isPrimary: img.isPrimary,
      sortOrder: img.sortOrder,
    }))
  )

  const detail: DealDetail = {
    id: deal.id,
    internalId: deal.internalId,
    name: deal.name,
    status: deal.status as any,
    type: deal.type as any,
    propertyCity: deal.propertyCity,
    propertyRegion: deal.propertyRegion,
    loanAmount: Number(deal.loanAmount),
    propertyValuation: Number(deal.propertyValuation),
    ltv: Number(deal.ltv),
    investorApr: Number(deal.investorApr),
    minimumInvestment: Number(deal.minimumInvestment),
    loanDurationMonths: deal.loanDurationMonths,
    targetRaise: Number(deal.targetRaise),
    currentRaised: Number(deal.currentRaised),
    riskGrade: deal.riskGrade as any,
    chargeType: deal.chargeType,
    isFeatured: deal.isFeatured,
    publishedAt: deal.publishedAt?.toISOString() ?? null,
    primaryImageUrl: imagesWithUrls.find((i) => i.isPrimary)?.url ?? null,
    investorCount: deal.investments.length,
    summary: deal.summary,
    propertyType: deal.propertyType,
    propertyAddress: deal.propertyAddress,
    propertyPostcode: deal.propertyPostcode,
    propertyDescription: deal.propertyDescription,
    collateralSummary: deal.collateralSummary,
    occupancyStatus: deal.occupancyStatus,
    maturityDate: deal.maturityDate?.toISOString() ?? null,
    expectedExitDate: deal.expectedExitDate?.toISOString() ?? null,
    repaymentType: deal.repaymentType,
    exitRoute: deal.exitRoute,
    underwritingSummary: deal.underwritingSummary,
    keyStrengths: deal.keyStrengths,
    keyRisks: deal.keyRisks,
    downsideProtection: deal.downsideProtection,
    valuationSource: deal.valuationSource,
    recoveryTimeMonths: deal.recoveryTimeMonths,
    scenarioNote: deal.scenarioNote,
    borrowerPurpose: deal.borrowerPurpose,
    openForInvestment: deal.openForInvestment,
    approvedInvestorsOnly: deal.approvedInvestorsOnly,
    autoInvestEligible: deal.autoInvestEligible,
    documents: deal.documents.map((d) => ({
      id: d.id,
      category: d.category,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    images: imagesWithUrls,
  }

  return NextResponse.json<ApiResponse<DealDetail>>({ success: true, data: detail })
}
