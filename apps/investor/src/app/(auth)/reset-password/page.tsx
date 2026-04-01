'use client'
// apps/investor/src/app/(auth)/reset-password/page.tsx
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!token) { setError('Invalid or missing reset token'); return }
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setDone(true); setTimeout(() => router.push('/login'), 2500) }
    else setError(data.error?.message ?? 'Reset failed')
  }

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#E05555', marginBottom: 16 }}>Invalid or missing reset token.</p>
        <Link href="/forgot-password" style={{ color: '#BFA063' }}>Request a new link</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Password updated</h2>
        <p style={{ fontSize: 12.5, color: '#7A7873' }}>Redirecting to sign in...</p>
      </div>
    )
  }

  return (
    <>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Set new password</h1>
      <p style={{ fontSize: 12.5, color: '#7A7873', marginBottom: 22 }}>Choose a strong password for your account.</p>
      {error && <div style={{ background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#E05555' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {['New Password', 'Confirm Password'].map((label, i) => (
          <div key={label}>
            <label style={{ display: 'block', fontSize: 9.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7873', marginBottom: 6 }}>{label}</label>
            <input type="password" value={i === 0 ? password : confirm} onChange={(e) => i === 0 ? setPassword(e.target.value) : setConfirm(e.target.value)} required
              placeholder="12+ characters" autoComplete={i === 0 ? 'new-password' : 'new-password'}
              style={{ width: '100%', padding: '10px 13px', background: '#141618', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 8, color: '#EDEAE3', fontSize: 13, outline: 'none' }} />
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#3D3C3A' }}>Min 12 characters · uppercase · number · special character</div>
        <button type="submit" disabled={loading}
          style={{ padding: 12, background: '#BFA063', color: '#09090B', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', fontFamily: "'Outfit', sans-serif", color: '#EDEAE3' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, letterSpacing: '4px', color: '#BFA063' }}>NEXUS</div>
        </div>
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 14, padding: 28 }}>
          <Suspense fallback={<div style={{ color: '#7A7873', fontSize: 13 }}>Loading...</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
