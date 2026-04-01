// apps/investor/src/components/ui/button.tsx
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#BFA063] text-[#09090B] font-semibold hover:bg-[#D4B57A]',
  outline: 'bg-transparent text-[#EDEAE3] border border-[rgba(255,255,255,0.18)] hover:border-[#BFA063] hover:text-[#BFA063]',
  ghost:   'bg-transparent text-[#7A7873] hover:bg-white/[0.04] hover:text-[#EDEAE3]',
  danger:  'bg-[rgba(224,85,85,0.1)] text-[#E05555] border border-transparent hover:border-[#E05555]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-[11px] px-3 py-1.5 rounded-md',
  md: 'text-[12.5px] px-4 py-2 rounded-lg',
  lg: 'text-[13px] px-5 py-3 rounded-lg',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant = 'outline',
  size = 'md',
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  )
}
