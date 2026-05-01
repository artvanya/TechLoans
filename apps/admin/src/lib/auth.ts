// apps/admin/src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@nexus/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { writeAuditLog } from './audit'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER'] as const

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'admin-credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }).safeParse(credentials)

        if (!parsed.success) return null

        const { email, password } = parsed.data
        const ip = (req as any)?.headers?.['x-forwarded-for'] ?? 'unknown'

        // IP allowlist check (if configured)
        const allowedIps = process.env.ADMIN_ALLOWED_IPS
        if (allowedIps && allowedIps.length > 0) {
          const allowed = allowedIps.split(',').map((i) => i.trim())
          if (!allowed.includes(ip as string)) {
            await writeAuditLog({
              actorEmail: email,
              action: 'FAILED_LOGIN',
              entityType: 'AdminSession',
              metadata: { reason: 'IP_NOT_ALLOWED', ip },
            })
            throw new Error('ACCESS_DENIED')
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { adminProfile: true },
        })

        if (!user || !user.hashedPassword) {
          await writeAuditLog({
            actorEmail: email,
            action: 'FAILED_LOGIN',
            entityType: 'AdminSession',
            metadata: { reason: 'USER_NOT_FOUND', ip },
          })
          return null
        }

        // ONLY allow admin roles through admin portal
        if (!ADMIN_ROLES.includes(user.role as any)) {
          await writeAuditLog({
            actorEmail: email,
            action: 'FAILED_LOGIN',
            entityType: 'AdminSession',
            metadata: { reason: 'INSUFFICIENT_ROLE', role: user.role, ip },
          })
          throw new Error('NOT_ADMIN')
        }

        if (user.isLocked) throw new Error('ACCOUNT_LOCKED')

        const passwordValid = await bcrypt.compare(password, user.hashedPassword)
        if (!passwordValid) {
          const newCount = user.failedLoginCount + 1
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: newCount,
              lastFailedLogin: new Date(),
              isLocked: newCount >= 3, // stricter for admin
              lockReason: newCount >= 3 ? 'Too many failed admin login attempts' : null,
            },
          })
          await writeAuditLog({
            actorId: user.id,
            actorEmail: email,
            action: 'FAILED_LOGIN',
            entityType: 'AdminSession',
            ipAddress: ip as string,
          })
          return null
        }

        // Reset failed count on success
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lastLoginAt: new Date(), lastLoginIp: ip as string },
        })

        await writeAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          action: 'LOGIN',
          entityType: 'AdminSession',
          entityId: user.id,
          ipAddress: ip as string,
        })

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.adminProfile?.firstName ?? '',
          lastName: user.adminProfile?.lastName ?? '',
          permissions: user.adminProfile?.permissions ?? [],
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.permissions = (user as any).permissions
        token.firstName = (user as any).firstName
        token.lastName = (user as any).lastName
      }
      return token
    },
    async session({ session, token }) {
      ;(session.user as any).id = token.id
      ;(session.user as any).role = token.role
      ;(session.user as any).permissions = token.permissions
      ;(session.user as any).firstName = token.firstName
      ;(session.user as any).lastName = token.lastName
      return session
    },
  },
})
