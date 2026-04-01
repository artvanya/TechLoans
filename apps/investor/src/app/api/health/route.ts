// apps/investor/src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@nexus/db'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, 'ok' | 'error'> = {}

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  const allOk = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    },
    { status: allOk ? 200 : 503 }
  )
}
