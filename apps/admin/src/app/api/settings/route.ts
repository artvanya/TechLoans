// apps/admin/src/app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

// Default platform settings
const DEFAULTS: Record<string, string> = {
  'platform.name': 'Nexus Private Credit',
  'platform.tagline': 'Institutional Private Credit · Institutional',
  'platform.min_investment_global': '1000',
  'platform.max_ltv_policy': '72',
  'platform.default_min_investment': '1000',
  'platform.kyc_validity_months': '12',
  'platform.withdrawal_min_gbp': '100',
  'platform.new_investor_registration_enabled': 'true',
  'platform.maintenance_mode': 'false',
  'platform.maintenance_message': 'The platform is temporarily unavailable for scheduled maintenance.',
  'email.kyc_reminder_days_before': '30',
  'email.deal_update_notifications': 'true',
  'auto_invest.global_enabled': 'true',
  'credit_line.global_enabled': 'true',
  'crypto.deposits_enabled': 'false',
  'crypto.withdrawals_enabled': 'false',
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const stored = await prisma.platformSetting.findMany()
  const settingsMap = Object.fromEntries(stored.map((s) => [s.key, s.value]))

  // Merge with defaults
  const merged = { ...DEFAULTS, ...settingsMap }

  return NextResponse.json({ success: true, data: merged })
}

const updateSchema = z.object({
  updates: z.record(z.string()),
})

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  // Only SUPER_ADMIN can change platform settings
  if ((session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only Super Admin can modify platform settings' } }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } }, { status: 422 })
  }

  const operatorId = (session.user as any).id
  const before: Record<string, string> = {}
  const after: Record<string, string> = {}

  for (const [key, value] of Object.entries(parsed.data.updates)) {
    // Get current value for audit
    const current = await prisma.platformSetting.findUnique({ where: { key } })
    before[key] = current?.value ?? DEFAULTS[key] ?? ''
    after[key] = value

    await prisma.platformSetting.upsert({
      where: { key },
      update: { value, updatedBy: operatorId },
      create: { key, value, updatedBy: operatorId },
    })
  }

  await writeAuditLog({
    actorId: operatorId,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'PlatformSetting',
    beforeState: before,
    afterState: after,
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { updated: Object.keys(parsed.data.updates).length } })
}
