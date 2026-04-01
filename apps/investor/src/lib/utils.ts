// apps/investor/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CRYPTO_SYMBOLS: Record<string, string> = {
  USDC: 'USDC', USDT: 'USDT', BTC: 'BTC', ETH: 'ETH',
}

export function formatCurrency(amount: number, currency = 'GBP', compact = false): string {
  // Handle crypto / non-ISO-4217 currencies
  if (CRYPTO_SYMBOLS[currency]) {
    const formatted = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    return `${formatted} ${currency}`
  }
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(1)}M`
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return `£${(amount / 1_000).toFixed(0)}k`
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(iso: string | null | undefined, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'  ? { day: '2-digit', month: 'short', year: '2-digit' } :
    style === 'long'   ? { day: 'numeric', month: 'long', year: 'numeric' } :
                         { day: 'numeric', month: 'short', year: 'numeric' }
  return d.toLocaleDateString('en-GB', opts)
}

export function formatMonthsToMaturity(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'Matured'
  const months = Math.ceil(diff / (30 * 24 * 60 * 60 * 1000))
  return `${months} mo`
}

export function dealTypeLabel(type: string): string {
  const map: Record<string, string> = {
    BRIDGE_FINANCE: 'Bridge Finance',
    DEVELOPMENT_FINANCE: 'Development Finance',
    BUY_TO_LET: 'Buy-to-Let',
    COMMERCIAL_BRIDGE: 'Commercial Bridge',
    MEZZANINE: 'Mezzanine',
  }
  return map[type] ?? type
}

export function riskGradeLabel(grade: string | null): string {
  if (!grade) return '—'
  const map: Record<string, string> = { A: 'A — Low', B: 'B — Low-Medium', C: 'C — Medium', D: 'D — Higher' }
  return map[grade] ?? grade
}

export function chargeTypeLabel(charge: string): string {
  const map: Record<string, string> = {
    FIRST_CHARGE: 'First Charge',
    SECOND_CHARGE: 'Second Charge',
    DEBENTURE: 'Debenture',
  }
  return map[charge] ?? charge
}

export function fundingProgress(raised: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((raised / target) * 100))
}
