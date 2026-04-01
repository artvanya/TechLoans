'use client'
// apps/admin/src/app/(admin)/deals/create/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3 | 4 | 5 | 6
const STEPS = ['Basics', 'Property', 'Financials', 'Risk', 'Documents', 'Publish']

interface FormData {
  name: string; type: string; borrowerType: string; borrowerPurpose: string
  summary: string; internalNotes: string; borrowerLegalName: string
  borrowerContact: string; creditBackground: string; underwriterNotes: string
  propertyType: string; propertyRegion: string; occupancyStatus: string
  propertyAddress: string; propertyCity: string; propertyPostcode: string
  propertyDescription: string; collateralSummary: string
  loanAmount: string; propertyValuation: string; ltv: string
  investorApr: string; borrowerRate: string; loanDurationMonths: string
  minimumInvestment: string; originationDate: string; maturityDate: string
  actualClosingDate: string; actualDurationMonths: string
  repaymentType: string; exitRoute: string; targetRaise: string; penaltyProvisions: string
  totalDealIncome: string; investorIncome: string; companyIncome: string
  riskGrade: string; chargeType: string; instructedSolicitors: string
  valuationSource: string; underwritingSummary: string; keyStrengths: string
  keyRisks: string; downsideProtection: string; recoveryTimeMonths: string
  scenarioNote: string; kycVerification: string
  wasDefaulted: boolean; collectionStartDate: string
  propertyRealizationPeriod: string; propertySalePrice: string
  fundsDistribution: string; dealComment: string
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

// ── Shared style tokens ────────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px',
  background: '#1A1C22',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#E8E6DF',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
}
const INPUT_ERR: React.CSSProperties = { ...INPUT, border: '1px solid rgba(224,92,92,0.7)', background: '#1E1A1A' }
const INPUT_READONLY: React.CSSProperties = { ...INPUT, background: '#141519', color: '#7C7A74', cursor: 'default' }
const LABEL: React.CSSProperties = {
  display: 'block', marginBottom: '6px',
  fontSize: '10px', letterSpacing: '1.4px', textTransform: 'uppercase' as const,
  color: '#5C5B57', fontWeight: 500,
}
const SECTION: React.CSSProperties = {
  fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const,
  color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.15)',
  paddingBottom: '8px', marginBottom: '4px',
}
const GRID2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
const GRID3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }
const GRID4: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }

export default function CreateDealPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (data.success) alert(`Draft saved — ${data.data.internalId}`)
    else alert(data.error?.message ?? 'Save failed')
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
    if (data.success) router.push(`/deals/${data.data.id}`)
    else { setErrors(data.error?.fields ?? {}); alert(data.error?.message ?? 'Create failed') }
  }

  function formToPayload(f: FormData) {
    return {
      name: f.name, type: f.type, borrowerType: f.borrowerType,
      borrowerPurpose: f.borrowerPurpose, summary: f.summary,
      internalNotes: f.internalNotes, borrowerLegalName: f.borrowerLegalName,
      borrowerContact: f.borrowerContact, creditBackground: f.creditBackground,
      underwriterNotes: f.underwriterNotes, kycVerification: f.kycVerification || undefined,
      propertyType: f.propertyType, propertyAddress: f.propertyAddress,
      propertyCity: f.propertyCity, propertyRegion: f.propertyRegion,
      propertyPostcode: f.propertyPostcode, propertyDescription: f.propertyDescription,
      collateralSummary: f.collateralSummary, occupancyStatus: f.occupancyStatus,
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

  // ── Reusable field components (all inline styles) ──────────────────────────
  const inp = (k: keyof FormData) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value),
    style: errors[k] ? INPUT_ERR : INPUT,
  })

  const Lbl = ({ children }: { children: React.ReactNode }) => (
    <label style={LABEL}>{children}</label>
  )

  const Err = ({ k }: { k: keyof FormData }) =>
    errors[k] ? <p style={{ marginTop: '4px', fontSize: '11px', color: '#E05C5C' }}>{errors[k]}</p> : null

  const F = ({ k, label, ...rest }: { k: keyof FormData; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <Lbl>{label}</Lbl>
      <input {...inp(k)} {...rest} style={errors[k] ? INPUT_ERR : { ...INPUT, ...(rest.style as any) }} />
      <Err k={k} />
    </div>
  )

  const Sel = ({ k, label, options, display }: { k: keyof FormData; label: string; options: string[]; display?: string[] }) => (
    <div>
      <Lbl>{label}</Lbl>
      <select {...inp(k)} style={{ ...INPUT, appearance: 'none' as any, WebkitAppearance: 'none', cursor: 'pointer' }}>
        <option value="">— Select —</option>
        {options.map((o, i) => <option key={o} value={o}>{display ? display[i] : o}</option>)}
      </select>
      <Err k={k} />
    </div>
  )

  const Ta = ({ k, label, rows = 3, placeholder }: { k: keyof FormData; label: string; rows?: number; placeholder?: string }) => (
    <div>
      <Lbl>{label}</Lbl>
      <textarea {...inp(k)} rows={rows} placeholder={placeholder}
        style={{ ...INPUT, resize: 'vertical', lineHeight: '1.6', minHeight: `${rows * 24}px` }}
      />
    </div>
  )

  const Tog = ({ k, label, desc, danger }: { k: keyof FormData; label: string; desc: string; danger?: boolean }) => {
    const on = form[k] as boolean
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: on && danger ? 'rgba(224,92,92,0.06)' : on ? 'rgba(45,201,154,0.05)' : '#16181E', borderRadius: '8px', border: `1px solid ${on && danger ? 'rgba(224,92,92,0.25)' : on ? 'rgba(45,201,154,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
        <div>
          <div style={{ fontSize: '13px', color: '#E8E6DF', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: '11px', color: '#5C5B57', marginTop: '2px' }}>{desc}</div>
        </div>
        <button type="button" onClick={() => set(k, !on)}
          style={{ width: 42, height: 24, borderRadius: '12px', border: 'none', background: on ? (danger ? '#E05C5C' : '#2DC99A') : '#2A2C33', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 4, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: on ? 22 : 4 }} />
        </button>
      </div>
    )
  }

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <div style={SECTION}>{children}</div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', maxWidth: '860px', margin: '0 auto', padding: '28px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.3px' }}>Create New Deal</div>
          <div style={{ fontSize: '12px', color: '#5C5B57', marginTop: '2px' }}>Step {step} of {STEPS.length} — {STEPS[step - 1]}</div>
        </div>
        <button onClick={() => { if (confirm('Discard draft?')) router.push('/deals') }}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#5C5B57', cursor: 'pointer', fontSize: '12px', padding: '7px 14px' }}>
          ✕ Discard
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '0' }}>
        {STEPS.map((s, i) => {
          const done = i + 1 < step
          const active = i + 1 === step
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: done ? 'pointer' : 'default', flexShrink: 0 }}
                onClick={() => { if (done) setStep((i + 1) as Step) }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${done ? '#2DC99A' : active ? '#C4A355' : 'rgba(255,255,255,0.1)'}`,
                  background: done ? 'rgba(45,201,154,0.12)' : active ? 'rgba(196,163,85,0.12)' : 'transparent',
                  color: done ? '#2DC99A' : active ? '#C4A355' : '#3E3D3B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#E8E6DF' : done ? '#2DC99A' : '#3E3D3B', whiteSpace: 'nowrap' }}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: done ? 'rgba(45,201,154,0.4)' : 'rgba(255,255,255,0.06)', margin: '0 10px' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div style={{ background: '#0D0F13', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '28px' }}>

        {/* ── STEP 1: Basics ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader>Deal Information</SectionHeader>
            <div style={GRID2}>
              <F k="name" label="Deal Name *" placeholder="e.g. Kensington Mews Bridge Loan" />
              <Sel k="type" label="Deal Type *"
                options={['BRIDGE_FINANCE', 'DEVELOPMENT_FINANCE', 'BUY_TO_LET', 'COMMERCIAL_BRIDGE', 'MEZZANINE']}
                display={['Bridge Finance', 'Development Finance', 'Buy to Let', 'Commercial Bridge', 'Mezzanine']} />
            </div>
            <div style={GRID2}>
              <Sel k="borrowerType" label="Borrower Type"
                options={['Individual', 'Property company (SPV)', 'Developer (LTD)', 'Family office', 'Business']}
                display={['Individual / Private Person', 'Property Company (SPV)', 'Developer (LTD)', 'Family Office', 'Business']} />
              <F k="borrowerPurpose" label="Loan Purpose" placeholder="e.g. Renovation, Business, Refinancing" />
            </div>
            <Ta k="summary" label="Investor-facing Summary *" rows={3} placeholder="Describe this deal for investors..." />
            <Ta k="internalNotes" label="Internal Notes (not visible to investors)" rows={2} placeholder="Admin-only notes..." />

            <SectionHeader>Borrower Intelligence — Internal Only</SectionHeader>
            <div style={GRID2}>
              <F k="borrowerLegalName" label="Borrower Legal Name" placeholder="Not shown to investors" />
              <F k="borrowerContact" label="Borrower Contact" placeholder="Phone / email" />
            </div>
            <Ta k="creditBackground" label="Credit Background" rows={2} placeholder="Borrower credit history and background..." />
            <Ta k="underwriterNotes" label="Underwriter Notes" rows={2} placeholder="Internal underwriting observations..." />
            <Ta k="kycVerification" label="Borrower Verification (KYC / Legal Clearance)" rows={2} placeholder="KYC status, legal clearance notes..." />
          </div>
        )}

        {/* ── STEP 2: Property ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader>Property Information</SectionHeader>
            <div style={GRID3}>
              <Sel k="propertyType" label="Property Type *"
                options={['Apartment', 'House', 'Commercial', 'Land', 'HMO', 'Mixed-Use', 'Development Site']}
                display={['Apartment / Flat', 'House', 'Commercial', 'Land', 'HMO', 'Mixed-Use', 'Development Site']} />
              <Sel k="propertyRegion" label="Region *"
                options={['London', 'South East England', 'South West England', 'North West England', 'North East England', 'Yorkshire & Humber', 'Midlands', 'Scotland', 'Wales']} />
              <Sel k="occupancyStatus" label="Occupancy"
                options={['Fully tenanted', 'Partially tenanted', 'Vacant', 'Under development']} />
            </div>
            <div style={GRID3}>
              <F k="propertyAddress" label="Street Address" placeholder="e.g. 14 Elm Street" />
              <F k="propertyCity" label="City / District *" placeholder="e.g. London, Manchester" />
              <F k="propertyPostcode" label="Postcode" placeholder="e.g. SW1A 1AA" />
            </div>
            <Ta k="propertyDescription" label="Property Description (investor-facing)" rows={4} placeholder="Describe the property — type, condition, key features..." />
            <Ta k="collateralSummary" label="Collateral Summary" rows={2} placeholder="Security and collateral details..." />
          </div>
        )}

        {/* ── STEP 3: Financials ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader>Loan & Valuation</SectionHeader>
            <div style={GRID4}>
              <F k="loanAmount" label="Loan Amount (£) *" type="number" onBlur={calcLtv} placeholder="0" />
              <F k="propertyValuation" label="Property Valuation (£) *" type="number" onBlur={calcLtv} placeholder="0" />
              <div>
                <Lbl>LTV — Auto Calculated</Lbl>
                <input value={form.ltv ? `${form.ltv}%` : '—'} readOnly
                  style={{ ...INPUT_READONLY, color: Number(form.ltv) > 72 ? '#E05C5C' : form.ltv ? '#2DC99A' : '#5C5B57', fontFamily: 'monospace', fontWeight: 600 }} />
              </div>
              <F k="targetRaise" label="Target Raise (£) *" type="number" placeholder="0" />
            </div>

            <SectionHeader>Rates & Terms</SectionHeader>
            <div style={GRID4}>
              <F k="investorApr" label="Investor APR (%) *" type="number" step="0.1" placeholder="0.0" />
              <F k="borrowerRate" label="Borrower Rate (% / month or year)" type="number" step="0.1" placeholder="0.0" />
              <F k="loanDurationMonths" label="Planned Duration (months) *" type="number" placeholder="12" />
              <F k="actualDurationMonths" label="Actual Duration (months, if closed)" type="number" placeholder="—" />
              <F k="minimumInvestment" label="Min. Investment (£)" type="number" placeholder="1000" />
              <Sel k="repaymentType" label="Repayment Type"
                options={['MONTHLY_INTEREST_BULLET', 'ROLLED_UP_BULLET', 'QUARTERLY_INTEREST_BULLET', 'AMORTISING']}
                display={['Monthly Interest + Bullet', 'Rolled-Up Bullet', 'Quarterly Interest + Bullet', 'Amortising']} />
              <F k="exitRoute" label="Exit Route" placeholder="e.g. Refinance, Sale" />
            </div>

            <SectionHeader>Dates</SectionHeader>
            <div style={GRID3}>
              <F k="originationDate" label="Loan Issue Date" type="date" />
              <F k="maturityDate" label="Maturity Date (planned)" type="date" />
              <F k="actualClosingDate" label="Actual Closing Date (if closed)" type="date" />
            </div>

            <Ta k="penaltyProvisions" label="Penalty / Default Provisions" rows={2} placeholder="Late payment penalties, default clauses..." />

            {Number(form.ltv) > 72 && (
              <div style={{ background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)', borderRadius: '10px', padding: '13px 16px', fontSize: '12.5px', color: '#E05C5C', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '16px' }}>⚠</span>
                <span>LTV {form.ltv}% exceeds the 72% policy limit — this deal will be flagged for credit committee review.</span>
              </div>
            )}

            <SectionHeader>Income Breakdown</SectionHeader>
            <div style={GRID3}>
              <F k="totalDealIncome" label="Total Deal Income" placeholder="e.g. £12,500" />
              <F k="investorIncome" label="Investor Income" placeholder="e.g. £10,000" />
              <F k="companyIncome" label="Company Income" placeholder="e.g. £2,500" />
            </div>
          </div>
        )}

        {/* ── STEP 4: Risk ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader>Risk & Underwriting</SectionHeader>
            <div style={GRID3}>
              <Sel k="riskGrade" label="Risk Grade *" options={['A', 'B', 'C', 'D']} display={['A — Low Risk', 'B — Medium Risk', 'C — Higher Risk', 'D — Speculative']} />
              <Sel k="chargeType" label="Legal Charge *"
                options={['FIRST_CHARGE', 'SECOND_CHARGE', 'DEBENTURE']}
                display={['First Charge', 'Second Charge', 'Debenture']} />
              <F k="instructedSolicitors" label="Instructed Solicitors" placeholder="e.g. Clifford Chance" />
            </div>
            <div style={GRID2}>
              <F k="valuationSource" label="Valuation Source" placeholder="e.g. Savills · RICS" />
              <F k="recoveryTimeMonths" label="Est. Recovery Time (months)" type="number" placeholder="—" />
            </div>
            <Ta k="underwritingSummary" label="Underwriting Summary (investor-facing)" rows={3} placeholder="Summary of the underwriting decision..." />
            <div style={GRID2}>
              <Ta k="keyStrengths" label="Key Strengths" rows={3} placeholder="• Strong LTV&#10;• Experienced borrower..." />
              <Ta k="keyRisks" label="Key Risks" rows={3} placeholder="• Planning risk&#10;• Market sensitivity..." />
            </div>
            <Ta k="downsideProtection" label="Downside Protection (investor-facing)" rows={3} placeholder="What protects investors if things go wrong..." />
            <Ta k="scenarioNote" label="Stress-Test Scenario Note" rows={2} placeholder="What happens if property values drop 20%..." />

            <SectionHeader>Default Tracking</SectionHeader>
            <Tog k="wasDefaulted" label="Was There a Default?" desc="Toggle on if the borrower defaulted on this loan" danger />
            {form.wasDefaulted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '16px', borderLeft: '2px solid rgba(224,92,92,0.35)', marginTop: '4px' }}>
                <div style={GRID2}>
                  <F k="collectionStartDate" label="Collection Start Date" placeholder="e.g. 01/03/2025" />
                  <F k="propertyRealizationPeriod" label="Property Sale Period" placeholder="e.g. 4 months" />
                  <F k="propertySalePrice" label="Property Sale Price" placeholder="e.g. £380,000" />
                  <F k="fundsDistribution" label="How Funds Were Distributed" placeholder="e.g. £300k investor, £80k company" />
                </div>
                <Ta k="dealComment" label="Brief Deal Comment" rows={3} placeholder="What happened, how it was resolved..." />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Documents ── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader>Documents</SectionHeader>
            <p style={{ fontSize: '13px', color: '#5C5B57', lineHeight: '1.7', margin: 0 }}>
              Documents are uploaded after the deal is created. Save this deal as a draft first, then upload documents from the deal detail page.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Valuation Report', required: true, desc: 'RICS-certified valuation · PDF' },
                { label: 'Legal Pack', required: false, desc: 'Charge documents and legal structure' },
                { label: 'Borrower Summary', required: false, desc: 'Anonymised · shown post-investment' },
                { label: 'Term Sheet', required: false, desc: 'Executed term sheet' },
                { label: 'Internal Credit Memo', required: false, desc: 'Internal only — not visible to investors' },
              ].map(({ label, required, desc }) => (
                <div key={label} style={{ border: '1.5px dashed rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px', textAlign: 'center', background: '#111215' }}>
                  <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.4 }}>📄</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#A8A69F' }}>{label}{required ? <span style={{ color: '#E05C5C' }}> *</span> : ''}</div>
                  <div style={{ fontSize: '11px', color: '#3E3D3B', marginTop: '4px' }}>{desc}</div>
                  <div style={{ fontSize: '10px', color: '#2A2C33', marginTop: '8px', fontStyle: 'italic' }}>Available after deal is saved</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 6: Publish ── */}
        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader>Publish Settings</SectionHeader>
            <div style={GRID2}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Tog k="visibleToInvestors" label="Visible in Marketplace" desc="Deal appears in investor-facing feed" />
                <Tog k="openForInvestment" label="Open for Investment" desc="Investors can allocate capital" />
                <Tog k="isFeatured" label="Featured Deal" desc="Highlighted at top of marketplace" />
                <Tog k="autoInvestEligible" label="Auto-Invest Eligible" desc="Matched by auto-invest engine" />
                <Tog k="approvedInvestorsOnly" label="Approved Investors Only" desc="Platinum and Premium tier only" />
              </div>
              <div style={{ background: '#111215', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '18px' }}>
                <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#5C5B57', marginBottom: '14px', fontWeight: 600 }}>Pre-publish Checklist</div>
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
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', background: ok ? 'rgba(45,201,154,0.07)' : 'transparent', borderRadius: '6px', marginBottom: '4px' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: ok ? 'rgba(45,201,154,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', color: ok ? '#2DC99A' : '#3E3D3B' }}>{ok ? '✓' : '·'}</span>
                    </div>
                    <span style={{ fontSize: '12.5px', color: ok ? '#C8C6BF' : '#4A4947' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div>
          {step > 1 && (
            <button onClick={() => setStep((s) => (s - 1) as Step)}
              style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#A8A69F', fontSize: '13px', cursor: 'pointer' }}>
              ← Back
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={saveDraft} disabled={loading}
            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#5C5B57', fontSize: '12.5px', cursor: 'pointer' }}>
            Save Draft
          </button>
          {step < 6 ? (
            <button onClick={nextStep}
              style={{ padding: '10px 22px', borderRadius: '8px', background: '#C4A355', color: '#0A0A0C', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: '0.2px' }}>
              Next: {STEPS[step]} →
            </button>
          ) : (
            <button onClick={createAndPublish} disabled={loading}
              style={{ padding: '10px 22px', borderRadius: '8px', background: '#C4A355', color: '#0A0A0C', fontSize: '13px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '0.2px' }}>
              {loading ? 'Creating...' : 'Create & Publish Deal →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
