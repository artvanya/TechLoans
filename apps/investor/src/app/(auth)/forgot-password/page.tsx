'use client'
// apps/investor/src/app/(auth)/forgot-password/page.tsx
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSent(true) // always show success to prevent enumeration
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', fontFamily: "'Outfit', sans-serif", color: '#EDEAE3' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, letterSpacing: '4px', color: '#BFA063' }}>NEXUS</div>
        </div>
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 14, padding: 28 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>✉</div>
              <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Check your inbox</h1>
              <p style={{ fontSize: 12.5, color: '#7A7873', lineHeight: 1.7, marginBottom: 20 }}>
                If <strong style={{ color: '#EDEAE3' }}>{email}</strong> is registered, you'll receive a reset link within a few minutes.
              </p>
              <Link href="/login" style={{ display: 'block', padding: '11px', background: '#BFA063', color: '#09090B', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                Return to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Reset your password</h1>
              <p style={{ fontSize: 12.5, color: '#7A7873', marginBottom: 22 }}>Enter your registered email and we'll send a reset link.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7873', marginBottom: 6 }}>Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    style={{ width: '100%', padding: '10px 13px', background: '#141618', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 8, color: '#EDEAE3', fontSize: 13, outline: 'none' }}
                    placeholder="your@email.com" />
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: 12, background: '#BFA063', color: '#09090B', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <div style={{ marginTop: 18, textAlign: 'center' }}>
                <Link href="/login" style={{ fontSize: 12, color: '#7A7873' }}>← Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
