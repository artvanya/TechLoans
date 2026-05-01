'use client'
// apps/investor/src/components/onboarding/request-verification-card.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  kycStatus: string
}

export function RequestVerificationCard({ kycStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRequest = ['NOT_STARTED', 'DOCUMENTS_REQUESTED', 'ADDITIONAL_INFO_REQUIRED', 'REJECTED'].includes(kycStatus)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/kyc/request-review', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message ?? 'Request failed')
        return
      }
      router.refresh()
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!canRequest) return null

  return (
    <div className="bg-nexus-bg2 border border-nexus-gold/25 rounded-lg p-5">
      <div className="text-[10.5px] tracking-[1.5px] uppercase text-nexus-gold mb-2">Quick verification (demo)</div>
      <p className="text-[12.5px] text-nexus-muted leading-[1.7] mb-4">
        For testing: submit your account for review without uploading documents. An operator can approve you from the admin console,
        then you can invest. Optional uploads below are not required for this flow.
      </p>
      {error && (
        <div className="text-[12px] text-nexus-red mb-3">{error}</div>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-nexus-gold text-nexus-bg text-[13px] font-semibold hover:bg-nexus-gold2 transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting…' : 'Submit for review (no documents)'}
      </button>
    </div>
  )
}
