'use client'
// apps/admin/src/components/deal-documents-manager.tsx
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface DealDoc {
  id: string
  category: string
  fileName: string
  mimeType: string
  sizeBytes: number
  isInternal: boolean
  uploadedAt: string
}

interface Props {
  dealId: string
  documents: DealDoc[]
}

const CATEGORIES = [
  { value: 'VALUATION_REPORT',   label: 'Valuation Report',         required: true,  internal: false },
  { value: 'LEGAL_PACK',         label: 'Legal Pack',                required: false, internal: false },
  { value: 'BORROWER_SUMMARY',   label: 'Borrower Summary',          required: false, internal: false },
  { value: 'COLLATERAL_DOCS',    label: 'Collateral Documents',      required: false, internal: false },
  { value: 'TERM_SHEET',         label: 'Term Sheet',                required: false, internal: false },
  { value: 'INTERNAL_MEMO',      label: 'Internal Credit Memo',      required: false, internal: true  },
  { value: 'OTHER',              label: 'Other Document',            required: false, internal: false },
]

export function DealDocumentsManager({ dealId, documents: initial }: Props) {
  const router = useRouter()
  const [docs, setDocs] = useState<DealDoc[]>(initial)
  const [uploading, setUploading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  function docsForCategory(category: string) {
    return docs.filter((d) => d.category === category && !d.fileName.startsWith('[deleted]'))
  }

  function triggerUpload(category: string) {
    setActiveCategory(category)
    fileInputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeCategory) return
    e.target.value = ''

    const catMeta = CATEGORIES.find((c) => c.value === activeCategory)
    setUploading(activeCategory)
    setErrors((err) => { const n = { ...err }; delete n[activeCategory!]; return n })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', activeCategory)
    fd.append('isInternal', String(catMeta?.internal ?? false))

    try {
      const res = await fetch(`/api/deals/${dealId}/documents`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setDocs((d) => [...d, {
          id: data.data.id, category: activeCategory,
          fileName: file.name, mimeType: file.type,
          sizeBytes: file.size, isInternal: catMeta?.internal ?? false,
          uploadedAt: new Date().toISOString(),
        }])
        router.refresh()
      } else {
        setErrors((e) => ({ ...e, [activeCategory!]: data.error?.message ?? 'Upload failed' }))
      }
    } catch {
      setErrors((e) => ({ ...e, [activeCategory!]: 'Network error' }))
    } finally {
      setUploading(null)
    }
  }

  async function deleteDoc(docId: string, category: string) {
    if (!confirm('Delete this document?')) return
    const res = await fetch(`/api/deals/${dealId}/documents?docId=${docId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setDocs((d) => d.filter((doc) => doc.id !== docId))
      router.refresh()
    }
  }

  async function downloadDoc(docId: string) {
    const res = await fetch(`/api/deals/${dealId}/documents/${docId}/admin`)
    const data = await res.json()
    if (data.success) window.open(data.data.url, '_blank')
  }

  const s: React.CSSProperties = { fontFamily: "'Outfit', sans-serif" }
  const card: React.CSSProperties = { background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }

  return (
    <div style={s}>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,image/*" onChange={handleFile} style={{ display: 'none' }} />

      {CATEGORIES.map(({ value, label, required, internal }) => {
        const existing = docsForCategory(value)
        const isUploading = uploading === value
        const err = errors[value]

        return (
          <div key={value} style={card}>
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: existing.length > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {label}
                  {required && <span style={{ color: '#E05C5C', fontSize: '11px' }}>*</span>}
                  {internal && <span style={{ background: 'rgba(232,160,48,0.1)', color: '#E8A030', fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px' }}>INTERNAL</span>}
                </div>
                {err && <div style={{ fontSize: '11px', color: '#E05C5C', marginTop: '3px' }}>{err}</div>}
              </div>
              <button
                onClick={() => triggerUpload(value)}
                disabled={isUploading}
                style={{ background: isUploading ? 'rgba(44,200,154,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: '#E8E6DF', cursor: 'pointer', opacity: isUploading ? 0.6 : 1 }}
              >
                {isUploading ? 'Uploading...' : existing.length > 0 ? '+ Add version' : 'Upload'}
              </button>
            </div>

            {existing.map((doc) => (
              <div key={doc.id} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '15px' }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName}</div>
                  <div style={{ fontSize: '10px', color: '#7C7A74' }}>
                    {(doc.sizeBytes / 1024).toFixed(0)}KB · {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => downloadDoc(doc.id)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '4px 9px', fontSize: '10px', color: '#7C7A74', cursor: 'pointer' }}>↓ View</button>
                  <button onClick={() => deleteDoc(doc.id, value)} style={{ background: 'rgba(224,92,92,0.08)', border: 'none', borderRadius: '6px', padding: '4px 9px', fontSize: '10px', color: '#E05C5C', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
