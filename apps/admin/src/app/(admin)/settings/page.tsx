// apps/admin/src/app/(admin)/settings/page.tsx
import { prisma } from '@nexus/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  const stored = await prisma.platformSetting.findMany()
  const settings = Object.fromEntries(stored.map((s) => [s.key, s.value]))

  const defaults: Record<string, string> = {
    'platform.min_investment_global': '1000',
    'platform.max_ltv_policy': '72',
    'platform.kyc_validity_months': '12',
    'platform.withdrawal_min_gbp': '100',
    'platform.new_investor_registration_enabled': 'true',
    'platform.maintenance_mode': 'false',
    'platform.maintenance_message': '',
    'email.kyc_reminder_days_before': '30',
    'auto_invest.global_enabled': 'true',
    'credit_line.global_enabled': 'true',
    'crypto.deposits_enabled': 'false',
    'crypto.withdrawals_enabled': 'false',
  }

  const merged = { ...defaults, ...settings }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Platform Settings</div>
        <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '3px' }}>Super Admin only · All changes are audit-logged</div>
      </div>
      <SettingsForm settings={merged} />
    </div>
  )
}
