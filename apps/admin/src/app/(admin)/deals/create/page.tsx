'use client'
// apps/admin/src/app/(admin)/deals/create/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3 | 4 | 5 | 6

const STEPS = ['Basics', 'Property', 'Financials', 'Risk', 'Documents', 'Publish']

interface FormData {
  // Step 1
  name: string; type: string; borrowerType: string; borrowerPurpose: string
  summary: string; internalNotes: string; borrowerLegalName: string
  borrowerContact: string; creditBackground: string; underwriterNotes: string
  // Step 2
  propertyType: string; propertyRegion: string; occupancyStatus: string
  propertyAddress: string; propertyCity: string; propertyPostcode: string
  propertyDescription: string; collateralSummary: string
  // Step 3
  loanAmount: string; propertyValuation: string; ltv: string
  investorApr: string; borrowerRate: string; loanDurationMonths: string
  minimumInvestment: string; originationDate: string; maturityDate: string
  actualClosingDate: string; actualDurationMonths: string
  repaymentType: string; exitRoute: string; targetRaise: string; penaltyProvisions: string
  totalDealIncome: string; investorIncome: string; companyIncome: string
  // Step 4
  riskGrade: string; chargeType: string; instructedSolicitors: string
  valuationSource: string; underwritingSummary: string; keyStrengths: string
  keyRisks: string; downsideProtection: string; recoveryTimeMonths: string
  scenarioNote: string; kycVerification: string
  wasDefaulted: boolean; collectionStartDate: string
  propertyRealizationPeriod: string; propertySalePrice: string
  fundsDistribution: string; dealComment: string
  // Step 6
  visibleToInvestors: boolean; openForInvestment: boolean
  approvedInvestorsOnly: boolean; isFeatured: boolean; autoInvestEligible: boolean
  status: string
}

const INITIAL: FormData = {
  name: '', type: '', borrowerType: 'Property company (SPV)', borrowerPurpose: '',
  summary: '', internalNotes: '', borrowerLegalName: '', borrowerContact: '',
  creditBackground: '', underwriterNotes: '',
  propertyType: '', propertyRegion: '', occupancyStatus: 'Fully tenanted',
  propertyAddress: '', propertyCity: '', propertyPostcode: '',
  propertyDescription: '', collateralSummary: '',
  loanAmount: '', propertyValuation: '', ltv: '',
  investorApr: '', borrowerRate: '', loanDurationMonths: '',
  minimumInvestment: '1000', originationDate: '', maturityDate: '',
  actualClosingDate: '', actualDurationMonths: '',
  repaymentType: 'MONTHLY_INTEREST_BULLET',
  exitRoute: '', targetRaise: '', penaltyProvisions: '',
  totalDealIncome: '', investorIncome: '', companyIncome: '',
  riskGrade: 'B', chargeType: 'FIRST_CHARGE', instructedSolicitors: '',
  valuationSource: '', underwritingSummary: '', keyStrengths: '', keyRisks: '',
  downsideProtection: '', recoveryTimeMonths: '', scenarioNote: '',
  kycVerification: '', wasDefaulted: false, collectionStartDate: '',
  propertyRealizationPeriod: '', propertySalePrice: '', fundsDistribution: '',
  dealComment: '',
  visibleToInvestors: false, openForInvestment: false, approvedInvestorsOnly: false,
  isFeatured: false, autoInvestEligible: true, status: 'DRAFT',
}

export default function CreateDealPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savedId, setSavedId] = useState<string | null>(null)

  function set(key: keyof FormData, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function calcLtv() {
    const loan = parseFloat(form.loanAmount)
    const val = parseFloat(form.propertyValuation)
    if (loan > 0 && val > 0) set('ltv', (loan / val * 100).toFixed(1))
  }

  function validateStep(s: Step): Record<string, string> {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!form.name.trim()) e.name = 'Deal name is required'
      if (!form.type) e.type = 'Deal type is required'
      if (!form.summary.trim()) e.summary = 'Investor summary is required'
    }
    if (s === 2) {
      if (!form.propertyCity.trim()) e.propertyCity = 'City is required'
      if (!form.propertyRegion) e.propertyRegion = 'Region is required'
    }
    if (s === 3) {
      if (!form.loanAmount) e.loanAmount = 'Loan amount is required'
      if (!form.propertyValuation) e.propertyValuation = 'Valuation is required'
      if (!form.investorApr) e.investorApr = 'APR is required'
      if (!form.loanDurationMonths) e.loanDurationMonths = 'Duration is required'
      if (!form.targetRaise) e.targetRaise = 'Target raise is required'
    }
    return e
  }

  function nextStep() {
    const e = validateStep(step)
    if (Object.keys(e).length) { setErrors(e); return }
    if (step < 6) setStep((s) => (s + 1) as Step)
  }

  async function saveDraft() {
    setLoading(true)
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formToPayload(form), status: 'DRAFT' }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      setSavedId(data.data.internalId)
      alert(`Draft saved — ${data.data.internalId}`)
    } else {
      alert(data.error?.message ?? 'Save failed')
    }
  }

  async function createAndPublish() {
    setLoading(true)
    const payload = { ...formToPayload(form), status: form.visibleToInvestors ? 'LIVE' : 'APPROVED' }
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      router.push(`/deals/${data.data.id}`)
    } else {
      setErrors(data.error?.fields ?? {})
      alert(data.error?.message ?? 'Create failed')
    }
  }

  function formToPayload(f: FormData) {
    return {
      name: f.name, type: f.type, borrowerType: f.borrowerType,
      borrowerPurpose: f.borrowerPurpose, summary: f.summary,
      internalNotes: f.internalNotes, borrowerLegalName: f.borrowerLegalName,
      borrowerContact: f.borrowerContact, creditBackground: f.creditBackground,
      underwriterNotes: f.underwriterNotes, propertyType: f.propertyType,
      propertyAddress: f.propertyAddress, propertyCity: f.propertyCity,
      propertyRegion: f.propertyRegion, propertyPostcode: f.propertyPostcode,
      propertyDescription: f.propertyDescription, collateralSummary: f.collateralSummary,
      occupancyStatus: f.occupancyStatus,
      loanAmount: parseFloat(f.loanAmount) || 0,
      propertyValuation: parseFloat(f.propertyValuation) || 0,
      investorApr: parseFloat(f.investorApr) || 0,
      borrowerRate: parseFloat(f.borrowerRate) || undefined,
      loanDurationMonths: parseInt(f.loanDurationMonths) || 0,
      minimumInvestment: parseFloat(f.minimumInvestment) || 1000,
      originationDate: f.originationDate || undefined,
      maturityDate: f.maturityDate || undefined,
      actualClosingDate: f.actualClosingDate || undefined,
      actualDurationMonths: parseInt(f.actualDurationMonths) || undefined,
      repaymentType: f.repaymentType, exitRoute: f.exitRoute,
      targetRaise: parseFloat(f.targetRaise) || 0,
      penaltyProvisions: f.penaltyProvisions,
      totalDealIncome: f.totalDealIncome || undefined,
      investorIncome: f.investorIncome || undefined,
      companyIncome: f.companyIncome || undefined,
      riskGrade: f.riskGrade as any, chargeType: f.chargeType as any,
      instructedSolicitors: f.instructedSolicitors, valuationSource: f.valuationSource,
      underwritingSummary: f.underwritingSummary, keyStrengths: f.keyStrengths,
      keyRisks: f.keyRisks, downsideProtection: f.downsideProtection,
      recoveryTimeMonths: parseInt(f.recoveryTimeMonths) || undefined,
      scenarioNote: f.scenarioNote,
      kycVerification: f.kycVerification || undefined,
      wasDefaulted: f.wasDefaulted,
      collectionStartDate: f.collectionStartDate || undefined,
      propertyRealizationPeriod: f.propertyRealizationPeriod || undefined,
      propertySalePrice: f.propertySalePrice || undefined,
      fundsDistribution: f.fundsDistribution || undefined,
      dealComment: f.dealComment || undefined,
      visibleToInvestors: f.visibleToInvestors, openForInvestment: f.openForInvestment,
      approvedInvestorsOnly: f.approvedInvestorsOnly, isFeatured: f.isFeatured,
      autoInvestEligible: f.autoInvestEligible,
    }
  }

  const F = (key: keyof FormData) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value),
    className: `w-full px-3 py-2 bg-[#18191E] border ${errors[key] ? 'border-[#E05C5C]' : 'border-[rgba(255,255,255,0.13)]'} rounded-lg text-[#E8E6DF] text-[12.5px] outline-none focus:border-[#C4A355] transition-colors placeholder:text-[#3E3D3B]`,
  })

  const Label = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[9.5px] tracking-[1.2px] uppercase text-[#7C7A74] mb-1.5">
        {children}
      </label>
    </div>
  )

  const Field = ({ k, label, ...props }: { k: keyof FormData; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-[9.5px] tracking-[1.2px] uppercase text-[#7C7A74] mb-1.5">{label}</label>
      <input {...F(k)} {...props} />
      {errors[k] && <p className="mt-1 text-[11px] text-[#E05C5C]">{errors[k]}</p>}
    </div>
  )

  const Select = ({ k, label, options }: { k: keyof FormData; label: string; options: string[] }) => (
    <div>
      <label className="block text-[9.5px] tracking-[1.2px] uppercase text-[#7C7A74] mb-1.5">{label}</label>
      <select {...F(k)} style={{ appearance: 'none' }}>
        <option value="">— Select —</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )

  const Textarea = ({ k, label, rows = 3 }: { k: keyof FormData; label: string; rows?: number }) => (
    <div>
      <label className="block text-[9.5px] tracking-[1.2px] uppercase text-[#7C7A74] mb-1.5">{label}</label>
      <textarea {...F(k)} rows={rows}
        className={`w-full px-3 py-2 bg-[#18191E] border border-[rgba(255,255,255,0.13)] rounded-lg text-[#E8E6DF] text-[12.5px] outline-none focus:border-[#C4A355] transition-colors resize-y placeholder:text-[#3E3D3B]`}
      />
    </div>
  )

  const Toggle = ({ k, label, desc }: { k: keyof FormData; label: string; desc: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-[rgba(255,255,255,0.06)] last:border-0">
      <div>
        <div className="text-[12.5px]">{label}</div>
        <div className="text-[10.5px] text-[#7C7A74] mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => set(k, !form[k])}
        className={`w-9 h-5 rounded-full border flex items-center transition-colors ${form[k] ? 'bg-[#2DC99A] border-[#2DC99A]' : 'bg-[#1A1C20] border-[rgba(255,255,255,0.13)]'}`}
      >
        <div className={`w-3.5 h-3.5 rounded-full transition-all mx-0.5 ${form[k] ? 'translate-x-4 bg-white' : 'bg-[#7C7A74]'}`} />
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Create New Deal</div>
        <button onClick={() => { if (confirm('Discard draft?')) router.push('/deals') }}
          style={{ background: 'transparent', border: 'none', color: '#7C7A74', cursor: 'pointer', fontSize: '13px' }}>
          ✕ Discard
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: i + 1 <= step ? 'pointer' : 'default'
            }} onClick={() => { if (i + 1 < step) setStep((i + 1) as Step) }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                border: `1.5px solid ${i + 1 < step ? '#2DC99A' : i + 1 === step ? '#C4A355' : 'rgba(255,255,255,0.13)'}`,
                background: i + 1 < step ? 'rgba(45,201,154,0.1)' : i + 1 === step ? 'rgba(196,163,85,0.1)' : 'transparent',
                color: i + 1 < step ? '#2DC99A' : i + 1 === step ? '#C4A355' : '#3E3D3B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: i + 1 === step ? 500 : 400, color: i + 1 === step ? '#E8E6DF' : i + 1 < step ? '#2DC99A' : '#7C7A74' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i + 1 < step ? '#2DC99A' : 'rgba(255,255,255,0.06)', margin: '0 8px' }} />
            )}
          </div>
        ))}
      </div>

      {/* STEP CONTENT */}
      <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px' }}>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginBottom: '4px' }}>
              Deal Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field k="name" label="Deal Name *" placeholder="e.g. Kensington Mews Bridge Loan" />
              <Select k="type" label="Deal Type *" options={['BRIDGE_FINANCE', 'DEVELOPMENT_FINANCE', 'BUY_TO_LET', 'COMMERCIAL_BRIDGE', 'MEZZANINE']} />
              <Select k="borrowerType" label="Borrower Type" options={['Individual investor', 'Property company (SPV)', 'Developer (LTD)', 'Family office']} />
              <Field k="borrowerPurpose" label="Borrower Purpose" placeholder="e.g. Acquisition bridge" />
            </div>
            <Textarea k="summary" label="Investor-facing Summary *" rows={3} />
            <Textarea k="internalNotes" label="Internal Notes (not visible to investors)" rows={2} />
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginTop: '8px' }}>
              Borrower Intelligence — Internal Only
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field k="borrowerLegalName" label="Borrower Legal Name" placeholder="Not shown to investors" />
              <Field k="borrowerContact" label="Borrower Contact" />
            </div>
            <Textarea k="creditBackground" label="Credit Background" rows={2} />
            <Textarea k="underwriterNotes" label="Underwriter Notes" rows={2} />
            <Textarea k="kycVerification" label="Borrower Verification (KYC / Legal Clearance)" rows={2} />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px' }}>Property Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <Select k="propertyType" label="Property Type *" options={['Residential — House', 'Residential — Flat', 'HMO', 'Mixed-Use', 'Commercial — Retail', 'Commercial — Office', 'Development Site']} />
              <Select k="propertyRegion" label="Region *" options={['London', 'South East England', 'South West England', 'North West England', 'North East England', 'Yorkshire & Humber', 'Midlands', 'Scotland', 'Wales']} />
              <Select k="occupancyStatus" label="Occupancy" options={['Fully tenanted', 'Partially tenanted', 'Vacant', 'Under development']} />
              <Field k="propertyAddress" label="Address" />
              <Field k="propertyCity" label="City *" />
              <Field k="propertyPostcode" label="Postcode" />
            </div>
            <Textarea k="propertyDescription" label="Property Description (investor-facing) *" rows={4} />
            <Textarea k="collateralSummary" label="Collateral Summary" rows={2} />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px' }}>Financial Terms</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
              <Field k="loanAmount" label="Loan Amount (£) *" type="number" onBlur={calcLtv} />
              <Field k="propertyValuation" label="Valuation (£) *" type="number" onBlur={calcLtv} />
              <div>
                <label style={{ display: 'block', fontSize: '9.5px', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7C7A74', marginBottom: '6px' }}>LTV (auto)</label>
                <input value={form.ltv ? `${form.ltv}%` : ''} readOnly
                  style={{ width: '100%', padding: '8px 12px', background: '#1A1C20', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: Number(form.ltv) > 72 ? '#E05C5C' : '#E8E6DF', fontSize: '12.5px', outline: 'none', fontFamily: 'DM Mono, monospace' }}
                />
              </div>
              <Field k="investorApr" label="Investor APR (%) *" type="number" step="0.1" />
              <Field k="borrowerRate" label="Borrower Rate (% / month or year)" type="number" step="0.1" />
              <Field k="loanDurationMonths" label="Planned Duration (months) *" type="number" />
              <Field k="actualDurationMonths" label="Actual Duration (months, if closed)" type="number" />
              <Field k="minimumInvestment" label="Min. Investment (£)" type="number" />
              <Field k="targetRaise" label="Target Raise (£) *" type="number" />
              <Field k="originationDate" label="Loan Issue Date" type="date" />
              <Field k="maturityDate" label="Maturity Date (planned)" type="date" />
              <Field k="actualClosingDate" label="Actual Closing Date (if closed)" type="date" />
              <Select k="repaymentType" label="Repayment Type" options={['MONTHLY_INTEREST_BULLET', 'ROLLED_UP_BULLET', 'QUARTERLY_INTEREST_BULLET', 'AMORTISING']} />
              <Field k="exitRoute" label="Exit Route" placeholder="e.g. Refinance" />
            </div>
            <Textarea k="penaltyProvisions" label="Penalty / Default Provisions" rows={2} />
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginTop: '8px' }}>
              Income Breakdown
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <Field k="totalDealIncome" label="Total Deal Income" placeholder="e.g. £12,500" />
              <Field k="investorIncome" label="Investor Income" placeholder="e.g. £10,000" />
              <Field k="companyIncome" label="Company Income" placeholder="e.g. £2,500" />
            </div>
            {Number(form.ltv) > 72 && (
              <div style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#E05C5C' }}>
                ⚠ LTV {form.ltv}% exceeds the 72% policy limit. This deal will be flagged for credit committee review.
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px' }}>Risk & Underwriting</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <Select k="riskGrade" label="Risk Grade *" options={['A', 'B', 'C', 'D']} />
              <Select k="chargeType" label="Legal Charge *" options={['FIRST_CHARGE', 'SECOND_CHARGE', 'DEBENTURE']} />
              <Field k="instructedSolicitors" label="Instructed Solicitors" />
              <Field k="valuationSource" label="Valuation Source" placeholder="e.g. Savills · RICS" />
              <Field k="recoveryTimeMonths" label="Est. Recovery Time (months)" type="number" />
            </div>
            <Textarea k="underwritingSummary" label="Underwriting Summary (investor-facing)" rows={3} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Textarea k="keyStrengths" label="Key Strengths" rows={3} />
              <Textarea k="keyRisks" label="Key Risks" rows={3} />
            </div>
            <Textarea k="downsideProtection" label="Downside Protection Summary (investor-facing)" rows={3} />
            <Textarea k="scenarioNote" label="Stress-Test Scenario Note" rows={2} />
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginTop: '8px' }}>
              Default Tracking
            </div>
            <Toggle k="wasDefaulted" label="Was There a Default?" desc="Toggle on if the borrower defaulted on this loan" />
            {form.wasDefaulted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '12px', borderLeft: '2px solid rgba(224,92,92,0.3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Field k="collectionStartDate" label="Collection Start Date" placeholder="e.g. 01/03/2025" />
                  <Field k="propertyRealizationPeriod" label="Property Sale Period" placeholder="e.g. 4 months" />
                  <Field k="propertySalePrice" label="Property Sale Price" placeholder="e.g. £380,000" />
                  <Field k="fundsDistribution" label="How Funds Were Distributed" placeholder="e.g. £300k investor, £80k company" />
                </div>
                <Textarea k="dealComment" label="Brief Deal Comment" rows={3} />
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px' }}>Documents</div>
            <p style={{ fontSize: '12.5px', color: '#7C7A74', lineHeight: '1.7' }}>
              Documents are uploaded after the deal is created. Save this deal as a draft first, then upload documents from the deal detail page.
              Required before publishing: Valuation Report and Legal Pack.
            </p>
            {[
              { label: 'Valuation Report', required: true, desc: 'RICS-certified valuation · PDF' },
              { label: 'Legal Pack', required: false, desc: 'Charge documents and legal structure' },
              { label: 'Borrower Summary', required: false, desc: 'Anonymised · shown post-investment' },
              { label: 'Term Sheet', required: false, desc: 'Executed term sheet' },
              { label: 'Internal Credit Memo', required: false, desc: 'Internal only — not visible to investors' },
            ].map(({ label, required, desc }) => (
              <div key={label} style={{ border: '1.5px dashed rgba(255,255,255,0.13)', borderRadius: '8px', padding: '16px', textAlign: 'center', opacity: 0.5 }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>📁</div>
                <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{label}{required ? ' *' : ''}</div>
                <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '3px' }}>{desc}</div>
                <div style={{ fontSize: '10px', color: '#3E3D3B', marginTop: '6px' }}>Available after deal is saved</div>
              </div>
            ))}
          </div>
        )}

        {step === 6 && (
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)', paddingBottom: '8px', marginBottom: '16px' }}>Publish Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <Toggle k="visibleToInvestors" label="Visible in Marketplace" desc="Deal appears in investor-facing feed" />
                <Toggle k="openForInvestment" label="Open for Investment" desc="Investors can allocate capital" />
                <Toggle k="isFeatured" label="Featured Deal" desc="Highlighted at top of marketplace" />
                <Toggle k="autoInvestEligible" label="Auto-Invest Eligible" desc="Matched by auto-invest engine" />
                <Toggle k="approvedInvestorsOnly" label="Approved Investors Only" desc="Platinum and Premium tier only" />
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#7C7A74', marginBottom: '10px' }}>Pre-publish Checklist</div>
                {[
                  { label: 'Deal name', ok: !!form.name },
                  { label: 'Deal type', ok: !!form.type },
                  { label: 'Loan amount', ok: !!form.loanAmount },
                  { label: 'Property valuation', ok: !!form.propertyValuation },
                  { label: 'Investor APR', ok: !!form.investorApr },
                  { label: 'Duration', ok: !!form.loanDurationMonths },
                  { label: 'Risk grade', ok: !!form.riskGrade },
                  { label: 'Target raise', ok: !!form.targetRaise },
                ].map(({ label, ok }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: ok ? 'rgba(45,201,154,0.08)' : '#18191E', borderRadius: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: ok ? '#2DC99A' : '#3E3D3B' }}>{ok ? '✓' : '○'}</span>
                    <span style={{ fontSize: '12px', color: ok ? '#E8E6DF' : '#7C7A74' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <div>
          {step > 1 && (
            <button onClick={() => setStep((s) => (s - 1) as Step)}
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.13)', background: 'transparent', color: '#E8E6DF', fontSize: '12.5px', cursor: 'pointer' }}>
              ← Back
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={saveDraft} disabled={loading}
            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.13)', background: 'transparent', color: '#7C7A74', fontSize: '12px', cursor: 'pointer' }}>
            Save Draft
          </button>
          {step < 6 ? (
            <button onClick={nextStep}
              style={{ padding: '9px 20px', borderRadius: '8px', background: '#C4A355', color: '#0A0A0C', fontSize: '12.5px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Next: {STEPS[step]} →
            </button>
          ) : (
            <button onClick={createAndPublish} disabled={loading}
              style={{ padding: '9px 20px', borderRadius: '8px', background: '#C4A355', color: '#0A0A0C', fontSize: '12.5px', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating...' : 'Create & Publish Deal →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
