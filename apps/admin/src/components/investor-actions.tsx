'use client'
// apps/admin/src/components/investor-actions.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  isActive: boolean
  isLocked: boolean
  currentTier: string
}

export function InvestorActions({ userId, isActive, isLocked, currentTier }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody, setNotifBody] = useState('')

  async function action(type: string, extra?: Record<string, string>) {
    setLoading(true)
    const res = await fetch(`/api/investors/${userId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: type, ...extra }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) router.refresh()
    else alert(data.error?.message ?? 'Action failed')
  }

  const btnStyle = (color: string) => ({
    background: `${color}18`, color, border: 'none', borderRadius: '6px',
    padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
    opacity: loading ? 0.5 : 1,
  } as React.CSSProperties)

  return (
    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
      {isLocked && (
        <button onClick={() => action('unlock')} disabled={loading} style={btnStyle('#2CC89A')}>Unlock</button>
      )}
      {isActive ? (
        <button onClick={() => { if (confirm('Restrict this investor?')) action('restrict', { reason: 'Manual restriction by operator' }) }} disabled={loading} style={btnStyle('#E05C5C')}>Restrict</button>
      ) : (
        <button onClick={() => action('restore')} disabled={loading} style={btnStyle('#2CC89A')}>Restore</button>
      )}
      <select defaultValue={currentTier} onChange={(e) => action('set_tier', { tier: e.target.value })} disabled={loading}
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#E8E6DF', cursor: 'pointer', appearance: 'none' }}>
        <option value="STANDARD">Standard</option>
        <option value="PREMIUM">Premium</option>
        <option value="PLATINUM">Platinum</option>
      </select>
      {!showNotify ? (
        <button onClick={() => setShowNotify(true)} style={btnStyle('#5B9CF6')}>Notify</button>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowNotify(false)}>
          <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '12px', padding: '24px', width: '380px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Send Notification</div>
            <input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Notification title"
              style={{ width: '100%', padding: '9px 12px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12.5px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
            <textarea value={notifBody} onChange={(e) => setNotifBody(e.target.value)} placeholder="Notification message" rows={3}
              style={{ width: '100%', padding: '9px 12px', background: '#18191E', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '8px', color: '#E8E6DF', fontSize: '12.5px', outline: 'none', resize: 'none', marginBottom: '14px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowNotify(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#7C7A74', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              <button onClick={async () => {
                await action('send_notification', { notificationTitle: notifTitle, notificationBody: notifBody })
                setShowNotify(false); setNotifTitle(''); setNotifBody('')
              }} disabled={!notifTitle.trim() || !notifBody.trim()}
                style={{ flex: 1, padding: '9px', background: '#C4A355', border: 'none', borderRadius: '8px', color: '#0A0A0C', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
