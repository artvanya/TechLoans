// apps/admin/src/app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexus/db'
import bcrypt from 'bcryptjs'
import { createAdminCookie, COOKIE_NAME } from '@/lib/admin-session'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER']

// POST /api/admin/auth — login
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { adminProfile: true },
  })

  if (!user || !user.hashedPassword || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (!user.isActive || user.isLocked) {
    return NextResponse.json({ error: 'Account is locked or inactive' }, { status: 403 })
  }

  const valid = await bcrypt.compare(password, user.hashedPassword)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0 },
  })

  const token = await createAdminCookie({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.adminProfile?.firstName ?? '',
    lastName: user.adminProfile?.lastName ?? '',
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}

// DELETE /api/admin/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE_NAME)
  return res
}
