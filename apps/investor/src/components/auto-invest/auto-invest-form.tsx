'use client'
// apps/investor/src/components/auto-invest/auto-invest-form.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RuleData {
  status: string
  minApr: number; maxLtv: number
  minDurationMonths: number; maxDurationMonths: number
  maxPerDeal: number; reserveCash: number
  permittedRiskGrades: string[]; permittedLoanTypes: string[]
  permittedRegions: string[]
  maxPerRegionPct: number | null; maxPerTypePct: number | null
  reinvestRepayments: boolean
}

const DEFAULT: RuleData = {
  status: 'PAUSED', minApr: 8, maxLtv: 72,
  minDurationMonths: 3, maxDurationMonths: 18,
  maxPerDeal: 25000, reserveCash: 5000,
  permittedRiskGrades: ['A', 'B'], permittedLoanTypes: [],
  permittedRegions: [], maxPerRegionPct: 50, maxPerTypePct: 40,
  reinvestRepayments: true,
}

export function AutoInvestForm({ initialRule }: { initialRule: RuleData | null }) {
  const router = useRouter()
  const [rule, setRule] = useState<RuleData>(initialRule ?? DEFAULT)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(key: keyof RuleData, value: any) { setRule((r) => ({ ...r, [key]: value })) }

  function toggleArrayItem(key: 'permittedRiskGrades' | 'permittedLoanTypes' | 'permittedRegions', item: string) {
    setRule((r) => {
      const arr = r[key] as string[]
      return { ...r, [key]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] }
    })
  }

  async function save() {
    setError(null); setLoading(true)
    const res = await fetch('/api/auto-invest', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    else setError(data.error?.message ?? 'Save failed')
  }

  const inputCls = "w-full px-3 py-2 bg-nexus-bg3 border border-nexus2 rounded-lg text-nexus-text font-mono text-[13px] outline-none focus:border-nexus-gold transition-colors"
  const chipCls = (active: boolean) => `px-3 py-1.5 rounded-full text-[11.5px] font-medium border cursor-pointer transition-colors ${active ? 'border-nexus-gold text-nexus-gold bg-nexus-gold/5' : 'border-nexus text-nexus-muted hover:border-nexus2'}`

  return (
    <div className="bg-nexus-bg2 border border-nexus rounded-lg p-6">
      {/* Toggle header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-1">Auto-Invest Rules Engine</div>
          <div className="text-[11.5px] text-nexus-muted">Runs each time a new deal is published</div>
        </div>
        <button
          onClick={() => setField('status', rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
          className={`w-10 h-5.5 rounded-full border flex items-center transition-colors relative ${rule.status === 'ACTIVE' ? 'bg-nexus-teal border-nexus-teal' : 'bg-nexus-bg4 border-nexus2'}`}
          style={{ width: 40, height: 22 }}
        >
          <div className={`w-4 h-4 rounded-full transition-all absolute ${rule.status === 'ACTIVE' ? 'right-0.5 bg-white' : 'left-0.5 bg-nexus-muted'}`} />
        </button>
      </div>

      <div className="space-y-5">
        {/* Core criteria */}
        <div>
          <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-3 pb-2 border-b border-nexus">Core Criteria</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'minApr' as const, label: 'Minimum APR (%)', type: 'number', step: '0.5' },
              { key: 'maxLtv' as const, label: 'Maximum LTV (%)', type: 'number' },
              { key: 'minDurationMonths' as const, label: 'Min Duration (months)', type: 'number' },
              { key: 'maxDurationMonths' as const, label: 'Max Duration (months)', type: 'number' },
              { key: 'maxPerDeal' as const, label: 'Max per Deal (£)', type: 'number' },
              { key: 'reserveCash' as const, label: 'Reserve Cash (£)', type: 'number' },
            ].map(({ key, label, type, step }) => (
              <div key={key}>
                <label className="block text-[9.5px] tracking-[1px] uppercase text-nexus-muted mb-1.5">{label}</label>
                <input type={type} step={step ?? '1'} value={rule[key] as number}
                  onChange={(e) => setField(key, parseFloat(e.target.value) || 0)}
                  className={inputCls} />
              </div>
            ))}
          </div>
        </div>

        {/* Risk grades */}
        <div>
          <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-2.5">Permitted Risk Grades</div>
          <div className="flex gap-2">
            {['A', 'B', 'C', 'D'].map((g) => (
              <button key={g} onClick={() => toggleArrayItem('permittedRiskGrades', g)}
                className={chipCls(rule.permittedRiskGrades.includes(g))}>
                Grade {g}
              </button>
            ))}
          </div>
        </div>

        {/* Loan types */}
        <div>
          <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-2.5">Loan Types (empty = all)</div>
          <div className="flex flex-wrap gap-2">
            {['BRIDGE_FINANCE', 'DEVELOPMENT_FINANCE', 'BUY_TO_LET', 'COMMERCIAL_BRIDGE'].map((t) => {
              const labels: Record<string, string> = { BRIDGE_FINANCE: 'Bridge', DEVELOPMENT_FINANCE: 'Development', BUY_TO_LET: 'Buy-to-Let', COMMERCIAL_BRIDGE: 'Commercial' }
              return (
                <button key={t} onClick={() => toggleArrayItem('permittedLoanTypes', t)}
                  className={chipCls(rule.permittedLoanTypes.length === 0 || rule.permittedLoanTypes.includes(t))}>
                  {labels[t]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Diversification */}
        <div>
          <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-3 pb-2 border-b border-nexus">Diversification</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[9.5px] tracking-[1px] uppercase text-nexus-muted mb-1.5">Max per Region (%)</label>
              <input type="number" value={rule.maxPerRegionPct ?? ''} placeholder="e.g. 50"
                onChange={(e) => setField('maxPerRegionPct', parseFloat(e.target.value) || null)}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-[9.5px] tracking-[1px] uppercase text-nexus-muted mb-1.5">Max per Type (%)</label>
              <input type="number" value={rule.maxPerTypePct ?? ''} placeholder="e.g. 40"
                onChange={(e) => setField('maxPerTypePct', parseFloat(e.target.value) || null)}
                className={inputCls} />
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5 border border-nexus rounded-lg px-4">
            <div>
              <div className="text-[12.5px]">Reinvest repayments automatically</div>
              <div className="text-[10.5px] text-nexus-muted mt-0.5">Re-deploy returned capital without manual action</div>
            </div>
            <button onClick={() => setField('reinvestRepayments', !rule.reinvestRepayments)}
              className={`w-9 h-5 rounded-full border flex items-center transition-colors relative ${rule.reinvestRepayments ? 'bg-nexus-teal border-nexus-teal' : 'bg-nexus-bg4 border-nexus2'}`}>
              <div className={`w-3.5 h-3.5 rounded-full transition-all absolute ${rule.reinvestRepayments ? 'right-0.5 bg-white' : 'left-0.5 bg-nexus-muted'}`} />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mt-4 text-[12px] text-nexus-red">{error}</div>}

      <button onClick={save} disabled={loading}
        className="w-full mt-5 py-3 bg-nexus-gold text-nexus-bg text-[13px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
        {loading && <span className="w-4 h-4 border-2 border-nexus-bg border-t-transparent rounded-full animate-spin" />}
        {saved ? '✓ Rules Saved' : loading ? 'Saving...' : 'Save Auto-Invest Rules'}
      </button>
    </div>
  )
}
