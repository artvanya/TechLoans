// apps/admin/src/app/api/deals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'
import type { ApiResponse } from '@nexus/shared'

const updateDealSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'LIVE', 'FUNDED', 'ACTIVE', 'REPAID', 'DEFAULTED', 'CLOSED', 'REJECTED']).optional(),
  summary: z.string().optional(),
  internalNotes: z.string().optional(),
  borrowerLegalName: z.string().optional(),
  borrowerContact: z.string().optional(),
  creditBackground: z.string().optional(),
  underwriterNotes: z.string().optional(),
  propertyDescription: z.string().optional(),
  collateralSummary: z.string().optional(),
  loanAmount: z.number().positive().optional(),
  propertyValuation: z.number().positive().optional(),
  investorApr: z.number().positive().optional(),
  targetRaise: z.number().positive().optional(),
  currentRaised: z.number().min(0).optional(),
  riskGrade: z.enum(['A', 'B', 'C', 'D']).optional(),
  underwritingSummary: z.string().optional(),
  keyStrengths: z.string().optional(),
  keyRisks: z.string().optional(),
  downsideProtection: z.string().optional(),
  visibleToInvestors: z.boolean().optional(),
  openForInvestment: z.boolean().optional(),
  approvedInvestorsOnly: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  autoInvestEligible: z.boolean().optional(),

  // Closing & Outcome
  actualClosingDate: z.string().optional().nullable(),
  actualDurationMonths: z.number().int().optional().nullable(),
  kycVerification: z.string().optional(),
  totalDealIncome: z.string().optional(),
  investorIncome: z.string().optional(),
  companyIncome: z.string().optional(),

  // Default / Collection
  wasDefaulted: z.boolean().optional(),
  collectionStartDate: z.string().optional(),
  propertyRealizationPeriod: z.string().optional(),
  propertySalePrice: z.string().optional(),
  fundsDistribution: z.string().optional(),
  dealComment: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const deal = await prisma.deal.findUnique({
    where: { id: (await params).id },
    include: {
      documents: { where: { deletedAt: null } },
      images: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      investments: { select: { id: true, amount: true, userId: true, status: true, confirmedAt: true } },
      servicingLogs: { orderBy: { eventDate: 'desc' } },
      repaymentSchedule: { orderBy: { scheduledDate: 'asc' } },
    },
  })

  if (!deal) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } }, { status: 404 })

  return NextResponse.json({ success: true, data: deal })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()
  const parsed = updateDealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid update data', fields: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  const existing = await prisma.deal.findUnique({ where: { id: (await params).id } })
  if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } }, { status: 404 })

  const updates: any = { ...parsed.data }

  // Convert actualClosingDate string to Date if provided
  if (parsed.data.actualClosingDate !== undefined) {
    updates.actualClosingDate = parsed.data.actualClosingDate ? new Date(parsed.data.actualClosingDate) : null
  }

  // Recalculate LTV if loan amount or valuation changed
  const newLoan = parsed.data.loanAmount ?? Number(existing.loanAmount)
  const newVal = parsed.data.propertyValuation ?? Number(existing.propertyValuation)
  if (parsed.data.loanAmount || parsed.data.propertyValuation) {
    updates.ltv = Math.round((newLoan / newVal) * 1000) / 10
  }

  // Set publishedAt when going Live
  if (parsed.data.status === 'LIVE' && existing.status !== 'LIVE') {
    updates.publishedAt = new Date()
    updates.visibleToInvestors = true
  }

  const updated = await prisma.deal.update({ where: { id: (await params).id }, data: updates })

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: parsed.data.status ? 'STATUS_CHANGE' : 'UPDATE',
    entityType: 'Deal',
    entityId: (await params).id,
    beforeState: { status: existing.status, visibleToInvestors: existing.visibleToInvestors },
    afterState: { status: updated.status, visibleToInvestors: updated.visibleToInvestors },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: { id: updated.id } })
}
