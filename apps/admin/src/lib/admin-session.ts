// apps/admin/src/lib/admin-session.ts
// Simple signed-cookie session for the admin console (no NextAuth)
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'nexus-admin-session'
const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? 'fallback-secret-change-in-production'
)

export interface AdminSession {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
}

export async function createAdminCookie(session: AdminSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as AdminSession
  } catch {
    return null
  }
}

export { COOKIE_NAME }
