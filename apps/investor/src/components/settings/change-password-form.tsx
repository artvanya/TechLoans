'use client'
// apps/investor/src/components/settings/change-password-form.tsx
import { useState } from 'react'

export function ChangePasswordForm() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.next !== form.confirm) { setError('Passwords do not match'); return }
    if (form.next.length < 12) { setError('Password must be at least 12 characters'); return }

    setLoading(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSuccess(true); setForm({ current: '', next: '', confirm: '' }) }
    else setError(data.error?.message ?? 'Password change failed')
  }

  const inputCls = "w-full px-3.5 py-2.5 bg-[#141618] border border-[rgba(255,255,255,0.13)] rounded-lg text-[#EDEAE3] text-[13px] outline-none focus:border-[#BFA063] transition-colors"

  if (success) {
    return (
      <div className="text-[12.5px] text-nexus-teal">
        ✓ Password updated successfully. You may need to sign in again on other devices.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      {[
        { k: 'current', label: 'Current Password', autoComplete: 'current-password' },
        { k: 'next',    label: 'New Password',      autoComplete: 'new-password' },
        { k: 'confirm', label: 'Confirm New Password', autoComplete: 'new-password' },
      ].map(({ k, label, autoComplete }) => (
        <div key={k}>
          <label className="block text-[9.5px] tracking-[1.2px] uppercase text-nexus-muted mb-1.5">{label}</label>
          <input type="password" value={(form as any)[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            required autoComplete={autoComplete} className={inputCls} />
        </div>
      ))}
      {error && <div className="text-[12px] text-nexus-red">{error}</div>}
      <button type="submit" disabled={loading}
        className="py-2.5 bg-nexus-gold text-nexus-bg text-[12.5px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40">
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  )
}
