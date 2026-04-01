// apps/investor/src/components/ui/panel.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div className={cn('bg-nexus-bg2 border border-nexus rounded-lg overflow-hidden', className)}>
      {children}
    </div>
  )
}

interface PanelHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PanelHeader({ title, subtitle, action }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-nexus">
      <div>
        <div className="text-[12.5px] font-semibold text-nexus-text">{title}</div>
        {subtitle && <div className="text-[10.5px] text-nexus-muted mt-0.5">{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  delta?: { value: string; direction: 'up' | 'down' | 'neutral' }
}

export function MetricCard({ label, value, sub, delta }: MetricCardProps) {
  return (
    <div className="bg-nexus-bg2 border border-nexus rounded-lg p-5 hover:border-nexus2 transition-colors">
      <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-2.5">{label}</div>
      <div className="font-mono text-[26px] font-medium tracking-tight leading-none text-nexus-text">
        {value}
      </div>
      {sub && <div className="text-[11px] text-nexus-muted mt-1.5">{sub}</div>}
      {delta && (
        <div className={cn(
          'inline-flex items-center text-[10px] font-semibold mt-1.5 px-1.5 py-0.5 rounded',
          delta.direction === 'up'      && 'bg-nexus-teal/10 text-nexus-teal',
          delta.direction === 'down'    && 'bg-nexus-red/10 text-nexus-red',
          delta.direction === 'neutral' && 'bg-nexus-gold/10 text-nexus-gold',
        )}>
          {delta.value}
        </div>
      )}
    </div>
  )
}
