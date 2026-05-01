// apps/investor/src/lib/session.ts
// Drop-in replacement for `auth()` that returns the seeded test investor
// when DISABLE_AUTH=true, so all pages work without logging in.
import { auth } from '@/lib/auth'
import { prisma } from '@nexus/db'

export async function getSession() {
  if (process.env.DISABLE_AUTH === 'true') {
    const user = await prisma.user.findUnique({
      where: { email: 'investor@nexus.local' },
      include: { investorProfile: true },
    })
    if (!user) throw new Error('[Dev] Seed user not found — run: cd packages/db && npx prisma db seed')
    return {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: `${user.investorProfile?.firstName ?? ''} ${user.investorProfile?.lastName ?? ''}`.trim(),
        role: user.role as string,
        kycStatus: (user.investorProfile?.kycStatus ?? 'APPROVED') as string,
        investorTier: (user.investorProfile?.tier ?? 'PLATINUM') as string,
      },
    }
  }
  return auth()
}
