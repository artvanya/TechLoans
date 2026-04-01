'use client'
// apps/investor/src/components/ui/toaster.tsx
import { useEffect, useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// Simple event bus for toasts
const listeners: Set<(t: Toast) => void> = new Set()
export function toast(message: string, type: Toast['type'] = 'success') {
  const t: Toast = { id: Math.random().toString(36), message, type }
  listeners.forEach((fn) => fn(t))
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000)
    }
    listeners.add(handler)
    return () => { listeners.delete(handler) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-[12.5px] shadow-lg animate-fadeIn ${
          t.type === 'success' ? 'bg-nexus-bg4 border-nexus-teal/30 text-nexus-text' :
          t.type === 'error'   ? 'bg-nexus-bg4 border-nexus-red/30 text-nexus-text' :
                                 'bg-nexus-bg4 border-nexus2 text-nexus-text'
        }`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
