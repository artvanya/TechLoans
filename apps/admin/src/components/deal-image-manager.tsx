'use client'
// apps/admin/src/components/deal-image-manager.tsx
import { useState, useEffect, useRef } from 'react'

interface DealImage {
  id: string
  fileName: string
  isPrimary: boolean
  sortOrder: number
  url: string
}

interface DealImageManagerProps {
  dealId: string
}

export function DealImageManager({ dealId }: DealImageManagerProps) {
  const [images, setImages] = useState<DealImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const res = await fetch(`/api/deals/${dealId}/images`)
      const data = await res.json()
      if (data.success) setImages(data.data)
    } catch {}
  }

  useEffect(() => { load() }, [dealId])

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/deals/${dealId}/images`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) { setError(data.error?.message ?? 'Upload failed'); break }
    }
    setUploading(false)
    load()
  }

  async function setPrimary(imageId: string) {
    await fetch(`/api/deals/${dealId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_primary', imageId }),
    })
    load()
  }

  async function deleteImage(imageId: string) {
    await fetch(`/api/deals/${dealId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', imageId }),
    })
    load()
  }

  const s: React.CSSProperties = {
    background: '#18191E', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '8px', color: '#E8E6DF', fontSize: '12.5px',
    outline: 'none', padding: '9px 12px', width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files) }}
        style={{
          border: '2px dashed rgba(196,163,85,0.25)', borderRadius: '10px',
          padding: '28px', textAlign: 'center', cursor: 'pointer',
          background: 'rgba(196,163,85,0.03)', transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => upload(e.target.files)}
        />
        <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>🖼</div>
        <div style={{ fontSize: '13px', color: '#E8E6DF', marginBottom: '4px' }}>
          {uploading ? 'Uploading…' : 'Click to upload or drag & drop'}
        </div>
        <div style={{ fontSize: '11px', color: '#7C7A74' }}>JPEG, PNG, WebP · max 20MB each</div>
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: '#E05C5C', background: 'rgba(224,92,92,0.08)', padding: '10px 14px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#7C7A74', textAlign: 'center', padding: '16px 0' }}>
          No images uploaded yet. The first image added will be the primary card image.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {images.map((img) => (
            <div key={img.id} style={{ background: '#18191E', border: `1px solid ${img.isPrimary ? '#C4A355' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
              {/* Primary badge */}
              {img.isPrimary && (
                <div style={{ position: 'absolute', top: 6, left: 6, background: '#C4A355', color: '#0A0A0C', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', padding: '2px 7px', borderRadius: '4px', zIndex: 2 }}>
                  PRIMARY
                </div>
              )}
              {/* Image */}
              <div style={{ height: '100px', overflow: 'hidden', background: '#0D0E11' }}>
                <img src={img.url} alt={img.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {/* Actions */}
              <div style={{ padding: '8px', display: 'flex', gap: '5px' }}>
                {!img.isPrimary && (
                  <button
                    onClick={() => setPrimary(img.id)}
                    style={{ flex: 1, background: 'rgba(196,163,85,0.08)', color: '#C4A355', border: '1px solid rgba(196,163,85,0.2)', borderRadius: '5px', padding: '4px', fontSize: '10px', cursor: 'pointer' }}
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => deleteImage(img.id)}
                  style={{ background: 'rgba(224,92,92,0.08)', color: '#E05C5C', border: '1px solid rgba(224,92,92,0.2)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '0 8px 8px', fontSize: '9.5px', color: '#5C5B57', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {img.fileName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
