'use client'
// apps/investor/src/components/deals/invest-panel.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatPercent, chargeTypeLabel, riskGradeLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface InvestPanelProps {
  deal: {
    id: string
    name: string
    investorApr: number
    loanDurationMonths: number
    minimumInvestment: number
    openForInvestment: boolean
    riskGrade: string | null
    chargeType: string
    maturityDate: string | null
    remaining: number
  }
  availableBalance: number
  kycApproved: boolean
  existingInvestment: { id: string; amount: number } | null
}

export function InvestPanel({ deal, availableBalance, kycApproved, existingInvestment }: InvestPanelProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const numAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0
  const annualIncome = numAmount * (deal.investorApr / 100)
  const totalReturn = annualIncome * (deal.loanDurationMonths / 12)

  async function handleInvest() {
    setError(null)
    if (!numAmount || numAmount < deal.minimumInvestment) {
      setError(`Minimum investment is ${formatCurrency(deal.minimumInvestment)}`)
      return
    }
    if (numAmount > availableBalance) {
      setError('Amount exceeds available wallet balance')
      return
    }
    if (numAmount > deal.remaining) {
      setError(`Only ${formatCurrency(deal.remaining)} remaining in this deal`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, amount: numAmount }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message ?? 'Investment failed. Please try again.')
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-nexus-bg2 border border-nexus-teal/30 rounded-lg p-5 sticky top-0">
        <div className="text-center py-4">
          <div className="text-3xl mb-3">✓</div>
          <div className="text-[15px] font-semibold mb-2 text-nexus-teal">Investment Confirmed</div>
          <div className="text-[12px] text-nexus-muted mb-4">
            {formatCurrency(numAmount)} committed to {deal.name}.<br />
            Your position will appear in Portfolio once settled.
          </div>
          <a href="/portfolio" className="block py-2.5 bg-nexus-gold text-nexus-bg text-[12px] font-semibold rounded-lg">
            View Portfolio →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-nexus-bg2 border border-nexus2 rounded-lg p-5 sticky top-0">
      <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">Investment Allocation</div>

      {existingInvestment && (
        <div className="bg-nexus-teal/10 border border-nexus-teal/20 rounded-lg p-3 mb-4 text-[12px] text-nexus-teal">
          You have an existing position of {formatCurrency(existingInvestment.amount)} in this deal.
        </div>
      )}

      {!kycApproved && (
        <div className="bg-nexus-amber/10 border border-nexus-amber/20 rounded-lg p-3 mb-4">
          <div className="text-[12px] text-nexus-amber font-medium mb-1">KYC Required</div>
          <div className="text-[11.5px] text-nexus-muted">Complete identity verification before investing.</div>
          <a href="/onboarding" className="mt-2 block text-[11px] text-nexus-gold hover:underline">Complete verification →</a>
        </div>
      )}

      {/* Amount input */}
      <div className="mb-4">
        <div className="text-[9.5px] tracking-[1.2px] uppercase text-nexus-muted mb-1.5">Amount to invest (£)</div>
        <input
          type="number"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(null) }}
          placeholder={`Min. ${formatCurrency(deal.minimumInvestment)}`}
          className="w-full px-3 py-2.5 bg-nexus-bg3 border border-nexus2 rounded-lg text-nexus-text font-mono text-[14px] outline-none focus:border-nexus-gold transition-colors placeholder:text-nexus-hint"
        />
        {error && <div className="mt-1.5 text-[11px] text-nexus-red">{error}</div>}
      </div>

      {/* Live summary */}
      <div className="bg-nexus-bg3 rounded-lg p-3.5 mb-4">
        {[
          { label: 'Annual income',        value: numAmount ? formatCurrency(annualIncome)  : '—',      accent: 'teal' as const },
          { label: 'Total expected return', value: numAmount ? `+${formatCurrency(totalReturn)}` : '—', accent: 'gold' as const },
          { label: 'Duration',              value: `${deal.loanDurationMonths} months` },
          { label: 'Risk class',            value: riskGradeLabel(deal.riskGrade) },
          { label: 'Charge type',           value: chargeTypeLabel(deal.chargeType),                    accent: 'teal' as const },
          { label: 'Wallet balance',        value: formatCurrency(availableBalance) },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-nexus last:border-0">
            <span className="text-[12px] text-nexus-muted">{label}</span>
            <span className={`font-mono text-[13px] font-medium ${
              accent === 'teal' ? 'text-nexus-teal' :
              accent === 'gold' ? 'text-nexus-gold' : ''
            }`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Risk warning */}
      <div className="bg-nexus-red/[0.06] border border-nexus-red/10 rounded-lg p-3 mb-4 text-[11.5px] text-nexus-muted leading-[1.7]">
        Capital invested is illiquid for the duration of the loan. Investment in private credit carries risk.
        Past performance is not indicative of future results.
      </div>

      <button
        onClick={handleInvest}
        disabled={loading || !kycApproved || !deal.openForInvestment || !numAmount}
        className="w-full py-3 bg-nexus-gold text-nexus-bg text-[13px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <span className="w-4 h-4 border-2 border-nexus-bg border-t-transparent rounded-full animate-spin" /> : null}
        {!deal.openForInvestment ? 'Deal Not Open' : loading ? 'Confirming...' : 'Confirm Allocation'}
      </button>

      <button onClick={() => router.back()} className="w-full mt-2 py-2.5 text-[12px] text-nexus-muted border border-nexus rounded-lg hover:border-nexus2 hover:text-nexus-text transition-colors">
        Return to Marketplace
      </button>
    </div>
  )
}
