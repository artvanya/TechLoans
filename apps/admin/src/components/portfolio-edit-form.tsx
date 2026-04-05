'use client'
// apps/admin/src/components/portfolio-edit-form.tsx
// Simplified edit form for portfolio (track record) deals
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PortfolioData {
  id: string
  name: string
  status: string
  // Property
  propertyType: string
  propertyCity: string
  propertyRegion: string
  propertyDescription: string
  // Financials
  loanAmount: number
  propertyValuation: number
  ltv: number
  investorApr: number
  loanDurationMonths: number
  actualDurationMonths: number | null
  originationDate: string
  actualClosingDate: string
  // Borrower
  borrowerType: string
  borrowerPurpose: string
  // Income
  companyMarginPct: number
  totalDealIncome: string
  investorIncome: string
  companyIncome: string
  // Default
  wasDefaulted: boolean
  collectionStartDate: string
  propertyRealizationPeriod: string
  propertySalePrice: string
  fundsDistribution: string
  dealComment: string
}

function calcIncome(loan: number, apr: number, months: number | null, planMonths: number, marginPct: number) {
  const term = months ?? planMonths
  if (!loan || !apr || !term) return { total: '', investor: '', company: '' }
  const total = loan * (apr / 100) * (term / 12)
  const company = total * (marginPct / 100)
  const investor = total - company
  const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
  return { total: fmt(total), investor: fmt(investor), company: fmt(company) }
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE',    label: 'Active' },
  { value: 'REPAID',    label: 'Closed' },
  { value: 'DEFAULTED', label: 'In Recovery' },
]

const PROPERTY_TYPES = ['Apartment', 'House', 'Commercial', 'Land']
const BORROWER_TYPES = ['Individual', 'Business']

// Derive a best-guess margin % from existing income strings (for pre-seeded data)
function inferMargin(total: string, company: string): number {
  const t = parseFloat(total.replace(/[^0-9.]/g, ''))
  const c = parseFloat(company.replace(/[^0-9.]/g, ''))
  if (t > 0 && c >= 0) return Math.round((c / t) * 100)
  return 30
}

export function PortfolioEditForm({ deal }: { deal: PortfolioData }) {
  const router = useRouter()
  const [form, setForm] = useState({
    ...deal,
    companyMarginPct: deal.companyMarginPct ?? inferMargin(deal.totalDealIncome, deal.companyIncome),
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'details' | 'financials' | 'outcome'>('details')

  function set(k: keyof PortfolioData, v: any) {
    setForm(f => {
      const updated = { ...f, [k]: v }
      // Recalc income when financial inputs change
      if (['loanAmount','investorApr','loanDurationMonths','actualDurationMonths','companyMarginPct'].includes(k as string)) {
        const income = calcIncome(
          updated.loanAmount, updated.investorApr,
          updated.actualDurationMonths, updated.loanDurationMonths,
          updated.companyMarginPct,
        )
        updated.totalDealIncome = income.total
        updated.investorIncome  = income.investor
        updated.companyIncome   = income.company
      }
      return updated
    })
  }

  function calcLtv(loan: number, val: number) {
    if (loan > 0 && val > 0) set('ltv', Math.round(loan / val * 1000) / 10)
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
        actualDurationMonths: form.actualDurationMonths ?? null,
        originationDate: form.originationDate || null,
        actualClosingDate: form.actualClosingDate || null,
        borrowerType: form.borrowerType,
        borrowerPurpose: form.borrowerPurpose,
        totalDealIncome: form.totalDealIncome,
        investorIncome: form.investorIncome,
        companyIncome: form.companyIncome,
        wasDefaulted: form.wasDefaulted,
        collectionStartDate: form.collectionStartDate,
        propertyRealizationPeriod: form.propertyRealizationPeriod,
        propertySalePrice: form.propertySalePrice,
        fundsDistribution: form.fundsDistribution,
        dealComment: form.dealComment,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    else setError(data.error?.message ?? 'Save failed')
  }

  const s: React.CSSProperties = {
    background: '#18191E', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '8px', color: '#E8E6DF', fontSize: '12.5px',
    outline: 'none', padding: '9px 12px', width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const ta: React.CSSProperties = { ...s, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '9.5px', letterSpacing: '1.2px',
    textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px',
  }
  const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }
  const g3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }

  return (
    <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', alignItems: 'center' }}>
        {(['details', 'financials', 'outcome'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '11px 18px', fontSize: '12.5px',
            fontWeight: tab === t ? 600 : 400,
            color: tab === t ? '#C4A355' : '#7C7A74',
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${tab === t ? '#C4A355' : 'transparent'}`,
            cursor: 'pointer', textTransform: 'capitalize', marginBottom: '-1px',
          }}>
            {t === 'details' ? 'Details' : t === 'financials' ? 'Financials' : 'Outcome'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            style={{ ...s, width: 'auto', padding: '5px 10px', fontSize: '11px', fontWeight: 600 }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={save} disabled={loading} style={{
            background: saved ? '#2CC89A' : '#C4A355', color: '#0A0A0C',
            border: 'none', borderRadius: '7px', padding: '6px 16px',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
          }}>
            {saved ? '✓ Saved' : loading ? '...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {error && <div style={{ marginBottom: '14px', fontSize: '12px', color: '#E05C5C' }}>{error}</div>}

        {/* ── Details tab ──────────────────────────────────────── */}
        {tab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={g3}>
              <div>
                <label style={lbl}>Property Type</label>
                <select value={form.propertyType} onChange={e => set('propertyType', e.target.value)} style={{ ...s, appearance: 'none' as any }}>
                  <option value="">— select —</option>
                  {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
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
                  {BORROWER_TYPES.map(t => <option key={t}>{t}</option>)}
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

        {/* ── Financials tab ───────────────────────────────────── */}
        {tab === 'financials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={g3}>
              <div>
                <label style={lbl}>Property Valuation (£)</label>
                <input type="number" value={form.propertyValuation}
                  onChange={e => { const v = parseFloat(e.target.value) || 0; set('propertyValuation', v); calcLtv(form.loanAmount, v) }}
                  style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>Loan Amount (£)</label>
                <input type="number" value={form.loanAmount}
                  onChange={e => { const v = parseFloat(e.target.value) || 0; set('loanAmount', v); calcLtv(v, form.propertyValuation) }}
                  style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>LTV (auto)</label>
                <input value={`${form.ltv}%`} readOnly style={{ ...s, background: '#141618', color: form.ltv > 72 ? '#E05C5C' : '#7C7A74' }} />
              </div>
            </div>
            <div style={g3}>
              <div>
                <label style={lbl}>Interest Rate (% / year)</label>
                <input type="number" step="0.01" value={form.investorApr}
                  onChange={e => set('investorApr', parseFloat(e.target.value) || 0)}
                  style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>Planned Term (months)</label>
                <input type="number" value={form.loanDurationMonths}
                  onChange={e => set('loanDurationMonths', parseInt(e.target.value) || 0)}
                  style={{ ...s, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>Actual Term (months)</label>
                <input type="number" value={form.actualDurationMonths ?? ''}
                  onChange={e => set('actualDurationMonths', e.target.value ? parseInt(e.target.value) : null)}
                  style={{ ...s, fontFamily: 'monospace' }} placeholder="—" />
              </div>
            </div>
            <div style={g2}>
              <div>
                <label style={lbl}>Origination Date</label>
                <input type="date" value={form.originationDate} onChange={e => set('originationDate', e.target.value)} style={s} />
              </div>
              <div>
                <label style={lbl}>Closing Date</label>
                <input type="date" value={form.actualClosingDate} onChange={e => set('actualClosingDate', e.target.value)} style={s} />
              </div>
            </div>
          </div>
        )}

        {/* ── Outcome tab ──────────────────────────────────────── */}
        {tab === 'outcome' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Income */}
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px' }}>
              Deal Returns
              <span style={{ fontSize: '9px', color: '#7C7A74', marginLeft: 8, letterSpacing: 0, textTransform: 'none' }}>
                auto-calculated from loan × rate × term
              </span>
            </div>

            {/* Margin control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(196,163,85,0.05)', border: '1px solid rgba(196,163,85,0.15)', borderRadius: 8 }}>
              <span style={{ fontSize: '12px', color: '#7C7A74', flex: 1 }}>Company margin</span>
              <input
                type="number" min="0" max="100" step="1"
                value={form.companyMarginPct}
                onChange={e => set('companyMarginPct', parseFloat(e.target.value) || 0)}
                style={{ ...s, width: 64, textAlign: 'center', fontFamily: 'monospace', padding: '6px 10px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '12px', color: '#7C7A74' }}>%</span>
              <span style={{ fontSize: '11px', color: '#5C5B57', marginLeft: 8 }}>
                Investor gets {100 - (form.companyMarginPct ?? 30)}%
              </span>
            </div>

            <div style={g3}>
              {[
                { k: 'totalDealIncome', l: 'Total Deal Income',  color: '#C4A355' },
                { k: 'investorIncome',  l: 'Investor Income',    color: '#2CC89A' },
                { k: 'companyIncome',   l: 'Company Income',     color: '#5B9CF6' },
              ].map(({ k, l, color }) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input
                    value={(form as any)[k] ?? ''}
                    onChange={e => set(k as any, e.target.value)}
                    style={{ ...s, background: '#141618', color: (form as any)[k] ? color : '#5C5B57' }}
                    placeholder="auto"
                  />
                </div>
              ))}
            </div>

            {/* Default toggle */}
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginTop: '4px' }}>
              Default
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              background: form.wasDefaulted ? 'rgba(224,92,92,0.08)' : '#18191E',
              border: `1px solid ${form.wasDefaulted ? 'rgba(224,92,92,0.3)' : 'rgba(255,255,255,0.13)'}`,
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '13px' }}>Did this deal default?</div>
                <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '2px' }}>Toggle on if the borrower defaulted on this loan</div>
              </div>
              <button onClick={() => set('wasDefaulted', !form.wasDefaulted)} style={{
                width: 40, height: 22, borderRadius: '11px', border: 'none',
                background: form.wasDefaulted ? '#E05C5C' : '#1A1C20',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}>
                <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'all 0.2s', left: form.wasDefaulted ? 21 : 3 }} />
              </button>
            </div>

            {form.wasDefaulted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '12px', borderLeft: '2px solid rgba(224,92,92,0.3)' }}>
                <div style={g2}>
                  {[
                    { k: 'collectionStartDate',       l: 'Collection Start Date' },
                    { k: 'propertyRealizationPeriod', l: 'Property Realisation Period' },
                    { k: 'propertySalePrice',          l: 'Property Sale Price' },
                    { k: 'fundsDistribution',          l: 'How Funds Were Distributed' },
                  ].map(({ k, l }) => (
                    <div key={k}>
                      <label style={lbl}>{l}</label>
                      <input value={(form as any)[k] ?? ''} onChange={e => set(k as any, e.target.value)} style={s} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={lbl}>Notes / Comment</label>
                  <textarea value={form.dealComment ?? ''} onChange={e => set('dealComment', e.target.value)} style={ta} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
