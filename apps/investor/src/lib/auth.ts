// apps/investor/src/lib/auth.ts
import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@nexus/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { checkLoginRateLimit, recordFailedLogin, clearFailedLogins } from './rate-limit'
import { writeAuditLog } from './audit'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      kycStatus: string
      investorTier: string
    } & DefaultSession['user']
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const ip = (req as any)?.headers?.['x-forwarded-for'] ?? 'unknown'

        // Rate limiting
        const rateLimit = await checkLoginRateLimit(ip as string, email)
        if (!rateLimit.allowed) {
          throw new Error('RATE_LIMITED')
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { investorProfile: true },
        })

        if (!user || !user.hashedPassword) {
          await recordFailedLogin(email, ip)
          return null
        }

        // Investor portal only — block admin users
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'COMPLIANCE_OFFICER') {
          throw new Error('WRONG_PORTAL')
        }

        if (user.isLocked) {
          throw new Error('ACCOUNT_LOCKED')
        }

        if (!user.isActive) {
          throw new Error('ACCOUNT_INACTIVE')
        }

        const passwordValid = await bcrypt.compare(password, user.hashedPassword)
        if (!passwordValid) {
          await recordFailedLogin(email, ip)
          const failCount = user.failedLoginCount + 1
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: failCount,
              lastFailedLogin: new Date(),
              isLocked: failCount >= 5,
              lockReason: failCount >= 5 ? 'Too many failed login attempts' : null,
            },
          })
          return null
        }

        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }

        // Clear failed login count on success
        await clearFailedLogins(email, ip)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lastLoginAt: new Date(),
            lastLoginIp: ip as string,
          },
        })

        await writeAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          ipAddress: ip as string,
        })

        const fullName = [user.investorProfile?.firstName, user.investorProfile?.lastName]
          .filter(Boolean).join(' ')

        return {
          id: user.id,
          email: user.email,
          name: fullName || user.email,
          role: user.role,
          kycStatus: user.investorProfile?.kycStatus ?? 'NOT_STARTED',
          investorTier: user.investorProfile?.tier ?? 'STANDARD',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.kycStatus = (user as any).kycStatus
        token.investorTier = (user as any).investorTier
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.kycStatus = token.kycStatus as string
      session.user.investorTier = token.investorTier as string
      return session
    },
  },
})
