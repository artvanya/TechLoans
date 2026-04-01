// apps/investor/src/app/api/auth/2fa/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { writeAuditLog } from '@/lib/audit'

// Generate a new TOTP secret and QR code for the user
export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const secret = authenticator.generateSecret()
  const appName = 'Nexus Private Credit'
  const otpAuthUrl = authenticator.keyuri(session.user.email!, appName, secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)

  // Store the secret temporarily (not yet enabled — user must verify first)
  // In production, encrypt the secret before storing
  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: secret },
  })

  return NextResponse.json({
    success: true,
    data: {
      secret,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret,
    },
  })
}

// Verify the TOTP code and enable 2FA
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const body = await req.json()
  const { code } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ success: false, error: { code: 'MISSING_CODE', message: 'Verification code required' } }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!user?.twoFactorSecret) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_SECRET', message: 'Please generate a 2FA secret first' } },
      { status: 400 }
    )
  }

  const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret })

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_CODE', message: 'Verification code is incorrect or expired' } },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true },
  })

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'User',
    entityId: session.user.id,
    metadata: { event: '2fa_enabled' },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { enabled: true } })
}

// Disable 2FA
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const body = await req.json()
  const { code } = body

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!user?.twoFactorEnabled) {
    return NextResponse.json({ success: false, error: { code: 'NOT_ENABLED', message: '2FA is not enabled' } }, { status: 400 })
  }

  // Require valid code to disable 2FA
  if (user.twoFactorSecret) {
    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret })
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CODE', message: 'Current 2FA code required to disable' } },
        { status: 400 }
      )
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'User',
    entityId: session.user.id,
    metadata: { event: '2fa_disabled' },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { disabled: true } })
}
