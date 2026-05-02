'use client'
// apps/investor/src/app/(auth)/login/page.tsx
import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMITED:          'Too many login attempts. Please wait 15 minutes and try again.',
  WRONG_PORTAL:          'Admin accounts must use the operator console.',
  ACCOUNT_LOCKED:        'Your account has been locked. Contact support@nexusprivatecredit.com.',
  ACCOUNT_INACTIVE:      'Your account is inactive. Contact support.',
  EMAIL_NOT_VERIFIED:    'Please verify your email address before logging in.',
  CredentialsSignin:     'Incorrect email or password.',
  default:               'Login failed. Please check your details and try again.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/portfolio'
  const urlError = searchParams.get('error')

  const registered = searchParams.get('registered') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    urlError ? (ERROR_MESSAGES[urlError] ?? ERROR_MESSAGES.default) : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.default)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-nexus-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="font-serif text-[28px] tracking-[5px] text-nexus-gold uppercase mb-1">Nexus</div>
          <div className="text-[9.5px] tracking-[2.5px] uppercase text-nexus-muted">Private Credit · Institutional</div>
        </div>

        <div className="bg-nexus-bg2 border border-nexus2 rounded-xl p-7">
          <h1 className="text-[18px] font-semibold mb-1.5">Investor sign in</h1>
          <p className="text-[12.5px] text-nexus-muted mb-6">Access your portfolio and available loan opportunities.</p>

          {registered && !error && (
            <div className="bg-[rgba(191,160,99,0.1)] border border-[rgba(191,160,99,0.25)] rounded-lg px-3.5 py-2.5 mb-5">
              <p className="text-[12px] text-nexus-gold">Account created — sign in below.</p>
            </div>
          )}

          {error && (
            <div className="bg-nexus-red/10 border border-nexus-red/20 rounded-lg px-3.5 py-2.5 mb-5">
              <p className="text-[12px] text-nexus-red">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-nexus-bg3 border border-nexus2 rounded-lg text-nexus-text text-[13px] outline-none focus:border-nexus-gold transition-colors placeholder:text-nexus-hint"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted">Password</label>
                <Link href="/forgot-password" className="text-[11px] text-nexus-muted hover:text-nexus-gold transition-colors">
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 bg-nexus-bg3 border border-nexus2 rounded-lg text-nexus-text text-[13px] outline-none focus:border-nexus-gold transition-colors placeholder:text-nexus-hint"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-nexus-gold text-nexus-bg text-[13px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-nexus-bg border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-nexus text-center">
            <p className="text-[12px] text-nexus-muted">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-nexus-gold hover:underline">Create account</Link>
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-nexus-hint">
          Nexus is a private platform restricted to verified investors.
          <br />Capital at risk. Not regulated advice.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-nexus-bg flex items-center justify-center px-4">
          <div className="w-full max-w-[380px] text-center text-[13px] text-nexus-muted">Loading…</div>
        </div>
      )}
    >
      <LoginForm />
    </Suspense>
  )
}
