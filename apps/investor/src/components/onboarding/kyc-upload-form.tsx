'use client'
// apps/investor/src/components/onboarding/kyc-upload-form.tsx
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'KYC_IDENTITY',     label: 'Identity Document',     desc: 'Passport, national ID, or driving licence' },
  { value: 'KYC_ADDRESS',      label: 'Proof of Address',       desc: 'Bank statement or utility bill (< 3 months)' },
  { value: 'SOURCE_OF_FUNDS',  label: 'Source of Funds',        desc: 'Bank statement, payslip, or investment account' },
]

export function KycUploadForm({ kycCaseId }: { kycCaseId?: string }) {
  const router = useRouter()
  const [uploads, setUploads] = useState<Record<string, { file: File; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string }>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  function selectFile(category: string) {
    setActiveCategory(category)
    inputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeCategory) return
    e.target.value = ''

    setUploads((u) => ({ ...u, [activeCategory]: { file, status: 'uploading' } }))

    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', activeCategory)
    if (kycCaseId) fd.append('kycCaseId', kycCaseId)

    try {
      const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setUploads((u) => ({ ...u, [activeCategory]: { file, status: 'done' } }))
        router.refresh()
      } else {
        setUploads((u) => ({ ...u, [activeCategory]: { file, status: 'error', error: data.error?.message } }))
      }
    } catch {
      setUploads((u) => ({ ...u, [activeCategory]: { file, status: 'error', error: 'Upload failed. Please try again.' } }))
    }
  }

  const allDone = CATEGORIES.slice(0, 2).every((c) => uploads[c.value]?.status === 'done')

  return (
    <div>
      <input ref={inputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />

      <div className="space-y-3">
        {CATEGORIES.map(({ value, label, desc }) => {
          const up = uploads[value]
          return (
            <div key={value} className="flex items-center gap-3 p-3.5 bg-nexus-bg3 rounded-lg border border-nexus">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${up?.status === 'done' ? 'bg-nexus-teal/10 text-nexus-teal' : 'bg-nexus-bg4 text-nexus-hint'}`}>
                {up?.status === 'done' ? '✓' : up?.status === 'uploading' ? '⟳' : '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium">{label}</div>
                <div className="text-[11px] text-nexus-muted mt-0.5 truncate">
                  {up?.status === 'done' ? `✓ ${up.file.name}` : up?.status === 'error' ? up.error : desc}
                </div>
              </div>
              <button
                onClick={() => selectFile(value)}
                disabled={up?.status === 'uploading'}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium border transition-colors flex-shrink-0 ${
                  up?.status === 'done'
                    ? 'border-nexus-teal/30 text-nexus-teal bg-nexus-teal/5 hover:bg-nexus-teal/10'
                    : 'border-nexus2 text-nexus-text hover:border-nexus-gold hover:text-nexus-gold'
                }`}
              >
                {up?.status === 'uploading' ? 'Uploading...' : up?.status === 'done' ? 'Replace' : 'Upload'}
              </button>
            </div>
          )
        })}
      </div>

      {allDone && (
        <div className="mt-4 p-3.5 bg-nexus-teal/10 border border-nexus-teal/20 rounded-lg text-[12.5px] text-nexus-teal">
          ✓ Documents uploaded. Our compliance team will review within 1–2 business days.
          You will receive an email notification once your account is approved.
        </div>
      )}
    </div>
  )
}
