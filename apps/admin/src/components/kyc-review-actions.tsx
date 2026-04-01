'use client'
// apps/admin/src/components/kyc-review-actions.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function KycReviewActions({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  async function act(action: string, extra?: Record<string, string>) {
    setLoading(action)
    const res = await fetch(`/api/kyc/${caseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes, ...extra }),
    })
    const data = await res.json()
    setLoading(null)
    if (data.success) { setShowReject(false); setShowInfo(false); router.refresh() }
    else alert(data.error?.message ?? 'Action failed')
  }

  const btnBase = { border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, minWidth: '200px' }}>
      {!showReject && !showInfo ? (
        <>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => act('approve')} disabled={!!loading}
              style={{ ...btnBase, background: 'rgba(44,200,154,0.1)', color: '#2CC89A', flex: 1 }}>
              {loading === 'approve' ? '...' : '✓ Approve'}
            </button>
            <button onClick={() => setShowReject(true)}
              style={{ ...btnBase, background: 'rgba(224,92,92,0.1)', color: '#E05C5C', flex: 1 }}>
              ✕ Reject
            </button>
          </div>
          <button onClick={() => setShowInfo(true)}
            style={{ ...btnBase, background: 'transparent', color: '#7C7A74', border: '1px solid rgba(255,255,255,0.07)' }}>
            Request More Info
          </button>
        </>
      ) : showReject ? (
        <div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (required)..." rows={3}
            style={{ width: '100%', padding: '8px', background: '#18191E', border: '1px solid rgba(224,92,92,0.3)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button onClick={() => setShowReject(false)} style={{ ...btnBase, background: 'transparent', color: '#7C7A74', border: '1px solid rgba(255,255,255,0.07)', flex: 1 }}>Cancel</button>
            <button onClick={() => act('reject', { rejectionReason: reason })} disabled={!reason.trim() || !!loading}
              style={{ ...btnBase, background: 'rgba(224,92,92,0.15)', color: '#E05C5C', flex: 1, opacity: !reason.trim() ? 0.4 : 1 }}>
              {loading ? '...' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What additional information is required?" rows={3}
            style={{ width: '100%', padding: '8px', background: '#18191E', border: '1px solid rgba(232,160,48,0.3)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button onClick={() => setShowInfo(false)} style={{ ...btnBase, background: 'transparent', color: '#7C7A74', border: '1px solid rgba(255,255,255,0.07)', flex: 1 }}>Cancel</button>
            <button onClick={() => act('request_info')} disabled={!!loading}
              style={{ ...btnBase, background: 'rgba(232,160,48,0.1)', color: '#E8A030', flex: 1 }}>
              {loading ? '...' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
