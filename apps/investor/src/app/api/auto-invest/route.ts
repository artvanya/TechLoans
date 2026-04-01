// apps/investor/src/app/api/auto-invest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

const ruleSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']).optional(),
  minApr: z.number().min(0).max(50),
  maxLtv: z.number().min(0).max(100),
  minDurationMonths: z.number().int().min(1),
  maxDurationMonths: z.number().int().min(1),
  maxPerDeal: z.number().positive(),
  reserveCash: z.number().min(0),
  permittedRiskGrades: z.array(z.enum(['A', 'B', 'C', 'D'])),
  permittedLoanTypes: z.array(z.string()),
  permittedRegions: z.array(z.string()),
  maxPerRegionPct: z.number().min(0).max(100).optional(),
  maxPerTypePct: z.number().min(0).max(100).optional(),
  reinvestRepayments: z.boolean(),
})

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const rule = await prisma.autoInvestRule.findUnique({
    where: { userId: session.user.id },
    include: {
      matchLog: {
        orderBy: { matchedAt: 'desc' },
        take: 20,
        include: { rule: { select: { userId: true } } },
      },
    },
  })

  if (!rule) return NextResponse.json({ success: true, data: null })

  // Fetch deal names for match log
  const dealIds = rule.matchLog.map((m) => m.dealId)
  const deals = await prisma.deal.findMany({
    where: { id: { in: dealIds } },
    select: { id: true, name: true, investorApr: true, ltv: true },
  })
  const dealMap = Object.fromEntries(deals.map((d) => [d.id, d]))

  return NextResponse.json({
    success: true,
    data: {
      id: rule.id,
      status: rule.status,
      minApr: Number(rule.minApr),
      maxLtv: Number(rule.maxLtv),
      minDurationMonths: rule.minDurationMonths,
      maxDurationMonths: rule.maxDurationMonths,
      maxPerDeal: Number(rule.maxPerDeal),
      reserveCash: Number(rule.reserveCash),
      permittedRiskGrades: rule.permittedRiskGrades,
      permittedLoanTypes: rule.permittedLoanTypes,
      permittedRegions: rule.permittedRegions,
      maxPerRegionPct: rule.maxPerRegionPct ? Number(rule.maxPerRegionPct) : null,
      maxPerTypePct: rule.maxPerTypePct ? Number(rule.maxPerTypePct) : null,
      reinvestRepayments: rule.reinvestRepayments,
      matchLog: rule.matchLog.map((m) => ({
        id: m.id,
        dealId: m.dealId,
        dealName: dealMap[m.dealId]?.name ?? 'Unknown',
        dealApr: dealMap[m.dealId] ? Number(dealMap[m.dealId].investorApr) : null,
        dealLtv: dealMap[m.dealId] ? Number(dealMap[m.dealId].ltv) : null,
        matched: m.matched,
        skipReason: m.skipReason,
        amountDeployed: m.amountDeployed ? Number(m.amountDeployed) : null,
        matchedAt: m.matchedAt.toISOString(),
      })),
    },
  })
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()
  const parsed = ruleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid rules', fields: parsed.error.flatten().fieldErrors },
    }, { status: 422 })
  }

  const data = parsed.data
  const rule = await prisma.autoInvestRule.upsert({
    where: { userId: session.user.id },
    update: {
      status: data.status ?? 'PAUSED',
      minApr: data.minApr,
      maxLtv: data.maxLtv,
      minDurationMonths: data.minDurationMonths,
      maxDurationMonths: data.maxDurationMonths,
      maxPerDeal: data.maxPerDeal,
      reserveCash: data.reserveCash,
      permittedRiskGrades: data.permittedRiskGrades,
      permittedLoanTypes: data.permittedLoanTypes,
      permittedRegions: data.permittedRegions,
      maxPerRegionPct: data.maxPerRegionPct,
      maxPerTypePct: data.maxPerTypePct,
      reinvestRepayments: data.reinvestRepayments,
    },
    create: {
      userId: session.user.id,
      status: data.status ?? 'PAUSED',
      minApr: data.minApr,
      maxLtv: data.maxLtv,
      minDurationMonths: data.minDurationMonths,
      maxDurationMonths: data.maxDurationMonths,
      maxPerDeal: data.maxPerDeal,
      reserveCash: data.reserveCash,
      permittedRiskGrades: data.permittedRiskGrades,
      permittedLoanTypes: data.permittedLoanTypes,
      permittedRegions: data.permittedRegions,
      maxPerRegionPct: data.maxPerRegionPct,
      maxPerTypePct: data.maxPerTypePct,
      reinvestRepayments: data.reinvestRepayments,
    },
  })

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'AutoInvestRule',
    entityId: rule.id,
    afterState: { status: rule.status },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { id: rule.id, status: rule.status } })
}
