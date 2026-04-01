'use client'
// apps/admin/src/app/login/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const ERROR_MSGS: Record<string, string> = {
  NOT_ADMIN: 'This account does not have operator access.',
  ACCOUNT_LOCKED: 'Account locked after repeated failed attempts. Contact your system administrator.',
  ACCESS_DENIED: 'Access denied from this IP address.',
  CredentialsSignin: 'Invalid email or password.',
  default: 'Login failed. Please try again.',
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const res = await signIn('admin-credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) { setError(ERROR_MSGS[res.error] ?? ERROR_MSGS.default); return }
    router.push('/')
  }

  const inputStyle = { width: '100%', padding: '10px 13px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#E8E6DF' }}>
      <div style={{ width: 380, padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', letterSpacing: '4px', color: '#C4A355' }}>NEXUS</div>
          <div style={{ fontSize: '9.5px', letterSpacing: '2.5px', textTransform: 'uppercase', color: '#7C7A74', marginTop: '4px' }}>Operator Console</div>
        </div>

        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '14px', padding: '28px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Operator sign in</h1>
          <p style={{ fontSize: '12.5px', color: '#7C7A74', marginBottom: '22px' }}>Restricted access — authorised personnel only.</p>

          {error && (
            <div style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '12px', color: '#E05C5C' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} placeholder="operator@nexusprivatecredit.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '6px' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={inputStyle} placeholder="••••••••••••" />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#C4A355', color: '#0A0A0C', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? 'Signing in...' : 'Sign in to console'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#3E3D3B', marginTop: '20px' }}>
          All access is logged and monitored. Unauthorised access attempts are reported.
        </p>
      </div>
    </div>
  )
}
