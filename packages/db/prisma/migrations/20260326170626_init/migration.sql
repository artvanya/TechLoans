-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INVESTOR', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REFRESH_REQUIRED');

-- CreateEnum
CREATE TYPE "KycLevel" AS ENUM ('STANDARD', 'ENHANCED', 'PLATINUM');

-- CreateEnum
CREATE TYPE "InvestorTier" AS ENUM ('STANDARD', 'PREMIUM', 'PLATINUM');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'LIVE', 'FUNDED', 'ACTIVE', 'REPAID', 'DEFAULTED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('BRIDGE_FINANCE', 'DEVELOPMENT_FINANCE', 'BUY_TO_LET', 'COMMERCIAL_BRIDGE', 'MEZZANINE');

-- CreateEnum
CREATE TYPE "RiskGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('FIRST_CHARGE', 'SECOND_CHARGE', 'DEBENTURE');

-- CreateEnum
CREATE TYPE "RepaymentType" AS ENUM ('MONTHLY_INTEREST_BULLET', 'ROLLED_UP_BULLET', 'QUARTERLY_INTEREST_BULLET', 'AMORTISING');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ACTIVE', 'REPAID', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'REPAYMENT_INTEREST', 'REPAYMENT_PRINCIPAL', 'FEE', 'PENALTY', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('VALUATION_REPORT', 'LEGAL_PACK', 'BORROWER_SUMMARY', 'COLLATERAL_DOCS', 'TERM_SHEET', 'INTERNAL_MEMO', 'KYC_IDENTITY', 'KYC_ADDRESS', 'SOURCE_OF_FUNDS', 'INVESTOR_AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_RESET', 'APPROVE', 'REJECT', 'PUBLISH', 'UNPUBLISH', 'UPLOAD', 'DOWNLOAD', 'EXPORT', 'PAYOUT_RUN', 'INVESTMENT', 'WITHDRAWAL_APPROVE', 'WITHDRAWAL_REJECT', 'KYC_APPROVE', 'KYC_REJECT', 'ROLE_CHANGE', 'ACCOUNT_RESTRICT', 'ACCOUNT_RESTORE', 'CREDIT_LINE_APPROVE');

-- CreateEnum
CREATE TYPE "ServicingEventType" AS ENUM ('INTEREST_RECEIVED', 'PRINCIPAL_REPAYMENT_FULL', 'PARTIAL_REPAYMENT', 'LATE_PAYMENT', 'PENALTY_APPLIED', 'MATURITY_EXTENSION', 'DEFAULT_NOTICE', 'LPA_RECEIVER_APPOINTED', 'PROPERTY_LISTED', 'COLLATERAL_SALE_COMPLETED', 'ENFORCEMENT_COMPLETED', 'DEAL_CLOSED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVESTMENT_CONFIRMED', 'INTEREST_PAID', 'PRINCIPAL_REPAID', 'DEAL_LIVE', 'KYC_APPROVED', 'KYC_REJECTED', 'KYC_MORE_INFO', 'KYC_REFRESH_DUE', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_PROCESSED', 'DEAL_UPDATE', 'SYSTEM_ALERT', 'ADMIN_MESSAGE');

-- CreateEnum
CREATE TYPE "CreditLineStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AutoInvestStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "hashedPassword" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INVESTOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockReason" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailedLogin" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "tier" "InvestorTier" NOT NULL DEFAULT 'STANDARD',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "kycLevel" "KycLevel" NOT NULL DEFAULT 'STANDARD',
    "kycApprovedAt" TIMESTAMP(3),
    "kycExpiresAt" TIMESTAMP(3),
    "kycRejectionReason" TEXT,
    "isAccreditedInvestor" BOOLEAN NOT NULL DEFAULT false,
    "investorClassification" TEXT,
    "suitabilityCompleted" BOOLEAN NOT NULL DEFAULT false,
    "suitabilityCompletedAt" TIMESTAMP(3),
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "agreementSignedAt" TIMESTAMP(3),
    "agreementRef" TEXT,
    "bankAccountVerified" BOOLEAN NOT NULL DEFAULT false,
    "maxSingleDealAmount" DECIMAL(15,2) NOT NULL DEFAULT 500000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "department" TEXT,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycCase" (
    "id" TEXT NOT NULL,
    "investorProfileId" TEXT NOT NULL,
    "level" "KycLevel" NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'DOCUMENTS_REQUESTED',
    "providerRef" TEXT,
    "providerResult" JSONB,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "kycCaseId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceOfFundsRecord" (
    "id" TEXT NOT NULL,
    "investorProfileId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "storageKey" TEXT,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceOfFundsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "investorProfileId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "fireblocksVaultId" TEXT,
    "fireblocksAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhitelistedAddress" (
    "id" TEXT NOT NULL,
    "investorProfileId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "label" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhitelistedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "investorProfileId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumberMasked" TEXT NOT NULL,
    "sortCode" TEXT,
    "iban" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "DealType" NOT NULL,
    "borrowerType" TEXT,
    "borrowerPurpose" TEXT,
    "summary" TEXT,
    "internalNotes" TEXT,
    "borrowerLegalName" TEXT,
    "borrowerContact" TEXT,
    "creditBackground" TEXT,
    "underwriterNotes" TEXT,
    "propertyType" TEXT,
    "propertyAddress" TEXT,
    "propertyCity" TEXT,
    "propertyRegion" TEXT,
    "propertyPostcode" TEXT,
    "propertyDescription" TEXT,
    "collateralSummary" TEXT,
    "occupancyStatus" TEXT,
    "loanAmount" DECIMAL(15,2) NOT NULL,
    "propertyValuation" DECIMAL(15,2) NOT NULL,
    "ltv" DECIMAL(5,2) NOT NULL,
    "investorApr" DECIMAL(5,2) NOT NULL,
    "borrowerRate" DECIMAL(5,2),
    "platformMargin" DECIMAL(5,2),
    "minimumInvestment" DECIMAL(15,2) NOT NULL DEFAULT 1000,
    "loanDurationMonths" INTEGER NOT NULL,
    "originationDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "expectedExitDate" TIMESTAMP(3),
    "repaymentType" "RepaymentType" NOT NULL DEFAULT 'MONTHLY_INTEREST_BULLET',
    "exitRoute" TEXT,
    "arrangementFeePercent" DECIMAL(5,2),
    "exitFeePercent" DECIMAL(5,2),
    "penaltyProvisions" TEXT,
    "targetRaise" DECIMAL(15,2) NOT NULL,
    "currentRaised" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "riskGrade" "RiskGrade",
    "chargeType" "ChargeType" NOT NULL DEFAULT 'FIRST_CHARGE',
    "legalStructureNotes" TEXT,
    "instructedSolicitors" TEXT,
    "valuationSource" TEXT,
    "underwritingSummary" TEXT,
    "keyStrengths" TEXT,
    "keyRisks" TEXT,
    "downsideProtection" TEXT,
    "recoveryTimeMonths" INTEGER,
    "stressTestLtv" DECIMAL(5,2),
    "scenarioNote" TEXT,
    "visibleToInvestors" BOOLEAN NOT NULL DEFAULT false,
    "openForInvestment" BOOLEAN NOT NULL DEFAULT false,
    "approvedInvestorsOnly" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "autoInvestEligible" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealDocument" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DealDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealImage" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DealImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealUpdate" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT,
    "investmentId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "description" TEXT,
    "reference" TEXT,
    "txHash" TEXT,
    "providerRef" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "PayoutStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "destinationType" TEXT NOT NULL,
    "destinationRef" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "providerRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(15,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicingLog" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "eventType" "ServicingEventType" NOT NULL,
    "amount" DECIMAL(15,2),
    "eventDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedLimit" DECIMAL(15,2) NOT NULL,
    "utilised" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "CreditLineStatus" NOT NULL DEFAULT 'PENDING',
    "maxPerDeal" DECIMAL(15,2),
    "maxPerMonth" DECIMAL(15,2),
    "minApr" DECIMAL(5,2),
    "maxLtv" DECIMAL(5,2),
    "maxDurationMonths" INTEGER,
    "permittedRiskGrades" TEXT[],
    "permittedLoanTypes" TEXT[],
    "autoDrawEnabled" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoInvestRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AutoInvestStatus" NOT NULL DEFAULT 'PAUSED',
    "minApr" DECIMAL(5,2) NOT NULL,
    "maxLtv" DECIMAL(5,2) NOT NULL,
    "minDurationMonths" INTEGER NOT NULL DEFAULT 1,
    "maxDurationMonths" INTEGER NOT NULL,
    "maxPerDeal" DECIMAL(15,2) NOT NULL,
    "reserveCash" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "permittedRiskGrades" TEXT[],
    "permittedLoanTypes" TEXT[],
    "permittedRegions" TEXT[],
    "maxPerRegionPct" DECIMAL(5,2),
    "maxPerTypePct" DECIMAL(5,2),
    "reinvestRepayments" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoInvestRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoInvestMatch" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "matched" BOOLEAN NOT NULL,
    "skipReason" TEXT,
    "amountDeployed" DECIMAL(15,2),
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoInvestMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_sessionToken_idx" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorProfile_userId_key" ON "InvestorProfile"("userId");

-- CreateIndex
CREATE INDEX "InvestorProfile_userId_idx" ON "InvestorProfile"("userId");

-- CreateIndex
CREATE INDEX "InvestorProfile_kycStatus_idx" ON "InvestorProfile"("kycStatus");

-- CreateIndex
CREATE INDEX "InvestorProfile_tier_idx" ON "InvestorProfile"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

-- CreateIndex
CREATE INDEX "KycCase_investorProfileId_idx" ON "KycCase"("investorProfileId");

-- CreateIndex
CREATE INDEX "KycCase_status_idx" ON "KycCase"("status");

-- CreateIndex
CREATE INDEX "Wallet_investorProfileId_idx" ON "Wallet"("investorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_investorProfileId_currency_key" ON "Wallet"("investorProfileId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_internalId_key" ON "Deal"("internalId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_type_idx" ON "Deal"("type");

-- CreateIndex
CREATE INDEX "Deal_propertyRegion_idx" ON "Deal"("propertyRegion");

-- CreateIndex
CREATE INDEX "Deal_visibleToInvestors_idx" ON "Deal"("visibleToInvestors");

-- CreateIndex
CREATE INDEX "DealDocument_dealId_idx" ON "DealDocument"("dealId");

-- CreateIndex
CREATE INDEX "DealImage_dealId_idx" ON "DealImage"("dealId");

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");

-- CreateIndex
CREATE INDEX "Investment_dealId_idx" ON "Investment"("dealId");

-- CreateIndex
CREATE INDEX "Investment_status_idx" ON "Investment"("status");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Payout_investmentId_idx" ON "Payout"("investmentId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_scheduledDate_idx" ON "Payout"("scheduledDate");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

-- CreateIndex
CREATE INDEX "RepaymentScheduleItem_dealId_idx" ON "RepaymentScheduleItem"("dealId");

-- CreateIndex
CREATE INDEX "RepaymentScheduleItem_scheduledDate_idx" ON "RepaymentScheduleItem"("scheduledDate");

-- CreateIndex
CREATE INDEX "ServicingLog_dealId_idx" ON "ServicingLog"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLine_userId_key" ON "CreditLine"("userId");

-- CreateIndex
CREATE INDEX "CreditLine_userId_idx" ON "CreditLine"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoInvestRule_userId_key" ON "AutoInvestRule"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorProfile" ADD CONSTRAINT "InvestorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycCase" ADD CONSTRAINT "KycCase_investorProfileId_fkey" FOREIGN KEY ("investorProfileId") REFERENCES "InvestorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_kycCaseId_fkey" FOREIGN KEY ("kycCaseId") REFERENCES "KycCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_investorProfileId_fkey" FOREIGN KEY ("investorProfileId") REFERENCES "InvestorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhitelistedAddress" ADD CONSTRAINT "WhitelistedAddress_investorProfileId_fkey" FOREIGN KEY ("investorProfileId") REFERENCES "InvestorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_investorProfileId_fkey" FOREIGN KEY ("investorProfileId") REFERENCES "InvestorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocument" ADD CONSTRAINT "DealDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealImage" ADD CONSTRAINT "DealImage_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealUpdate" ADD CONSTRAINT "DealUpdate_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentScheduleItem" ADD CONSTRAINT "RepaymentScheduleItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicingLog" ADD CONSTRAINT "ServicingLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicingLog" ADD CONSTRAINT "ServicingLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLine" ADD CONSTRAINT "CreditLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoInvestRule" ADD CONSTRAINT "AutoInvestRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoInvestMatch" ADD CONSTRAINT "AutoInvestMatch_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoInvestRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
