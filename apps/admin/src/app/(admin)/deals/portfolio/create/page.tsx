'use client'
// apps/admin/src/app/(admin)/deals/portfolio/create/page.tsx
// Single-page form to add a completed portfolio deal (track record entry)
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { uploadDealImageFromBrowser } from '@/lib/upload-deal-image-client'

// ── Style tokens ──────────────────────────────────────────────────────────────
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
const LABEL: React.CSSProperties = {
  display: 'block', marginBottom: '5px',
  fontSize: '10px', letterSpacing: '1.2px', textTransform: 'uppercase' as const,
  color: '#5C5B57', fontWeight: 500,
}
const SECTION_HEADING: React.CSSProperties = {
  fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const,
  color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.2)',
  paddingBottom: '8px', marginBottom: '18px', marginTop: '32px',
}
const GRID2: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px',
}
const GRID3: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px',
}
const FIELD: React.CSSProperties = { marginBottom: '14px' }

interface FormState {
  // Basic
  originationDate: string
  status: string
  actualClosingDate: string
  // Property
  propertyType: string
  propertyCity: string
  propertyRegion: string
  propertyDescription: string
  // Financials
  propertyValuation: string
  loanAmount: string
  ltv: string
  interestRate: string
  loanDurationMonths: string
  actualDurationMonths: string
  // Borrower
  borrowerType: string
  borrowerPurpose: string
  // Income
  companyMarginPct: string   // % of total income going to company, e.g. "30"
  totalDealIncome: string
  investorIncome: string
  companyIncome: string
  // Default
  wasDefaulted: boolean
  collectionStartDate: string
  propertyRealizationPeriod: string
  propertySalePrice: string
  fundsDistribution: string
}

const INITIAL: FormState = {
  originationDate: '',
  status: 'REPAID',
  actualClosingDate: '',
  propertyType: '',
  propertyCity: '',
  propertyRegion: '',
  propertyDescription: '',
  propertyValuation: '',
  loanAmount: '',
  ltv: '',
  interestRate: '',
  loanDurationMonths: '',
  actualDurationMonths: '',
  borrowerType: '',
  borrowerPurpose: '',
  companyMarginPct: '30',
  totalDealIncome: '',
  investorIncome: '',
  companyIncome: '',
  wasDefaulted: false,
  collectionStartDate: '',
  propertyRealizationPeriod: '',
  propertySalePrice: '',
  fundsDistribution: '',
}

function calcIncome(state: FormState): { total: string; investor: string; company: string } {
  const loan = parseFloat(state.loanAmount)
  const rate = parseFloat(state.interestRate)
  const months = parseFloat(state.actualDurationMonths) || parseFloat(state.loanDurationMonths)
  const margin = parseFloat(state.companyMarginPct) / 100

  if (!loan || !rate || !months) return { total: '', investor: '', company: '' }

  const total = loan * (rate / 100) * (months / 12)
  const company = total * margin
  const investor = total - company

  const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
  return { total: fmt(total), investor: fmt(investor), company: fmt(company) }
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE',    label: 'Active' },
  { value: 'REPAID',    label: 'Closed' },
  { value: 'DEFAULTED', label: 'In Recovery' },
]

const PROPERTY_TYPE_OPTIONS = [
  'Apartment', 'House', 'Commercial', 'Land',
]

const BORROWER_TYPE_OPTIONS = [
  'Individual', 'Business',
]

export default function AddPortfolioPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-calc LTV + income whenever relevant fields change
  function handleNumericChange(field: keyof FormState, value: string) {
    const updated = { ...form, [field]: value }
    // LTV
    if ((field === 'loanAmount' || field === 'propertyValuation') &&
        updated.loanAmount && updated.propertyValuation) {
      const loan = parseFloat(updated.loanAmount)
      const val = parseFloat(updated.propertyValuation)
      if (loan > 0 && val > 0) updated.ltv = ((loan / val) * 100).toFixed(1)
    }
    // Income
    const income = calcIncome(updated)
    updated.totalDealIncome = income.total
    updated.investorIncome  = income.investor
    updated.companyIncome   = income.company
    setForm(updated)
  }

  function handleChange(field: keyof FormState, value: string | boolean) {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      // Recalc income when rate, duration, or margin changes
      if (['interestRate','loanDurationMonths','actualDurationMonths','companyMarginPct'].includes(field as string)) {
        const income = calcIncome(updated)
        updated.totalDealIncome = income.total
        updated.investorIncome  = income.investor
        updated.companyIncome   = income.company
      }
      return updated
    })
  }

  function handleImageFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files)
    const newPreviews = newFiles.map(f => URL.createObjectURL(f))
    setImages(prev => [...prev, ...newFiles])
    setImagePreviews(prev => [...prev, ...newPreviews])
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Build deal payload — all fields optional for portfolio
      const loan = parseFloat(form.loanAmount) || 1
      const valuation = parseFloat(form.propertyValuation) || loan
      const ltv = parseFloat(form.ltv) || Math.round((loan / valuation) * 1000) / 10
      const apr = parseFloat(form.interestRate) || 0
      const months = parseInt(form.loanDurationMonths) || 1

      const payload: Record<string, unknown> = {
        // Required schema fields — safe defaults for portfolio
        name: buildDealName(form),
        type: 'BRIDGE_FINANCE',
        loanAmount: loan,
        propertyValuation: valuation,
        investorApr: apr,          // now accepts 0
        loanDurationMonths: months,
        targetRaise: loan,
        minimumInvestment: 1000,
        repaymentType: 'MONTHLY_INTEREST_BULLET',
        chargeType: 'FIRST_CHARGE',
        // Portfolio flags
        isPortfolio: true,
        openForInvestment: false,
        visibleToInvestors: true,
        status: form.status,
        // Dates
        originationDate: form.originationDate || undefined,
        actualClosingDate: form.actualClosingDate || undefined,
        // Property
        propertyType: form.propertyType || undefined,
        propertyCity: form.propertyCity || undefined,
        propertyRegion: form.propertyRegion || undefined,
        propertyDescription: form.propertyDescription || undefined,
        // LTV
        ltv: Math.round(ltv * 10) / 10,
        // Durations
        actualDurationMonths: parseInt(form.actualDurationMonths) || undefined,
        // Borrower
        borrowerType: form.borrowerType || undefined,
        borrowerPurpose: form.borrowerPurpose || undefined,
        // Income
        totalDealIncome: form.totalDealIncome || undefined,
        investorIncome: form.investorIncome || undefined,
        companyIncome: form.companyIncome || undefined,
        // Default
        wasDefaulted: form.wasDefaulted,
        collectionStartDate: form.collectionStartDate || undefined,
        propertyRealizationPeriod: form.propertyRealizationPeriod || undefined,
        propertySalePrice: form.propertySalePrice || undefined,
        fundsDistribution: form.fundsDistribution || undefined,
      }

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!json.success) {
        const fieldErrors = json.error?.fields
        if (fieldErrors) {
          const msgs = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v}`).join('; ')
          throw new Error(msgs)
        }
        throw new Error(json.error?.message ?? 'Failed to create deal')
      }

      const dealId = json.data.id

      // Upload images if any (direct to R2 when not local — avoids Vercel body size limit)
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const r = await uploadDealImageFromBrowser(dealId, images[i], { isPrimary: i === 0 })
          if (!r.ok) {
            throw new Error([r.message, r.details].filter(Boolean).join(' — ') || 'Image upload failed')
          }
        }
      }

      router.push(`/deals?portfolio=true`)
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  function buildDealName(f: FormState): string {
    const parts: string[] = []
    if (f.propertyType) parts.push(f.propertyType)
    if (f.propertyCity) parts.push(f.propertyCity)
    if (f.propertyRegion) parts.push(f.propertyRegion)
    if (parts.length === 0) parts.push('Portfolio Deal')
    if (f.originationDate) parts.push(f.originationDate.slice(0, 7))
    return parts.join(' — ')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '11px', color: '#5C5B57', letterSpacing: '1px', marginBottom: 6 }}>
          PORTFOLIO / ADD DEAL
        </div>
        <div style={{ fontSize: '22px', fontWeight: 600, color: '#E8E6DF' }}>
          New Portfolio Deal
        </div>
        <div style={{ fontSize: '12px', color: '#7C7A74', marginTop: 6 }}>
          Track record entry. All fields are optional — fill in what you have.
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 20,
          fontSize: '13px', color: '#E05C5C',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Section 1: Basic Info ──────────────────────────────────────── */}
        <div style={SECTION_HEADING}>Basic Information</div>

        <div style={GRID3}>
          <div>
            <label style={LABEL}>Loan Origination Date</label>
            <input type="date" style={INPUT} value={form.originationDate}
              onChange={e => handleChange('originationDate', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Status</label>
            <select style={INPUT} value={form.status}
              onChange={e => handleChange('status', e.target.value)}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL}>Closing Date (if completed)</label>
            <input type="date" style={INPUT} value={form.actualClosingDate}
              onChange={e => handleChange('actualClosingDate', e.target.value)} />
          </div>
        </div>

        {/* ── Section 2: Property ────────────────────────────────────────── */}
        <div style={SECTION_HEADING}>Property</div>

        <div style={GRID3}>
          <div>
            <label style={LABEL}>Property Type</label>
            <select style={INPUT} value={form.propertyType}
              onChange={e => handleChange('propertyType', e.target.value)}>
              <option value="">— select —</option>
              {PROPERTY_TYPE_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL}>City</label>
            <input type="text" style={INPUT} placeholder="London" value={form.propertyCity}
              onChange={e => handleChange('propertyCity', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>District / Region</label>
            <input type="text" style={INPUT} placeholder="Central" value={form.propertyRegion}
              onChange={e => handleChange('propertyRegion', e.target.value)} />
          </div>
        </div>

        <div style={FIELD}>
          <label style={LABEL}>Property Description</label>
          <textarea rows={3} style={{ ...INPUT, resize: 'vertical' as const }}
            placeholder="Brief description of the property..." value={form.propertyDescription}
            onChange={e => handleChange('propertyDescription', e.target.value)} />
        </div>

        {/* Photo upload */}
        <div style={FIELD}>
          <label style={LABEL}>Property Photos</label>
          <div
            style={{
              border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8,
              padding: '20px', textAlign: 'center', cursor: 'pointer',
              background: '#141519',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files) }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleImageFiles(e.target.files)}
            />
            <div style={{ fontSize: '24px', marginBottom: 8, opacity: 0.4 }}>+</div>
            <div style={{ fontSize: '12px', color: '#5C5B57' }}>
              Click or drag photos here
            </div>
            <div style={{ fontSize: '11px', color: '#3C3B38', marginTop: 4 }}>
              JPG, PNG, WEBP — multiple files supported
            </div>
          </div>

          {imagePreviews.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12,
            }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={src}
                    alt={`preview-${i}`}
                    style={{
                      width: 100, height: 80, objectFit: 'cover',
                      borderRadius: 6, border: i === 0
                        ? '2px solid #C4A355'
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', bottom: 4, left: 4,
                      background: 'rgba(196,163,85,0.9)', color: '#0A0A0C',
                      fontSize: '9px', fontWeight: 700, padding: '1px 5px',
                      borderRadius: 3, letterSpacing: '0.5px',
                    }}>
                      MAIN
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    style={{
                      position: 'absolute', top: 3, right: 3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(224,92,92,0.85)', border: 'none',
                      color: '#fff', fontSize: '11px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 3: Financing ───────────────────────────────────────── */}
        <div style={SECTION_HEADING}>Financing</div>

        <div style={GRID3}>
          <div>
            <label style={LABEL}>Property Valuation (at time of deal)</label>
            <input type="number" style={INPUT} placeholder="1000000" value={form.propertyValuation}
              onChange={e => handleNumericChange('propertyValuation', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Loan Amount</label>
            <input type="number" style={INPUT} placeholder="700000" value={form.loanAmount}
              onChange={e => handleNumericChange('loanAmount', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>LTV, %</label>
            <input type="number" step="0.1" style={{
              ...INPUT,
              background: '#141519',
              color: form.ltv ? '#C4A355' : '#7C7A74',
            }}
              placeholder="auto"
              value={form.ltv}
              onChange={e => handleChange('ltv', e.target.value)} />
          </div>
        </div>

        <div style={GRID3}>
          <div>
            <label style={LABEL}>Interest Rate (% / year)</label>
            <input type="number" step="0.01" style={INPUT} placeholder="24" value={form.interestRate}
              onChange={e => handleChange('interestRate', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Planned Term (months)</label>
            <input type="number" style={INPUT} placeholder="12" value={form.loanDurationMonths}
              onChange={e => handleChange('loanDurationMonths', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Actual Term (months, if closed)</label>
            <input type="number" style={INPUT} placeholder="11" value={form.actualDurationMonths}
              onChange={e => handleChange('actualDurationMonths', e.target.value)} />
          </div>
        </div>

        {/* ── Section 4: Borrower ────────────────────────────────────────── */}
        <div style={SECTION_HEADING}>Borrower</div>

        <div style={GRID2}>
          <div>
            <label style={LABEL}>Borrower Type</label>
            <select style={INPUT} value={form.borrowerType}
              onChange={e => handleChange('borrowerType', e.target.value)}>
              <option value="">— select —</option>
              {BORROWER_TYPE_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL}>Loan Purpose</label>
            <input type="text" style={INPUT}
              placeholder="Renovation, business, refinancing..." value={form.borrowerPurpose}
              onChange={e => handleChange('borrowerPurpose', e.target.value)} />
          </div>
        </div>

        {/* ── Section 5: Returns ─────────────────────────────────────────── */}
        <div style={SECTION_HEADING}>
          Deal Returns
          <span style={{ fontSize: '9px', color: '#7C7A74', marginLeft: 8, letterSpacing: 0, textTransform: 'none' }}>
            auto-calculated from loan × rate × term
          </span>
        </div>

        {/* Company margin control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'rgba(196,163,85,0.05)', border: '1px solid rgba(196,163,85,0.15)', borderRadius: 8 }}>
          <span style={{ fontSize: '12px', color: '#7C7A74', flex: 1 }}>Company margin</span>
          <input
            type="number" min="0" max="100" step="1"
            value={form.companyMarginPct}
            onChange={e => handleChange('companyMarginPct', e.target.value)}
            style={{ ...INPUT, width: 64, textAlign: 'center', fontFamily: 'monospace', padding: '6px 10px' }}
          />
          <span style={{ fontSize: '12px', color: '#7C7A74' }}>%</span>
          <span style={{ fontSize: '11px', color: '#5C5B57', marginLeft: 8 }}>
            Investor gets {isNaN(parseFloat(form.companyMarginPct)) ? '—' : 100 - parseFloat(form.companyMarginPct)}%
          </span>
        </div>

        <div style={GRID3}>
          <div>
            <label style={LABEL}>Total Deal Income</label>
            <input type="text"
              style={{ ...INPUT, color: form.totalDealIncome ? '#C4A355' : '#7C7A74', background: '#141519' }}
              placeholder="fills in automatically"
              value={form.totalDealIncome}
              onChange={e => handleChange('totalDealIncome', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Investor Income</label>
            <input type="text"
              style={{ ...INPUT, color: form.investorIncome ? '#2CC89A' : '#7C7A74', background: '#141519' }}
              placeholder="fills in automatically"
              value={form.investorIncome}
              onChange={e => handleChange('investorIncome', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Company Income</label>
            <input type="text"
              style={{ ...INPUT, color: form.companyIncome ? '#5B9CF6' : '#7C7A74', background: '#141519' }}
              placeholder="fills in automatically"
              value={form.companyIncome}
              onChange={e => handleChange('companyIncome', e.target.value)} />
          </div>
        </div>

        {/* ── Section 6: Default ─────────────────────────────────────────── */}
        <div style={SECTION_HEADING}>Default</div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', fontSize: '13px', color: '#E8E6DF',
          }}>
            <input
              type="checkbox"
              checked={form.wasDefaulted}
              onChange={e => handleChange('wasDefaulted', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#C4A355', cursor: 'pointer' }}
            />
            Did this deal default?
          </label>
        </div>

        {form.wasDefaulted && (
          <div style={{
            background: 'rgba(224,92,92,0.05)',
            border: '1px solid rgba(224,92,92,0.2)',
            borderRadius: 10, padding: '18px 20px',
          }}>
            <div style={{
              fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
              color: '#E05C5C', marginBottom: 16,
            }}>
              Recovery Details
            </div>

            <div style={GRID2}>
              <div>
                <label style={LABEL}>Collection Start Date</label>
                <input type="text" style={INPUT} placeholder="01/03/2025"
                  value={form.collectionStartDate}
                  onChange={e => handleChange('collectionStartDate', e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Property Realisation Period</label>
                <input type="text" style={INPUT} placeholder="3 months"
                  value={form.propertyRealizationPeriod}
                  onChange={e => handleChange('propertyRealizationPeriod', e.target.value)} />
              </div>
            </div>

            <div style={GRID2}>
              <div>
                <label style={LABEL}>Property Sale Price</label>
                <input type="text" style={INPUT} placeholder="£950,000"
                  value={form.propertySalePrice}
                  onChange={e => handleChange('propertySalePrice', e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>How Funds Were Distributed</label>
                <input type="text" style={INPUT} placeholder="Debt repaid + interest, remainder to borrower"
                  value={form.fundsDistribution}
                  onChange={e => handleChange('fundsDistribution', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 36,
          display: 'flex', alignItems: 'center', gap: 14,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 24,
        }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: saving ? '#3C3A34' : '#C4A355',
              color: saving ? '#7C7A74' : '#0A0A0C',
              border: 'none', borderRadius: 8,
              padding: '10px 28px', fontSize: '13px',
              fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving...' : 'Add to Portfolio'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/deals')}
            style={{
              background: 'transparent', color: '#7C7A74',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '10px 20px', fontSize: '13px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <div style={{ fontSize: '11px', color: '#5C5B57', marginLeft: 'auto' }}>
            After saving, find it in Deal Pipeline → Portfolio tab, and on the investor Track Record page
          </div>
        </div>
      </form>
    </div>
  )
}
