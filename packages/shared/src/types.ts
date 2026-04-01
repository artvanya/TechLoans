// packages/shared/src/types.ts
// Shared types used across investor and admin apps

export type UserRole = 'INVESTOR' | 'ADMIN' | 'SUPER_ADMIN' | 'COMPLIANCE_OFFICER'

export type KycStatus =
  | 'NOT_STARTED'
  | 'DOCUMENTS_REQUESTED'
  | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REFRESH_REQUIRED'

export type DealStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'LIVE'
  | 'FUNDED'
  | 'ACTIVE'
  | 'REPAID'
  | 'DEFAULTED'
  | 'CLOSED'
  | 'REJECTED'

export type DealType =
  | 'BRIDGE_FINANCE'
  | 'DEVELOPMENT_FINANCE'
  | 'BUY_TO_LET'
  | 'COMMERCIAL_BRIDGE'
  | 'MEZZANINE'

export type RiskGrade = 'A' | 'B' | 'C' | 'D'

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'INVESTMENT'
  | 'REPAYMENT_INTEREST'
  | 'REPAYMENT_PRINCIPAL'
  | 'FEE'
  | 'PENALTY'
  | 'REFUND'

// ── API Response wrappers ──

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: {
    total?: number
    page?: number
    pageSize?: number
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ── Deal DTOs ──

export interface DealSummary {
  id: string
  internalId: string
  name: string
  status: DealStatus
  type: DealType
  propertyCity: string | null
  propertyRegion: string | null
  loanAmount: number
  propertyValuation: number
  ltv: number
  investorApr: number
  minimumInvestment: number
  loanDurationMonths: number
  targetRaise: number
  currentRaised: number
  riskGrade: RiskGrade | null
  chargeType: string
  isFeatured: boolean
  publishedAt: string | null
  primaryImageUrl: string | null
  investorCount: number
}

export interface DealDetail extends DealSummary {
  summary: string | null
  propertyType: string | null
  propertyAddress: string | null
  propertyPostcode: string | null
  propertyDescription: string | null
  collateralSummary: string | null
  occupancyStatus: string | null
  maturityDate: string | null
  expectedExitDate: string | null
  repaymentType: string
  exitRoute: string | null
  underwritingSummary: string | null
  keyStrengths: string | null
  keyRisks: string | null
  downsideProtection: string | null
  valuationSource: string | null
  recoveryTimeMonths: number | null
  scenarioNote: string | null
  borrowerPurpose: string | null
  openForInvestment: boolean
  approvedInvestorsOnly: boolean
  autoInvestEligible: boolean
  documents: DealDocumentPublic[]
  images: DealImagePublic[]
}

export interface DealDocumentPublic {
  id: string
  category: string
  fileName: string
  uploadedAt: string
}

export interface DealImagePublic {
  id: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

// ── Portfolio DTOs ──

export interface InvestmentRecord {
  id: string
  dealId: string
  dealName: string
  dealType: DealType
  dealStatus: DealStatus
  amount: number
  status: string
  investorApr: number
  ltv: number
  chargeType: string
  maturityDate: string | null
  confirmedAt: string | null
  totalEarned: number
  expectedTotal: number
}

export interface WalletBalance {
  currency: string
  balance: number
  gbpEquivalent: number
}

export interface TransactionRecord {
  id: string
  type: TransactionType
  amount: number
  currency: string
  status: string
  description: string | null
  txHash: string | null
  createdAt: string
}

// ── Admin DTOs ──

export interface AdminDealRow {
  id: string
  internalId: string
  name: string
  type: DealType
  propertyCity: string | null
  propertyRegion: string | null
  loanAmount: number
  ltv: number
  investorApr: number
  targetRaise: number
  currentRaised: number
  status: DealStatus
  visibleToInvestors: boolean
  riskGrade: RiskGrade | null
  investorCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminInvestorRow {
  userId: string
  email: string
  firstName: string
  lastName: string
  tier: string
  kycStatus: KycStatus
  totalDeployed: number
  isActive: boolean
  isLocked: boolean
  createdAt: string
}

export interface KycQueueItem {
  kycCaseId: string
  investorProfileId: string
  userId: string
  email: string
  firstName: string
  lastName: string
  kycLevel: string
  status: KycStatus
  submittedAt: string
  documentCount: number
}

// ── Additional types needed by API routes ──

export interface ServicingLogDTO {
  id: string
  eventType: string
  amount?: number | null
  eventDate: string
  notes?: string | null
  loggedBy: string
  createdAt: string
}

export interface NotificationDTO {
  id: string
  type: string
  title: string
  body: string
  readAt?: string | null
  createdAt: string
}

export interface PayoutDTO {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  scheduledDate: string
  processedAt?: string | null
  dealName: string
  dealInternalId: string
  investorEmail: string
  investmentId: string
}

export interface DashboardMetrics {
  totalDeployed: number
  availableBalance: number
  realisedYtd: number
  activePositions: number
  weightedLtv: number
  weightedApr: number
  monthlyIncome: Record<string, number>
}

export interface PortfolioSummary {
  totalDeployed: number
  realisedYtd: number
  unrealisedAccrued: number
  expectedFullTerm: number
  weightedAvgLtv: number
  weightedAvgApr: number
  weightedAvgDuration: number
  firstChargePercent: number
  activePositions: number
  completedPositions: number
  defaultedPositions: number
  byType: Record<string, number>
  byRegion: Record<string, number>
  byRiskGrade: Record<string, number>
}
