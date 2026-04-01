'use client'
// apps/investor/src/components/credit-line/credit-line-form.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface CreditLineData {
  status: string
  approvedLimit: number
  utilised: number
  maxPerDeal: number | null
  maxPerMonth: number | null
  minApr: number | null
  maxLtv: number | null
  maxDurationMonths: number | null
  permittedRiskGrades: string[]
  permittedLoanTypes: string[]
  autoDrawEnabled: boolean
  expiresAt: string | null
}

export function CreditLineForm({ creditLine }: { creditLine: CreditLineData }) {
  const router = useRouter()
  const [form, setForm] = useState({
    maxPerDeal: creditLine.maxPerDeal?.toString() ?? '',
    maxPerMonth: creditLine.maxPerMonth?.toString() ?? '',
    minApr: creditLine.minApr?.toString() ?? '',
    maxLtv: creditLine.maxLtv?.toString() ?? '',
    maxDurationMonths: creditLine.maxDurationMonths?.toString() ?? '',
    permittedRiskGrades: [...creditLine.permittedRiskGrades],
    permittedLoanTypes: [...creditLine.permittedLoanTypes],
    autoDrawEnabled: creditLine.autoDrawEnabled,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGrade(g: string) {
    setForm((f) => ({
      ...f,
      permittedRiskGrades: f.permittedRiskGrades.includes(g)
        ? f.permittedRiskGrades.filter((x) => x !== g)
        : [...f.permittedRiskGrades, g],
    }))
  }

  async function save() {
    setError(null); setLoading(true)
    const res = await fetch('/api/credit-line', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxPerDeal: form.maxPerDeal ? parseFloat(form.maxPerDeal) : null,
        maxPerMonth: form.maxPerMonth ? parseFloat(form.maxPerMonth) : null,
        minApr: form.minApr ? parseFloat(form.minApr) : null,
        maxLtv: form.maxLtv ? parseFloat(form.maxLtv) : null,
        maxDurationMonths: form.maxDurationMonths ? parseInt(form.maxDurationMonths) : null,
        permittedRiskGrades: form.permittedRiskGrades,
        permittedLoanTypes: form.permittedLoanTypes,
        autoDrawEnabled: form.autoDrawEnabled,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    else setError(data.error?.message ?? 'Save failed')
  }

  const inputCls = "w-full px-3 py-2 bg-[#141618] border border-[rgba(255,255,255,0.13)] rounded-lg text-[#EDEAE3] font-mono text-[13px] outline-none focus:border-[#BFA063] transition-colors"
  const chipActive = (v: boolean) => `px-3 py-1.5 rounded-full text-[11.5px] font-medium border cursor-pointer transition-colors ${v ? 'border-[#BFA063] text-[#BFA063] bg-[rgba(191,160,99,0.06)]' : 'border-[rgba(255,255,255,0.07)] text-[#7A7873]'}`

  return (
    <div className="bg-nexus-bg2 border border-nexus rounded-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-1">Draw Rules</div>
          <div className="text-[11.5px] text-nexus-muted">Conditions under which the platform may draw capital</div>
        </div>
        <button onClick={() => setForm((f) => ({ ...f, autoDrawEnabled: !f.autoDrawEnabled }))}
          className={`w-10 h-5.5 rounded-full border flex items-center transition-colors relative ${form.autoDrawEnabled ? 'bg-nexus-teal border-nexus-teal' : 'bg-nexus-bg4 border-nexus2'}`}
          style={{ width: 40, height: 22 }}>
          <div className={`w-4 h-4 rounded-full transition-all absolute ${form.autoDrawEnabled ? 'right-0.5 bg-white' : 'left-0.5 bg-nexus-muted'}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { k: 'maxPerDeal', label: 'Max per Deal (£)' },
          { k: 'maxPerMonth', label: 'Max per Month (£)' },
          { k: 'minApr', label: 'Minimum APR (%)' },
          { k: 'maxLtv', label: 'Maximum LTV (%)' },
          { k: 'maxDurationMonths', label: 'Max Duration (months)' },
        ].map(({ k, label }) => (
          <div key={k}>
            <label className="block text-[9.5px] tracking-[1.2px] uppercase text-nexus-muted mb-1.5">{label}</label>
            <input type="number" value={(form as any)[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className={inputCls} />
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-2.5">Permitted Risk Grades</div>
        <div className="flex gap-2">
          {['A', 'B', 'C', 'D'].map((g) => (
            <button key={g} onClick={() => toggleGrade(g)} className={chipActive(form.permittedRiskGrades.includes(g))}>
              Grade {g}
            </button>
          ))}
        </div>
      </div>

      {creditLine.expiresAt && (
        <div className="text-[11.5px] text-nexus-muted mb-4">
          Credit line expires: <span className="text-nexus-text">{formatDate(creditLine.expiresAt, 'short')}</span>
        </div>
      )}

      {error && <div className="mb-3 text-[12px] text-nexus-red">{error}</div>}

      <button onClick={save} disabled={loading}
        className="w-full py-3 bg-nexus-gold text-nexus-bg text-[13px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
        {loading && <span className="w-4 h-4 border-2 border-nexus-bg border-t-transparent rounded-full animate-spin" />}
        {saved ? '✓ Rules Saved' : loading ? 'Saving...' : 'Save Credit Line Rules'}
      </button>
    </div>
  )
}
