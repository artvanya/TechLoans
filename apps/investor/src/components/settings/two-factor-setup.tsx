'use client'
// apps/investor/src/components/settings/two-factor-setup.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [phase, setPhase] = useState<'idle' | 'setup' | 'verify' | 'disable'>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startSetup() {
    setLoading(true); setError(null)
    const res = await fetch('/api/auth/2fa/setup')
    const data = await res.json()
    setLoading(false)
    if (data.success) { setQrCode(data.data.qrCode); setSecret(data.data.secret); setPhase('setup') }
    else setError(data.error?.message ?? 'Failed to generate 2FA secret')
  }

  async function verify() {
    setLoading(true); setError(null)
    const res = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setPhase('idle'); router.refresh() }
    else setError(data.error?.message ?? 'Invalid code')
  }

  async function disable() {
    setLoading(true); setError(null)
    const res = await fetch('/api/auth/2fa/setup', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setPhase('idle'); router.refresh() }
    else setError(data.error?.message ?? 'Invalid code')
  }

  const inputCls = "w-full px-3.5 py-2.5 bg-[#141618] border border-[rgba(255,255,255,0.13)] rounded-lg text-[#EDEAE3] font-mono text-[18px] tracking-widest text-center outline-none focus:border-[#BFA063] transition-colors placeholder:text-[#3D3C3A]"

  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-between">
        <div>
          {enabled ? (
            <>
              <div className="text-[12.5px] font-medium text-nexus-teal mb-1">✓ Two-factor authentication is enabled</div>
              <div className="text-[12px] text-nexus-muted">Your account is protected by an authenticator app.</div>
            </>
          ) : (
            <>
              <div className="text-[12.5px] font-medium mb-1">Two-factor authentication is disabled</div>
              <div className="text-[12px] text-nexus-muted">We strongly recommend enabling 2FA to protect your account and investments.</div>
            </>
          )}
        </div>
        {enabled ? (
          <button onClick={() => { setPhase('disable'); setCode('') }}
            className="px-4 py-2 bg-transparent text-nexus-red border border-nexus-red/30 rounded-lg text-[12px] hover:border-nexus-red transition-colors">
            Disable 2FA
          </button>
        ) : (
          <button onClick={startSetup} disabled={loading}
            className="px-4 py-2 bg-nexus-gold text-nexus-bg text-[12.5px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40">
            {loading ? 'Loading...' : 'Enable 2FA'}
          </button>
        )}
      </div>
    )
  }

  if (phase === 'setup' && qrCode) {
    return (
      <div className="max-w-sm">
        <p className="text-[12.5px] text-nexus-muted mb-4 leading-[1.7]">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password).
        </p>
        <div className="bg-white p-3 rounded-lg inline-block mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="2FA QR Code" width={180} height={180} />
        </div>
        <div className="bg-nexus-bg3 border border-nexus rounded-lg p-3 mb-4">
          <div className="text-[9.5px] uppercase tracking-[1px] text-nexus-muted mb-1">Manual entry key</div>
          <div className="font-mono text-[12px] break-all">{secret}</div>
        </div>
        <div className="mb-3">
          <div className="text-[9.5px] uppercase tracking-[1.2px] text-nexus-muted mb-2">Enter verification code</div>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000" maxLength={6} className={inputCls} />
        </div>
        {error && <div className="mb-3 text-[12px] text-nexus-red">{error}</div>}
        <div className="flex gap-2">
          <button onClick={() => { setPhase('idle'); setQrCode(null); setSecret(null) }}
            className="flex-1 py-2.5 border border-nexus rounded-lg text-[12.5px] text-nexus-muted hover:border-nexus2 transition-colors">
            Cancel
          </button>
          <button onClick={verify} disabled={code.length !== 6 || loading}
            className="flex-1 py-2.5 bg-nexus-gold text-nexus-bg text-[12.5px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40">
            {loading ? 'Verifying...' : 'Verify & Enable'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'disable') {
    return (
      <div className="max-w-sm">
        <p className="text-[12.5px] text-nexus-muted mb-4">Enter your current 2FA code to disable two-factor authentication.</p>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000" maxLength={6} className={inputCls + ' mb-3'} />
        {error && <div className="mb-3 text-[12px] text-nexus-red">{error}</div>}
        <div className="flex gap-2">
          <button onClick={() => setPhase('idle')} className="flex-1 py-2.5 border border-nexus rounded-lg text-[12.5px] text-nexus-muted">Cancel</button>
          <button onClick={disable} disabled={code.length !== 6 || loading}
            className="flex-1 py-2.5 bg-nexus-red text-white text-[12.5px] font-semibold rounded-lg disabled:opacity-40">
            {loading ? '...' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
