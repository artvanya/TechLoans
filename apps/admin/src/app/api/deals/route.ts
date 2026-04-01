// apps/admin/src/app/api/deals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'
import type { ApiResponse, AdminDealRow } from '@nexus/shared'

// Validation schema for deal creation
const createDealSchema = z.object({
  // Step 1: Basics
  name: z.string().min(3).max(200),
  type: z.enum(['BRIDGE_FINANCE', 'DEVELOPMENT_FINANCE', 'BUY_TO_LET', 'COMMERCIAL_BRIDGE', 'MEZZANINE']),
  borrowerType: z.string().optional(),
  borrowerPurpose: z.string().optional(),
  summary: z.string().optional(),
  internalNotes: z.string().optional(),
  borrowerLegalName: z.string().optional(),
  borrowerContact: z.string().optional(),
  creditBackground: z.string().optional(),
  underwriterNotes: z.string().optional(),

  // Step 2: Property
  propertyType: z.string().optional(),
  propertyAddress: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyRegion: z.string().optional(),
  propertyPostcode: z.string().optional(),
  propertyDescription: z.string().optional(),
  collateralSummary: z.string().optional(),
  occupancyStatus: z.string().optional(),

  // Step 3: Financials
  loanAmount: z.number().positive(),
  propertyValuation: z.number().positive(),
  investorApr: z.number().positive().max(50),
  borrowerRate: z.number().positive().max(50).optional(),
  platformMargin: z.number().optional(),
  minimumInvestment: z.number().positive().default(1000),
  loanDurationMonths: z.number().int().positive(),
  originationDate: z.string().optional(),
  maturityDate: z.string().optional(),
  repaymentType: z.enum(['MONTHLY_INTEREST_BULLET', 'ROLLED_UP_BULLET', 'QUARTERLY_INTEREST_BULLET', 'AMORTISING']).default('MONTHLY_INTEREST_BULLET'),
  exitRoute: z.string().optional(),
  targetRaise: z.number().positive(),
  arrangementFeePercent: z.number().optional(),
  exitFeePercent: z.number().optional(),
  penaltyProvisions: z.string().optional(),

  // Step 4: Risk
  riskGrade: z.enum(['A', 'B', 'C', 'D']).optional(),
  chargeType: z.enum(['FIRST_CHARGE', 'SECOND_CHARGE', 'DEBENTURE']).default('FIRST_CHARGE'),
  legalStructureNotes: z.string().optional(),
  instructedSolicitors: z.string().optional(),
  valuationSource: z.string().optional(),
  underwritingSummary: z.string().optional(),
  keyStrengths: z.string().optional(),
  keyRisks: z.string().optional(),
  downsideProtection: z.string().optional(),
  recoveryTimeMonths: z.number().int().optional(),

  // Publish settings
  visibleToInvestors: z.boolean().default(false),
  openForInvestment: z.boolean().default(false),
  approvedInvestorsOnly: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  autoInvestEligible: z.boolean().default(true),

  // Closing & Outcome
  actualClosingDate: z.string().optional(),
  actualDurationMonths: z.number().int().optional(),
  kycVerification: z.string().optional(),
  totalDealIncome: z.string().optional(),
  investorIncome: z.string().optional(),
  companyIncome: z.string().optional(),

  // Default / Collection
  wasDefaulted: z.boolean().default(false),
  collectionStartDate: z.string().optional(),
  propertyRealizationPeriod: z.string().optional(),
  propertySalePrice: z.string().optional(),
  fundsDistribution: z.string().optional(),
  dealComment: z.string().optional(),

  // Status
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'LIVE']).default('DRAFT'),
})

function generateDealId(): string {
  const year = new Date().getFullYear()
  const seq = Math.floor(Math.random() * 900) + 100
  return `NXSD-${year}-${seq}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const body = await req.json()
  const parsed = createDealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid deal data',
          fields: parsed.error.flatten().fieldErrors as Record<string, string>,
        },
      },
      { status: 422 }
    )
  }

  const data = parsed.data
  const ltv = (data.loanAmount / data.propertyValuation) * 100

  // Flag if LTV exceeds policy
  let status = data.status
  if (ltv > 72 && status === 'APPROVED') {
    status = 'UNDER_REVIEW'
  }

  // Ensure unique internalId
  let internalId = generateDealId()
  while (await prisma.deal.findUnique({ where: { internalId } })) {
    internalId = generateDealId()
  }

  const deal = await prisma.deal.create({
    data: {
      internalId,
      name: data.name,
      status,
      type: data.type,
      borrowerType: data.borrowerType,
      borrowerPurpose: data.borrowerPurpose,
      summary: data.summary,
      internalNotes: data.internalNotes,
      borrowerLegalName: data.borrowerLegalName,
      borrowerContact: data.borrowerContact,
      creditBackground: data.creditBackground,
      underwriterNotes: data.underwriterNotes,
      propertyType: data.propertyType,
      propertyAddress: data.propertyAddress,
      propertyCity: data.propertyCity,
      propertyRegion: data.propertyRegion,
      propertyPostcode: data.propertyPostcode,
      propertyDescription: data.propertyDescription,
      collateralSummary: data.collateralSummary,
      occupancyStatus: data.occupancyStatus,
      loanAmount: data.loanAmount,
      propertyValuation: data.propertyValuation,
      ltv: Math.round(ltv * 10) / 10,
      investorApr: data.investorApr,
      borrowerRate: data.borrowerRate,
      platformMargin: data.platformMargin,
      minimumInvestment: data.minimumInvestment,
      loanDurationMonths: data.loanDurationMonths,
      originationDate: data.originationDate ? new Date(data.originationDate) : null,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
      repaymentType: data.repaymentType,
      exitRoute: data.exitRoute,
      targetRaise: data.targetRaise,
      arrangementFeePercent: data.arrangementFeePercent,
      exitFeePercent: data.exitFeePercent,
      penaltyProvisions: data.penaltyProvisions,
      riskGrade: data.riskGrade,
      chargeType: data.chargeType,
      legalStructureNotes: data.legalStructureNotes,
      instructedSolicitors: data.instructedSolicitors,
      valuationSource: data.valuationSource,
      underwritingSummary: data.underwritingSummary,
      keyStrengths: data.keyStrengths,
      keyRisks: data.keyRisks,
      downsideProtection: data.downsideProtection,
      recoveryTimeMonths: data.recoveryTimeMonths,
      actualClosingDate: data.actualClosingDate ? new Date(data.actualClosingDate) : null,
      actualDurationMonths: data.actualDurationMonths,
      kycVerification: data.kycVerification,
      totalDealIncome: data.totalDealIncome,
      investorIncome: data.investorIncome,
      companyIncome: data.companyIncome,
      wasDefaulted: data.wasDefaulted,
      collectionStartDate: data.collectionStartDate,
      propertyRealizationPeriod: data.propertyRealizationPeriod,
      propertySalePrice: data.propertySalePrice,
      fundsDistribution: data.fundsDistribution,
      dealComment: data.dealComment,
      visibleToInvestors: data.visibleToInvestors,
      openForInvestment: data.openForInvestment,
      approvedInvestorsOnly: data.approvedInvestorsOnly,
      isFeatured: data.isFeatured,
      autoInvestEligible: data.autoInvestEligible,
      publishedAt: data.visibleToInvestors ? new Date() : null,
      createdById: (session.user as any).id,
    },
  })

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'CREATE',
    entityType: 'Deal',
    entityId: deal.id,
    afterState: { internalId, name: deal.name, status: deal.status },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json<ApiResponse<{ id: string; internalId: string }>>({
    success: true,
    data: { id: deal.id, internalId: deal.internalId },
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const region = searchParams.get('region')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '25'), 100)

  const where: any = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(region ? { propertyRegion: region } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { internalId: { contains: search, mode: 'insensitive' } },
            { propertyCity: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        investments: { select: { id: true } },
      },
    }),
    prisma.deal.count({ where }),
  ])

  const rows: AdminDealRow[] = deals.map((d) => ({
    id: d.id,
    internalId: d.internalId,
    name: d.name,
    type: d.type as any,
    propertyCity: d.propertyCity,
    propertyRegion: d.propertyRegion,
    loanAmount: Number(d.loanAmount),
    ltv: Number(d.ltv),
    investorApr: Number(d.investorApr),
    targetRaise: Number(d.targetRaise),
    currentRaised: Number(d.currentRaised),
    status: d.status as any,
    visibleToInvestors: d.visibleToInvestors,
    riskGrade: d.riskGrade as any,
    investorCount: d.investments.length,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }))

  return NextResponse.json<ApiResponse<AdminDealRow[]>>({
    success: true,
    data: rows,
    meta: { total, page, pageSize },
  })
}
