'use client'
// apps/investor/src/components/wallet/test-funds-panel.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESETS = [
  { label: '+ £10,000', amount: 10_000 },
  { label: '+ £50,000', amount: 50_000 },
  { label: '+ £250,000', amount: 250_000 },
]

export function TestFundsPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!enabled) return null

  async function credit(amount: number) {
    setLoadingAmount(amount)
    setError(null)
    try {
      const res = await fetch('/api/wallet/test-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message ?? 'Failed')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoadingAmount(null)
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/35 bg-amber-500/[0.06] p-4">
      <div className="text-[10px] tracking-[1.5px] uppercase text-amber-500/90 mb-1">Sandbox — test funds</div>
      <p className="text-[12px] text-nexus-muted leading-relaxed mb-3">
        Add dummy GBP to your wallet for investing. No bank or chain linking. Disabled outside development unless{' '}
        <code className="text-[10px] text-nexus-gold">ENABLE_TEST_WALLET_TOPUP=true</code>.
      </p>
      {error && <div className="text-[12px] text-nexus-red mb-2">{error}</div>}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ label, amount }) => (
          <button
            key={amount}
            type="button"
            disabled={loadingAmount !== null}
            onClick={() => credit(amount)}
            className="px-3 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
          >
            {loadingAmount === amount ? '…' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
