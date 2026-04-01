'use client'
// apps/admin/src/components/settings-form.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  settings: Record<string, string>
}

const GROUPS = [
  {
    title: 'Platform',
    keys: [
      { key: 'platform.min_investment_global', label: 'Global Min. Investment (£)', type: 'number', desc: 'Minimum investment across all deals' },
      { key: 'platform.max_ltv_policy', label: 'Max LTV Policy (%)', type: 'number', desc: 'Deals exceeding this LTV are auto-flagged' },
      { key: 'platform.kyc_validity_months', label: 'KYC Validity (months)', type: 'number', desc: 'How long before KYC refresh is required' },
      { key: 'platform.withdrawal_min_gbp', label: 'Min Withdrawal (£)', type: 'number', desc: 'Minimum withdrawal amount' },
      { key: 'platform.new_investor_registration_enabled', label: 'New Registrations', type: 'toggle', desc: 'Allow new investors to sign up' },
      { key: 'platform.maintenance_mode', label: 'Maintenance Mode', type: 'toggle', desc: 'Show maintenance page to all users' },
      { key: 'platform.maintenance_message', label: 'Maintenance Message', type: 'text', desc: 'Message shown during maintenance' },
    ],
  },
  {
    title: 'Features',
    keys: [
      { key: 'auto_invest.global_enabled', label: 'Auto-Invest Feature', type: 'toggle', desc: 'Enable auto-invest for all investors' },
      { key: 'credit_line.global_enabled', label: 'Credit Line Feature', type: 'toggle', desc: 'Enable credit line for eligible investors' },
      { key: 'crypto.deposits_enabled', label: 'Crypto Deposits', type: 'toggle', desc: 'Allow USDC/USDT deposits (requires Fireblocks)' },
      { key: 'crypto.withdrawals_enabled', label: 'Crypto Withdrawals', type: 'toggle', desc: 'Allow crypto withdrawals (requires Fireblocks)' },
    ],
  },
  {
    title: 'Email & Notifications',
    keys: [
      { key: 'email.kyc_reminder_days_before', label: 'KYC Reminder (days before expiry)', type: 'number', desc: 'When to send KYC refresh reminder' },
      { key: 'email.deal_update_notifications', label: 'Deal Update Emails', type: 'toggle', desc: 'Send emails when deals are updated' },
    ],
  },
]

export function SettingsForm({ settings }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({ ...settings })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function toggle(key: string) {
    setValues((v) => ({ ...v, [key]: v[key] === 'true' ? 'false' : 'true' }))
  }

  async function save() {
    setError(null); setLoading(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: values }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    else setError(data.error?.message ?? 'Save failed')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: '#18191E', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '8px', color: '#E8E6DF', fontSize: '12.5px', outline: 'none',
    fontFamily: "'DM Mono', monospace",
  }

  return (
    <div>
      {GROUPS.map((group) => (
        <div key={group.title} style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{group.title}</div>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {group.keys.map(({ key, label, type, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '2px' }}>{desc}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {type === 'toggle' ? (
                    <button
                      onClick={() => toggle(key)}
                      style={{
                        width: 40, height: 22, borderRadius: '11px', border: 'none',
                        background: values[key] === 'true' ? '#2DC99A' : '#1A1C20',
                        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 3, width: 16, height: 16,
                        borderRadius: '50%', background: '#fff', transition: 'all 0.2s',
                        left: values[key] === 'true' ? 21 : 3,
                      }} />
                    </button>
                  ) : type === 'number' ? (
                    <input
                      type="number"
                      value={values[key] ?? ''}
                      onChange={(e) => set(key, e.target.value)}
                      style={{ ...inputStyle, width: '120px' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[key] ?? ''}
                      onChange={(e) => set(key, e.target.value)}
                      style={{ ...inputStyle, width: '280px', fontFamily: "'Outfit', sans-serif" }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && <div style={{ marginBottom: '12px', fontSize: '12px', color: '#E05C5C' }}>{error}</div>}

      <button
        onClick={save}
        disabled={loading}
        style={{
          background: '#C4A355', color: '#0A0A0C', border: 'none',
          borderRadius: '9px', padding: '11px 28px', fontSize: '13px',
          fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {saved ? '✓ Settings Saved' : loading ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}
