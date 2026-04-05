'use client'
// apps/admin/src/app/(admin)/deals/investment/create/page.tsx
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', background: '#1A1C22',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
  color: '#E8E6DF', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
}
const LABEL: React.CSSProperties = {
  display: 'block', marginBottom: '5px', fontSize: '10px',
  letterSpacing: '1.2px', textTransform: 'uppercase' as const,
  color: '#5C5B57', fontWeight: 500,
}
const SECTION: React.CSSProperties = {
  fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const,
  color: '#C4A355', borderBottom: '1px solid rgba(196,163,85,0.2)',
  paddingBottom: '8px', marginBottom: '18px', marginTop: '32px',
}
const G2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }
const G3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }

interface FormState {
  propertyType: string
  propertyCity: string
  propertyRegion: string
  propertyDescription: string
  propertyValuation: string
  loanAmount: string
  ltv: string
  minimumInvestment: string
  interestRate: string
  loanDurationMonths: string
  borrowerType: string
  borrowerPurpose: string
  status: string
}

const INITIAL: FormState = {
  propertyType: '',
  propertyCity: '',
  propertyRegion: '',
  propertyDescription: '',
  propertyValuation: '',
  loanAmount: '',
  ltv: '',
  minimumInvestment: '1000',
  interestRate: '',
  loanDurationMonths: '',
  borrowerType: '',
  borrowerPurpose: '',
  status: 'LIVE',
}

const PROPERTY_TYPES = ['Apartment', 'House', 'Commercial', 'Land']
const BORROWER_TYPES = ['Individual', 'Business']
const STATUS_OPTIONS = [
  { value: 'LIVE',   label: 'Live — open for investment' },
  { value: 'ACTIVE', label: 'Active — fully funded' },
  { value: 'DRAFT',  label: 'Draft — not visible yet' },
]

function calcProjectedIncome(loan: number, apr: number, months: number) {
  if (!loan || !apr || !months) return { total: '', investor: '' }
  const total = loan * (apr / 100) * (months / 12)
  const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
  // Investor gets ~70% by default for open investments
  return { total: fmt(total), investor: fmt(total * 0.7) }
}

export default function AddInvestmentPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loan = parseFloat(form.loanAmount) || 0
  const apr = parseFloat(form.interestRate) || 0
  const months = parseInt(form.loanDurationMonths) || 0
  const projected = calcProjectedIncome(loan, apr, months)

  function handleNumeric(field: keyof FormState, value: string) {
    const updated = { ...form, [field]: value }
    if (field === 'loanAmount' || field === 'propertyValuation') {
      const l = parseFloat(field === 'loanAmount' ? value : form.loanAmount) || 0
      const v = parseFloat(field === 'propertyValuation' ? value : form.propertyValuation) || 0
      if (l > 0 && v > 0) updated.ltv = ((l / v) * 100).toFixed(1)
    }
    setForm(updated)
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleImageFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files)
    setImages(prev => [...prev, ...newFiles])
    setImagePreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => { URL.revokeObjectURL(prev[idx]); return prev.filter((_, i) => i !== idx) })
  }

  function buildName(f: FormState) {
    const parts: string[] = []
    if (f.propertyType) parts.push(f.propertyType)
    if (f.propertyCity) parts.push(f.propertyCity)
    if (f.propertyRegion) parts.push(f.propertyRegion)
    if (parts.length === 0) parts.push('Open Investment')
    if (f.loanAmount) parts.push(`£${Math.round(parseFloat(f.loanAmount) / 1000)}k`)
    return parts.join(' — ')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const loanAmt = parseFloat(form.loanAmount) || 1
      const valuation = parseFloat(form.propertyValuation) || loanAmt
      const ltv = parseFloat(form.ltv) || Math.round((loanAmt / valuation) * 1000) / 10
      const minInvest = parseFloat(form.minimumInvestment) || 1000

      const payload = {
        name: buildName(form),
        type: 'BRIDGE_FINANCE',
        status: form.status,
        isPortfolio: false,
        openForInvestment: form.status === 'LIVE',
        visibleToInvestors: form.status !== 'DRAFT',
        loanAmount: loanAmt,
        propertyValuation: valuation,
        ltv,
        investorApr: parseFloat(form.interestRate) || 0,
        loanDurationMonths: parseInt(form.loanDurationMonths) || 1,
        targetRaise: loanAmt,
        minimumInvestment: minInvest,
        repaymentType: 'MONTHLY_INTEREST_BULLET',
        chargeType: 'FIRST_CHARGE',
        propertyType: form.propertyType || undefined,
        propertyCity: form.propertyCity || undefined,
        propertyRegion: form.propertyRegion || undefined,
        propertyDescription: form.propertyDescription || undefined,
        borrowerType: form.borrowerType || undefined,
        borrowerPurpose: form.borrowerPurpose || undefined,
      }

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) {
        const fields = json.error?.fields
        if (fields) throw new Error(Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('; '))
        throw new Error(json.error?.message ?? 'Failed to create deal')
      }

      const dealId = json.data.id
      for (let i = 0; i < images.length; i++) {
        const fd = new FormData()
        fd.append('file', images[i])
        fd.append('isPrimary', i === 0 ? 'true' : 'false')
        fd.append('sortOrder', String(i))
        await fetch(`/api/deals/${dealId}/images`, { method: 'POST', body: fd })
      }

      router.push('/deals?investment=true')
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '11px', color: '#5C5B57', letterSpacing: '1px', marginBottom: 6 }}>
          OPEN INVESTMENTS / ADD DEAL
        </div>
        <div style={{ fontSize: '22px', fontWeight: 600, color: '#E8E6DF' }}>New Open Investment</div>
        <div style={{ fontSize: '12px', color: '#7C7A74', marginTop: 6 }}>
          Investors will be able to allocate capital to this deal. All fields are optional.
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '13px', color: '#E05C5C' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Basic Info ──────────────────────────────────────────────── */}
        <div style={{ ...SECTION, marginTop: 0 }}>Basic Information</div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>Status</label>
          <select style={INPUT} value={form.status} onChange={e => handleChange('status', e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* ── Property ───────────────────────────────────────────────── */}
        <div style={SECTION}>Property</div>
        <div style={G3}>
          <div>
            <label style={LABEL}>Property Type</label>
            <select style={INPUT} value={form.propertyType} onChange={e => handleChange('propertyType', e.target.value)}>
              <option value="">— select —</option>
              {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>City</label>
            <input style={INPUT} placeholder="London" value={form.propertyCity} onChange={e => handleChange('propertyCity', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>District / Region</label>
            <input style={INPUT} placeholder="Central" value={form.propertyRegion} onChange={e => handleChange('propertyRegion', e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>Property Description</label>
          <textarea rows={3} style={{ ...INPUT, resize: 'vertical' as const }} placeholder="Brief description of the property and deal..." value={form.propertyDescription} onChange={e => handleChange('propertyDescription', e.target.value)} />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>Property Photos</label>
          <div
            style={{ border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#141519' }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files) }}
          >
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleImageFiles(e.target.files)} />
            <div style={{ fontSize: '24px', marginBottom: 8, opacity: 0.4 }}>+</div>
            <div style={{ fontSize: '12px', color: '#5C5B57' }}>Click or drag photos here</div>
            <div style={{ fontSize: '11px', color: '#3C3B38', marginTop: 4 }}>JPG, PNG, WEBP — multiple files supported</div>
          </div>
          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={src} alt="" style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 6, border: i === 0 ? '2px solid #C4A355' : '1px solid rgba(255,255,255,0.1)' }} />
                  {i === 0 && <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(196,163,85,0.9)', color: '#0A0A0C', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>MAIN</div>}
                  <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(224,92,92,0.85)', border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Financing ──────────────────────────────────────────────── */}
        <div style={SECTION}>Financing</div>
        <div style={G3}>
          <div>
            <label style={LABEL}>Property Valuation (£)</label>
            <input type="number" style={INPUT} placeholder="1000000" value={form.propertyValuation} onChange={e => handleNumeric('propertyValuation', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Loan Amount Requested (£)</label>
            <input type="number" style={INPUT} placeholder="700000" value={form.loanAmount} onChange={e => handleNumeric('loanAmount', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>LTV, %</label>
            <input type="number" step="0.1" style={{ ...INPUT, background: '#141519', color: form.ltv ? '#C4A355' : '#7C7A74' }} placeholder="auto" value={form.ltv} onChange={e => handleChange('ltv', e.target.value)} />
          </div>
        </div>
        <div style={G3}>
          <div>
            <label style={LABEL}>Minimum Investment (£)</label>
            <input type="number" style={INPUT} placeholder="1000" value={form.minimumInvestment} onChange={e => handleChange('minimumInvestment', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Interest Rate (% / year)</label>
            <input type="number" step="0.01" style={INPUT} placeholder="14" value={form.interestRate} onChange={e => handleChange('interestRate', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Planned Term (months)</label>
            <input type="number" style={INPUT} placeholder="12" value={form.loanDurationMonths} onChange={e => handleChange('loanDurationMonths', e.target.value)} />
          </div>
        </div>

        {/* ── Borrower ───────────────────────────────────────────────── */}
        <div style={SECTION}>Borrower</div>
        <div style={G2}>
          <div>
            <label style={LABEL}>Borrower Type</label>
            <select style={INPUT} value={form.borrowerType} onChange={e => handleChange('borrowerType', e.target.value)}>
              <option value="">— select —</option>
              {BORROWER_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>Loan Purpose</label>
            <input style={INPUT} placeholder="Renovation, business, refinancing..." value={form.borrowerPurpose} onChange={e => handleChange('borrowerPurpose', e.target.value)} />
          </div>
        </div>

        {/* ── Projected Returns ─────────────────────────────────────── */}
        <div style={SECTION}>
          Projected Returns
          <span style={{ fontSize: '9px', color: '#7C7A74', marginLeft: 8, letterSpacing: 0, textTransform: 'none' }}>
            estimated from loan × rate × term
          </span>
        </div>
        <div style={G2}>
          <div>
            <label style={LABEL}>Projected Total Income</label>
            <input readOnly style={{ ...INPUT, background: '#141519', color: projected.total ? '#C4A355' : '#5C5B57' }} value={projected.total} placeholder="fill in loan, rate & term above" />
          </div>
          <div>
            <label style={LABEL}>Projected Investor Income</label>
            <input readOnly style={{ ...INPUT, background: '#141519', color: projected.investor ? '#2CC89A' : '#5C5B57' }} value={projected.investor} placeholder="fill in loan, rate & term above" />
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#5C5B57', marginTop: -8, marginBottom: 14 }}>
          Based on 70% investor / 30% company split. Actual returns depend on final allocation.
        </div>

        {/* ── Submit ────────────────────────────────────────────────── */}
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24 }}>
          <button type="submit" disabled={saving} style={{ background: saving ? '#3C3A34' : '#C4A355', color: saving ? '#7C7A74' : '#0A0A0C', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Saving...' : 'Publish Investment'}
          </button>
          <button type="button" onClick={() => router.push('/deals')} style={{ background: 'transparent', color: '#7C7A74', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <div style={{ fontSize: '11px', color: '#5C5B57', marginLeft: 'auto' }}>
            After saving → Deal Pipeline → Investments tab
          </div>
        </div>
      </form>
    </div>
  )
}
