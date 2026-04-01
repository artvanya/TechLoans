// apps/admin/src/lib/session.ts
// Drop-in replacement for `auth()` that returns the seeded super-admin
// when DISABLE_AUTH=true, so all pages work without logging in.
import { auth } from '@/lib/auth'
import { prisma } from '@nexus/db'

export async function getSession() {
  if (process.env.DISABLE_AUTH === 'true') {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@nexus.local' },
      include: { adminProfile: true },
    })
    if (!user) throw new Error('[Dev] Seed admin not found — run: cd packages/db && npx prisma db seed')
    return {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.adminProfile?.firstName ?? ''} ${user.adminProfile?.lastName ?? ''}`.trim(),
        role: user.role as string,
        permissions: user.adminProfile?.permissions ?? [],
      },
    }
  }
  return auth()
}
