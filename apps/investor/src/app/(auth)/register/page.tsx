'use client'
// apps/investor/src/app/(auth)/register/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/login?registered=1')
        return
      }
      if (data.error?.fields) setErrors(data.error.fields)
      else setErrors({ _: data.error?.message ?? 'Registration failed' })
    } catch {
      setErrors({ _: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field: string) => ({
    width: '100%',
    padding: '11px 13px',
    background: '#141618',
    border: `1px solid ${errors[field] ? '#E05555' : 'rgba(255,255,255,0.13)'}`,
    borderRadius: 8,
    color: '#EDEAE3',
    fontSize: 13,
    outline: 'none',
  })

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4" style={{ fontFamily: "'Outfit', sans-serif", color: '#EDEAE3' }}>
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, letterSpacing: '4px', color: '#BFA063' }}>NEXUS</div>
          <div style={{ fontSize: 9.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#7A7873', marginTop: 5 }}>Private Credit · Institutional</div>
        </div>

        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 14, padding: 28 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 22 }}>Create account</h1>

          {errors._ && (
            <div style={{ background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#E05555' }}>
              {errors._}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 9.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7873', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={inputStyle('email')}
              />
              {errors.email && <div style={{ fontSize: 11, color: '#E05555', marginTop: 4 }}>{Array.isArray(errors.email) ? errors.email[0] : errors.email}</div>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 9.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7873', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min 8 characters"
                style={inputStyle('password')}
              />
              {errors.password && <div style={{ fontSize: 11, color: '#E05555', marginTop: 4 }}>{Array.isArray(errors.password) ? errors.password[0] : errors.password}</div>}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: 12, background: '#BFA063', color: '#09090B', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#7A7873' }}>Already have an account? <Link href="/login" style={{ color: '#BFA063' }}>Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
