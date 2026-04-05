'use client'
// apps/admin/src/components/investment-edit-form.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InvestmentDealData {
  id: string
  name: string
  status: string
  propertyType: string
  propertyCity: string
  propertyRegion: string
  propertyDescription: string
  loanAmount: number
  propertyValuation: number
  ltv: number
  investorApr: number
  loanDurationMonths: number
  minimumInvestment: number
  borrowerType: string
  borrowerPurpose: string
  visibleToInvestors: boolean
  openForInvestment: boolean
  isFeatured: boolean
}

const STATUS_OPTIONS = [
  { value: 'DRAFT',  label: 'Draft' },
  { value: 'LIVE',   label: 'Live — open for investment' },
  { value: 'ACTIVE', label: 'Active — fully funded' },
  { value: 'REPAID', label: 'Repaid — closed' },
]

function calcProjected(loan: number, apr: number, months: number) {
  if (!loan || !apr || !months) return { total: '', investor: '' }
  const total = loan * (apr / 100) * (months / 12)
  const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
  return { total: fmt(total), investor: fmt(total * 0.7) }
}

export function InvestmentEditForm({ deal }: { deal: InvestmentDealData }) {
  const router = useRouter()
  const [form, setForm] = useState(deal)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'details' | 'financials' | 'visibility'>('details')

  const projected = calcProjected(form.loanAmount, form.investorApr, form.loanDurationMonths)

  function set(k: keyof InvestmentDealData, v: any) {
    setForm(f => {
      const updated = { ...f, [k]: v }
      if ((k === 'loanAmount' || k === 'propertyValuation') && updated.loanAmount > 0 && updated.propertyValuation > 0) {
        updated.ltv = Math.round(updated.loanAmount / updated.propertyValuation * 1000) / 10
      }
      return updated
    })
  }

  async function save() {
    setError(null); setLoading(true)
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        status: form.status,
        propertyType: form.propertyType,
        propertyCity: form.propertyCity,
        propertyRegion: form.propertyRegion,
        propertyDescription: form.propertyDescription,
        loanAmount: form.loanAmount,
        propertyValuation: form.propertyValuation,
        investorApr: form.investorApr,
        loanDurationMonths: form.loanDurationMonths,
        minimumInvestment: form.minimumInvestment,
        targetRaise: form.loanAmount,
        borrowerType: form.borrowerType,
        borrowerPurpose: form.borrowerPurpose,
        visibleToInvestors: form.visibleToInvestors,
        openForInvestment: form.openForInvestment,
        isFeatured: form.isFeatured,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    else setError(data.error?.message ?? 'Save failed')
  }

  const s: React.CSSProperties = { background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12.5px', outline: 'none', padding: '9px 12px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
  const ta: React.CSSProperties = { ...s, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }
  const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }
  const g3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }

  return (
    <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', alignItems: 'center' }}>
        {(['details', 'financials', 'visibility'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '11px 18px', fontSize: '12.5px', fontWeight: tab === t ? 600 : 400, color: tab === t ? '#C4A355' : '#7C7A74', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? '#C4A355' : 'transparent'}`, cursor: 'pointer', textTransform: 'capitalize', marginBottom: '-1px' }}>
            {t === 'details' ? 'Details' : t === 'financials' ? 'Financials' : 'Visibility'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...s, width: 'auto', padding: '5px 10px', fontSize: '11px', fontWeight: 600 }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={save} disabled={loading} style={{ background: saved ? '#2CC89A' : '#C4A355', color: '#0A0A0C', border: 'none', borderRadius: '7px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {saved ? '✓ Saved' : loading ? '...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {error && <div style={{ marginBottom: '14px', fontSize: '12px', color: '#E05C5C' }}>{error}</div>}

        {tab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={g3}>
              <div>
                <label style={lbl}>Property Type</label>
                <select value={form.propertyType} onChange={e => set('propertyType', e.target.value)} style={{ ...s, appearance: 'none' as any }}>
                  <option value="">— select —</option>
                  {['Apartment', 'House', 'Commercial', 'Land'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>City</label>
                <input value={form.propertyCity} onChange={e => set('propertyCity', e.target.value)} style={s} />
              </div>
              <div>
                <label style={lbl}>District / Region</label>
                <input value={form.propertyRegion} onChange={e => set('propertyRegion', e.target.value)} style={s} />
              </div>
            </div>
            <div>
              <label style={lbl}>Property Description</label>
              <textarea value={form.propertyDescription} onChange={e => set('propertyDescription', e.target.value)} style={ta} />
            </div>
            <div style={g2}>
              <div>
                <label style={lbl}>Borrower Type</label>
                <select value={form.borrowerType} onChange={e => set('borrowerType', e.target.value)} style={{ ...s, appearance: 'none' as any }}>
                  <option value="">— select —</option>
                  {['Individual', 'Business'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Loan Purpose</label>
                <input value={form.borrowerPurpose} onChange={e => set('borrowerPurpose', e.target.value)} style={s} placeholder="e.g. Refinancing, acquisition..." />
              </div>
            </div>
            <div>
              <label style={lbl}>Deal Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} style={s} />
            </div>
          </div>
        )}

        {tab === 'financials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={g3}>
              <div>
                <label style={lbl}>Property Valuation (£)</label>
                <input type="number" value={form.propertyValuation} onChange={e => set('propertyValuation', parseFloat(e.target.value) || 0)} style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>Loan Amount (£)</label>
                <input type="number" value={form.loanAmount} onChange={e => set('loanAmount', parseFloat(e.target.value) || 0)} style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>LTV (auto)</label>
                <input readOnly value={`${form.ltv}%`} style={{ ...s, background: '#141618', color: form.ltv > 72 ? '#E05C5C' : '#7C7A74' }} />
              </div>
            </div>
            <div style={g3}>
              <div>
                <label style={lbl}>Minimum Investment (£)</label>
                <input type="number" value={form.minimumInvestment} onChange={e => set('minimumInvestment', parseFloat(e.target.value) || 0)} style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>Interest Rate (% / year)</label>
                <input type="number" step="0.01" value={form.investorApr} onChange={e => set('investorApr', parseFloat(e.target.value) || 0)} style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>Planned Term (months)</label>
                <input type="number" value={form.loanDurationMonths} onChange={e => set('loanDurationMonths', parseInt(e.target.value) || 0)} style={{ ...s, fontFamily: 'monospace' }} />
              </div>
            </div>

            {/* Projected */}
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginTop: '4px' }}>
              Projected Returns
              <span style={{ fontSize: '9px', color: '#7C7A74', marginLeft: 8, letterSpacing: 0, textTransform: 'none' }}>estimated · 70% investor split</span>
            </div>
            <div style={g2}>
              <div>
                <label style={lbl}>Projected Total Income</label>
                <input readOnly value={projected.total} placeholder="—" style={{ ...s, background: '#141618', color: projected.total ? '#C4A355' : '#5C5B57' }} />
              </div>
              <div>
                <label style={lbl}>Projected Investor Income</label>
                <input readOnly value={projected.investor} placeholder="—" style={{ ...s, background: '#141618', color: projected.investor ? '#2CC89A' : '#5C5B57' }} />
              </div>
            </div>
          </div>
        )}

        {tab === 'visibility' && (
          <div style={{ maxWidth: '500px' }}>
            {[
              { k: 'visibleToInvestors', l: 'Visible to Investors',    d: 'Deal appears on the investor portal' },
              { k: 'openForInvestment',  l: 'Open for Investment',     d: 'Investors can allocate capital' },
              { k: 'isFeatured',         l: 'Featured Deal',           d: 'Highlighted at top of investor marketplace' },
            ].map(({ k, l, d }) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <div style={{ fontSize: '13px' }}>{l}</div>
                  <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '2px' }}>{d}</div>
                </div>
                <button onClick={() => set(k as any, !(form as any)[k])} style={{ width: 40, height: 22, borderRadius: '11px', border: 'none', background: (form as any)[k] ? '#2DC99A' : '#1A1C20', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'all 0.2s', left: (form as any)[k] ? 21 : 3 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
