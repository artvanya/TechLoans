'use client'
// apps/investor/src/components/deals/deals-filter-bar.tsx
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface Props {
  currentFilters: {
    type?: string; region?: string; riskGrade?: string; minApr?: string; maxLtv?: string
  }
}

const dealTypes = [
  { value: 'BRIDGE_FINANCE', label: 'Bridge' },
  { value: 'DEVELOPMENT_FINANCE', label: 'Development' },
  { value: 'BUY_TO_LET', label: 'Buy-to-Let' },
  { value: 'COMMERCIAL_BRIDGE', label: 'Commercial' },
]

const riskGrades = ['A', 'B', 'C']

export function DealsFilterBar({ currentFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams()
    const current = { ...currentFilters, [key]: value ?? undefined }
    Object.entries(current).forEach(([k, v]) => { if (v) params.set(k, v) })
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const active = currentFilters

  const chipCls = (isActive: boolean) =>
    `px-3 py-1.5 rounded-full text-[11.5px] font-medium border cursor-pointer transition-colors ${isActive ? 'border-nexus-gold text-nexus-gold bg-nexus-gold/5' : 'border-nexus text-nexus-muted hover:border-nexus2'} ${isPending ? 'opacity-50' : ''}`

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-[9.5px] tracking-[1.2px] uppercase text-nexus-hint mr-1">Filter:</span>

      {dealTypes.map(({ value, label }) => (
        <button key={value} onClick={() => setFilter('type', active.type === value ? null : value)}
          className={chipCls(active.type === value)}>
          {label}
        </button>
      ))}

      <span className="w-px h-4 bg-nexus mx-1" />

      {riskGrades.map((g) => (
        <button key={g} onClick={() => setFilter('riskGrade', active.riskGrade === g ? null : g)}
          className={chipCls(active.riskGrade === g)}>
          Grade {g}
        </button>
      ))}

      <button onClick={() => setFilter('minApr', active.minApr === '10' ? null : '10')}
        className={chipCls(active.minApr === '10')}>
        APR &gt; 10%
      </button>

      <button onClick={() => setFilter('maxLtv', active.maxLtv === '65' ? null : '65')}
        className={chipCls(active.maxLtv === '65')}>
        LTV &lt; 65%
      </button>

      {Object.values(active).some(Boolean) && (
        <button onClick={() => router.push(pathname)} className="text-[11px] text-nexus-muted hover:text-nexus-red transition-colors ml-1">
          ✕ Clear
        </button>
      )}
    </div>
  )
}
