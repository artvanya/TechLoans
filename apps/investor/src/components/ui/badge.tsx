// apps/investor/src/components/ui/badge.tsx
import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'gold' | 'red' | 'blue' | 'purple' | 'amber' | 'gray'

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-nexus-teal/10 text-nexus-teal',
  gold:   'bg-nexus-gold/10 text-nexus-gold',
  red:    'bg-nexus-red/10 text-nexus-red',
  blue:   'bg-nexus-blue/10 text-nexus-blue',
  purple: 'bg-nexus-purple/10 text-nexus-purple',
  amber:  'bg-nexus-amber/10 text-nexus-amber',
  gray:   'bg-white/5 text-nexus-muted border border-nexus',
}

const statusVariantMap: Record<string, BadgeVariant> = {
  LIVE: 'green', ACTIVE: 'green', APPROVED: 'blue',
  FUNDED: 'gold', UNDER_REVIEW: 'amber', DRAFT: 'gray',
  REPAID: 'blue', DEFAULTED: 'red', REJECTED: 'red', CLOSED: 'gray',
  CONFIRMED: 'green', PENDING: 'amber', PROCESSING: 'blue',
  COMPLETED: 'green', FAILED: 'red', CANCELLED: 'gray',
  NOT_STARTED: 'gray', DOCUMENTS_SUBMITTED: 'amber',
  ADDITIONAL_INFO_REQUIRED: 'amber', EXPIRED: 'red', REFRESH_REQUIRED: 'amber',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  status?: string
  className?: string
}

export function Badge({ children, variant, status, className }: BadgeProps) {
  const v = variant ?? (status ? (statusVariantMap[status] ?? 'gray') : 'gray')
  return (
    <span className={cn(
      'inline-flex items-center text-[10px] font-semibold tracking-[0.3px] px-1.5 py-0.5 rounded',
      variantClasses[v],
      className
    )}>
      {children}
    </span>
  )
}
