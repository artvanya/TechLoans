// apps/investor/src/app/api/credit-line/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const cl = await prisma.creditLine.findUnique({ where: { userId: session.user.id } })
  if (!cl) return NextResponse.json({ success: true, data: null })

  return NextResponse.json({
    success: true,
    data: {
      status: cl.status,
      approvedLimit: Number(cl.approvedLimit),
      utilised: Number(cl.utilised),
      maxPerDeal: cl.maxPerDeal ? Number(cl.maxPerDeal) : null,
      maxPerMonth: cl.maxPerMonth ? Number(cl.maxPerMonth) : null,
      minApr: cl.minApr ? Number(cl.minApr) : null,
      maxLtv: cl.maxLtv ? Number(cl.maxLtv) : null,
      maxDurationMonths: cl.maxDurationMonths,
      permittedRiskGrades: cl.permittedRiskGrades,
      permittedLoanTypes: cl.permittedLoanTypes,
      autoDrawEnabled: cl.autoDrawEnabled,
      expiresAt: cl.expiresAt?.toISOString() ?? null,
    },
  })
}

const updateSchema = z.object({
  maxPerDeal: z.number().positive().optional().nullable(),
  maxPerMonth: z.number().positive().optional().nullable(),
  minApr: z.number().min(0).max(50).optional().nullable(),
  maxLtv: z.number().min(0).max(100).optional().nullable(),
  maxDurationMonths: z.number().int().positive().optional().nullable(),
  permittedRiskGrades: z.array(z.string()).optional(),
  permittedLoanTypes: z.array(z.string()).optional(),
  autoDrawEnabled: z.boolean().optional(),
})

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const cl = await prisma.creditLine.findUnique({ where: { userId: session.user.id } })
  if (!cl) return NextResponse.json({ success: false, error: { code: 'NO_CREDIT_LINE', message: 'No credit line found. Contact your account manager.' } }, { status: 404 })

  if (!['ACTIVE', 'APPROVED'].includes(cl.status)) {
    return NextResponse.json({ success: false, error: { code: 'CREDIT_LINE_INACTIVE', message: 'Credit line is not active' } }, { status: 400 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid data' } }, { status: 422 })

  await prisma.creditLine.update({
    where: { userId: session.user.id },
    data: {
      maxPerDeal: parsed.data.maxPerDeal ?? undefined,
      maxPerMonth: parsed.data.maxPerMonth ?? undefined,
      minApr: parsed.data.minApr ?? undefined,
      maxLtv: parsed.data.maxLtv ?? undefined,
      maxDurationMonths: parsed.data.maxDurationMonths ?? undefined,
      permittedRiskGrades: parsed.data.permittedRiskGrades ?? undefined,
      permittedLoanTypes: parsed.data.permittedLoanTypes ?? undefined,
      autoDrawEnabled: parsed.data.autoDrawEnabled ?? undefined,
    },
  })

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'CreditLine',
    entityId: cl.id,
    afterState: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json({ success: true, data: { updated: true } })
}
