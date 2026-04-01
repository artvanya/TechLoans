// apps/investor/src/app/(portal)/settings/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatDate } from '@/lib/utils'
import { TwoFactorSetup } from '@/components/settings/two-factor-setup'
import { ChangePasswordForm } from '@/components/settings/change-password-form'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  const userId = session!.user.id

  const [user, profile, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true, twoFactorEnabled: true, lastLoginAt: true, lastLoginIp: true, createdAt: true },
    }),
    prisma.investorProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true, tier: true, kycStatus: true },
    }),
    prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  if (!user) return null

  return (
    <div className="flex flex-col gap-5 animate-fadeIn max-w-[700px] mx-auto w-full">
      <h1 className="font-serif text-[24px]">Account Settings</h1>

      {/* Profile summary */}
      <Panel>
        <div className="p-5">
          <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">Account Information</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Name', value: `${profile?.firstName} ${profile?.lastName}` },
              { label: 'Email', value: user.email },
              { label: 'Member Since', value: formatDate(user.createdAt.toISOString(), 'medium') },
              { label: 'Last Login', value: user.lastLoginAt ? formatDate(user.lastLoginAt.toISOString(), 'medium') : '—' },
              { label: 'Account Tier', value: profile?.tier ?? '—', badge: true },
              { label: 'KYC Status', value: profile?.kycStatus ?? '—', badge: true },
            ].map(({ label, value, badge }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="text-[9.5px] tracking-[1.2px] uppercase text-nexus-muted">{label}</div>
                {badge ? <Badge status={value}>{value?.replace(/_/g, ' ')}</Badge> : <div className="text-[13px]">{value}</div>}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Two-factor auth */}
      <Panel>
        <PanelHeader
          title="Two-Factor Authentication"
          subtitle={user.twoFactorEnabled ? 'TOTP authentication is active on your account' : 'Protect your account with an authenticator app'}
        />
        <div className="p-5">
          <TwoFactorSetup enabled={user.twoFactorEnabled} />
        </div>
      </Panel>

      {/* Change password */}
      <Panel>
        <PanelHeader title="Change Password" />
        <div className="p-5">
          <ChangePasswordForm />
        </div>
      </Panel>

      {/* Active sessions */}
      <Panel>
        <PanelHeader title="Active Sessions" subtitle="Recent login sessions on your account" />
        <div className="divide-y divide-nexus">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="text-[12.5px] font-medium">{s.userAgent?.slice(0, 60) ?? 'Unknown device'}</div>
                <div className="text-[10.5px] text-nexus-muted mt-0.5">
                  IP: {s.ipAddress ?? '—'} · Created {formatDate(s.createdAt.toISOString(), 'short')}
                  {s.expiresAt < new Date() ? ' · Expired' : ` · Expires ${formatDate(s.expiresAt.toISOString(), 'short')}`}
                </div>
              </div>
              {s.expiresAt >= new Date() && <Badge variant="green">Active</Badge>}
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="px-5 py-4 text-[12px] text-nexus-muted">No active sessions</div>
          )}
        </div>
      </Panel>

      {/* Danger zone */}
      <div className="bg-nexus-red/[0.04] border border-nexus-red/15 rounded-lg p-5">
        <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-red mb-3">Account Actions</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium mb-1">Close Account</div>
            <div className="text-[12px] text-nexus-muted">Permanently closes your account. Active investments are not affected.</div>
          </div>
          <button className="px-4 py-2 bg-transparent text-nexus-red border border-nexus-red/30 rounded-lg text-[12px] hover:border-nexus-red transition-colors">
            Request Closure
          </button>
        </div>
      </div>
    </div>
  )
}
