'use client'
// apps/admin/src/components/deal-edit-form.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DealData {
  id: string; name: string; status: string; type: string
  summary: string; internalNotes: string; borrowerLegalName: string
  borrowerContact: string; creditBackground: string; underwriterNotes: string
  propertyDescription: string; collateralSummary: string
  loanAmount: number; propertyValuation: number; ltv: number
  investorApr: number; targetRaise: number; currentRaised: number
  riskGrade: string; chargeType: string; underwritingSummary: string
  keyStrengths: string; keyRisks: string; downsideProtection: string
  valuationSource: string; visibleToInvestors: boolean
  openForInvestment: boolean; approvedInvestorsOnly: boolean
  isFeatured: boolean; autoInvestEligible: boolean
  // Closing & Outcome
  originationDate?: string; actualClosingDate?: string; actualDurationMonths?: number | null
  kycVerification?: string; totalDealIncome?: string; investorIncome?: string; companyIncome?: string
  // Default / Collection
  wasDefaulted?: boolean; collectionStartDate?: string; propertyRealizationPeriod?: string
  propertySalePrice?: string; fundsDistribution?: string; dealComment?: string
}

const ALL_STATUSES = ['DRAFT','UNDER_REVIEW','APPROVED','LIVE','FUNDED','ACTIVE','REPAID','DEFAULTED','CLOSED','REJECTED']

export function DealEditForm({ deal }: { deal: DealData }) {
  const router = useRouter()
  const [form, setForm] = useState(deal)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basics')

  function set(k: keyof DealData, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  function calcLtv() {
    if (form.loanAmount > 0 && form.propertyValuation > 0) {
      set('ltv', Math.round(form.loanAmount / form.propertyValuation * 1000) / 10)
    }
  }

  async function save() {
    setError(null); setLoading(true)
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, status: form.status, summary: form.summary,
        internalNotes: form.internalNotes, borrowerLegalName: form.borrowerLegalName,
        borrowerContact: form.borrowerContact, creditBackground: form.creditBackground,
        underwriterNotes: form.underwriterNotes, propertyDescription: form.propertyDescription,
        collateralSummary: form.collateralSummary, loanAmount: form.loanAmount,
        propertyValuation: form.propertyValuation, investorApr: form.investorApr,
        targetRaise: form.targetRaise, currentRaised: form.currentRaised,
        riskGrade: form.riskGrade || undefined, chargeType: form.chargeType,
        underwritingSummary: form.underwritingSummary, keyStrengths: form.keyStrengths,
        keyRisks: form.keyRisks, downsideProtection: form.downsideProtection,
        valuationSource: form.valuationSource,
        kycVerification: form.kycVerification, totalDealIncome: form.totalDealIncome,
        investorIncome: form.investorIncome, companyIncome: form.companyIncome,
        actualClosingDate: form.actualClosingDate || null,
        actualDurationMonths: form.actualDurationMonths ?? null,
        wasDefaulted: form.wasDefaulted ?? false,
        collectionStartDate: form.collectionStartDate, propertyRealizationPeriod: form.propertyRealizationPeriod,
        propertySalePrice: form.propertySalePrice, fundsDistribution: form.fundsDistribution,
        dealComment: form.dealComment,
        visibleToInvestors: form.visibleToInvestors,
        openForInvestment: form.openForInvestment, approvedInvestorsOnly: form.approvedInvestorsOnly,
        isFeatured: form.isFeatured, autoInvestEligible: form.autoInvestEligible,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    else setError(data.error?.message ?? 'Save failed')
  }

  const s = { background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12.5px', outline: 'none', padding: '9px 12px', width: '100%', boxSizing: 'border-box' as const }
  const ta = { ...s, resize: 'vertical' as const, minHeight: '80px', lineHeight: 1.6 }
  const tabs = ['basics', 'financials', 'risk', 'outcome', 'visibility']

  return (
    <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '11px 18px', fontSize: '12.5px', fontWeight: activeTab === t ? 600 : 400, color: activeTab === t ? '#C4A355' : '#7C7A74', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === t ? '#C4A355' : 'transparent'}`, cursor: 'pointer', textTransform: 'capitalize', marginBottom: '-1px' }}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}
            style={{ ...s, width: 'auto', padding: '5px 10px', fontSize: '11px', fontWeight: 600 }}>
            {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={save} disabled={loading}
            style={{ background: '#C4A355', color: '#0A0A0C', border: 'none', borderRadius: '7px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {saved ? '✓ Saved' : loading ? '...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {error && <div style={{ marginBottom: '14px', fontSize: '12px', color: '#E05C5C' }}>{error}</div>}

        {activeTab === 'basics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div><label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Deal Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} style={s} /></div>
            <div><label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Borrower Legal Name</label><input value={form.borrowerLegalName} onChange={(e) => set('borrowerLegalName', e.target.value)} style={s} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Investor Summary</label><textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} style={ta} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Internal Notes</label><textarea value={form.internalNotes} onChange={(e) => set('internalNotes', e.target.value)} style={{ ...ta, borderColor: 'rgba(232,160,48,0.3)' }} /></div>
            <div><label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Credit Background</label><textarea value={form.creditBackground} onChange={(e) => set('creditBackground', e.target.value)} style={{ ...ta, minHeight: '70px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Underwriter Notes</label><textarea value={form.underwriterNotes} onChange={(e) => set('underwriterNotes', e.target.value)} style={{ ...ta, minHeight: '70px', borderColor: 'rgba(232,160,48,0.3)' }} /></div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
            {[
              { k: 'loanAmount', l: 'Loan Amount (£)', type: 'number' },
              { k: 'propertyValuation', l: 'Valuation (£)', type: 'number' },
              { k: 'investorApr', l: 'Investor APR (%)', type: 'number' },
              { k: 'targetRaise', l: 'Target Raise (£)', type: 'number' },
              { k: 'currentRaised', l: 'Current Raised (£)', type: 'number' },
              { k: 'valuationSource', l: 'Valuation Source', type: 'text' },
            ].map(({ k, l, type }) => (
              <div key={k}>
                <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>{l}</label>
                <input type={type} value={(form as any)[k]} onChange={(e) => set(k as any, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)} onBlur={k === 'loanAmount' || k === 'propertyValuation' ? calcLtv : undefined} style={{ ...s, fontFamily: type === 'number' ? "'DM Mono', monospace" : 'inherit' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>LTV (auto)</label>
              <input value={`${form.ltv}%`} readOnly style={{ ...s, background: '#141618', color: form.ltv > 72 ? '#E05C5C' : '#E8E6DF' }} />
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Risk Grade</label>
              <select value={form.riskGrade} onChange={(e) => set('riskGrade', e.target.value)} style={{ ...s, appearance: 'none' }}>
                <option value="">— Select —</option>
                {['A','B','C','D'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Charge Type</label>
              <select value={form.chargeType} onChange={(e) => set('chargeType', e.target.value)} style={{ ...s, appearance: 'none' }}>
                {['FIRST_CHARGE','SECOND_CHARGE','DEBENTURE'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {[
              { k: 'underwritingSummary', l: 'Underwriting Summary' },
              { k: 'downsideProtection', l: 'Downside Protection' },
              { k: 'keyStrengths', l: 'Key Strengths' },
              { k: 'keyRisks', l: 'Key Risks' },
            ].map(({ k, l }) => (
              <div key={k} style={{ gridColumn: k === 'underwritingSummary' || k === 'downsideProtection' ? 'span 2' : '' }}>
                <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>{l}</label>
                <textarea value={(form as any)[k]} onChange={(e) => set(k as any, e.target.value)} style={ta} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'outcome' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px' }}>Closing & Dates</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              {[
                { k: 'actualClosingDate', l: 'Actual Closing Date', type: 'date' },
                { k: 'actualDurationMonths', l: 'Actual Duration (months)', type: 'number' },
                { k: 'kycVerification', l: 'KYC / Legal Clearance', type: 'text' },
              ].map(({ k, l, type }) => (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>{l}</label>
                  <input type={type} value={(form as any)[k] ?? ''} onChange={(e) => set(k as any, type === 'number' ? (parseFloat(e.target.value) || null) : e.target.value)} style={s} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginTop: '4px' }}>Income Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              {[
                { k: 'totalDealIncome', l: 'Total Deal Income' },
                { k: 'investorIncome', l: 'Investor Income' },
                { k: 'companyIncome', l: 'Company Income' },
              ].map(({ k, l }) => (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>{l}</label>
                  <input value={(form as any)[k] ?? ''} onChange={(e) => set(k as any, e.target.value)} style={s} placeholder="e.g. £10,000" />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginTop: '4px' }}>Default / Collection</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: form.wasDefaulted ? 'rgba(224,92,92,0.08)' : '#18191E', border: `1px solid ${form.wasDefaulted ? 'rgba(224,92,92,0.3)' : 'rgba(255,255,255,0.13)'}`, borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '13px' }}>Was There a Default?</div>
                <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '2px' }}>Toggle on if the borrower defaulted on this loan</div>
              </div>
              <button onClick={() => set('wasDefaulted', !(form.wasDefaulted ?? false))}
                style={{ width: 40, height: 22, borderRadius: '11px', border: 'none', background: form.wasDefaulted ? '#E05C5C' : '#1A1C20', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'all 0.2s', left: form.wasDefaulted ? 21 : 3 }} />
              </button>
            </div>
            {form.wasDefaulted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '12px', borderLeft: '2px solid rgba(224,92,92,0.3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {[
                    { k: 'collectionStartDate', l: 'Collection Start Date' },
                    { k: 'propertyRealizationPeriod', l: 'Property Sale Period' },
                    { k: 'propertySalePrice', l: 'Property Sale Price' },
                    { k: 'fundsDistribution', l: 'How Funds Were Distributed' },
                  ].map(({ k, l }) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>{l}</label>
                      <input value={(form as any)[k] ?? ''} onChange={(e) => set(k as any, e.target.value)} style={s} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '5px' }}>Brief Deal Comment</label>
                  <textarea value={form.dealComment ?? ''} onChange={(e) => set('dealComment', e.target.value)} style={ta} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'visibility' && (
          <div style={{ maxWidth: '500px' }}>
            {[
              { k: 'visibleToInvestors', l: 'Visible in Marketplace', d: 'Deal appears in investor-facing feed' },
              { k: 'openForInvestment', l: 'Open for Investment', d: 'Investors can allocate capital' },
              { k: 'isFeatured', l: 'Featured Deal', d: 'Highlighted at top of marketplace' },
              { k: 'autoInvestEligible', l: 'Auto-Invest Eligible', d: 'Matched by auto-invest engine' },
              { k: 'approvedInvestorsOnly', l: 'Approved Investors Only', d: 'Platinum and Premium tier only' },
            ].map(({ k, l, d }) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <div style={{ fontSize: '13px' }}>{l}</div>
                  <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '2px' }}>{d}</div>
                </div>
                <button onClick={() => set(k as any, !(form as any)[k])}
                  style={{ width: 40, height: 22, borderRadius: '11px', border: 'none', background: (form as any)[k] ? '#2DC99A' : '#1A1C20', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
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
