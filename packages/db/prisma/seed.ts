// packages/db/prisma/seed.ts
// Development seed ONLY — never runs in production
// Creates minimal users + one live deal for testing

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed must not run in production. Use migrations and real data only.')
  }

  console.log('🌱 Seeding development database...')

  // ── Super admin ──────────────────────────────
  const adminPassword = await bcrypt.hash('Admin1234!@', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nexus.local' },
    update: {},
    create: {
      email: 'admin@nexus.local',
      hashedPassword: adminPassword,
      emailVerified: new Date(),
      role: 'SUPER_ADMIN',
    },
  })

  await prisma.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      firstName: 'Platform',
      lastName: 'Admin',
      department: 'Operations',
      permissions: ['deal:create', 'deal:publish', 'investor:read', 'investor:restrict', 'kyc:review', 'payout:approve', 'withdrawal:approve', 'audit:read', 'settings:write'],
    },
  })

  // ── Test investor ────────────────────────────
  const investorPassword = await bcrypt.hash('Investor1234!@', 12)
  const investorUser = await prisma.user.upsert({
    where: { email: 'investor@nexus.local' },
    update: {},
    create: {
      email: 'investor@nexus.local',
      hashedPassword: investorPassword,
      emailVerified: new Date(),
      role: 'INVESTOR',
    },
  })

  const investorProfile = await prisma.investorProfile.upsert({
    where: { userId: investorUser.id },
    update: {},
    create: {
      userId: investorUser.id,
      firstName: 'Test',
      lastName: 'Investor',
      tier: 'PLATINUM',
      kycStatus: 'APPROVED',
      kycLevel: 'PLATINUM',
      kycApprovedAt: new Date(),
      isAccreditedInvestor: true,
      investorClassification: 'HNWI',
      suitabilityCompleted: true,
      suitabilityCompletedAt: new Date(),
      agreementSigned: true,
      agreementSignedAt: new Date(),
      bankAccountVerified: true,
      maxSingleDealAmount: 500000,
    },
  })

  // Create wallets
  await prisma.wallet.upsert({
    where: { investorProfileId_currency: { investorProfileId: investorProfile.id, currency: 'GBP' } },
    update: {},
    create: { investorProfileId: investorProfile.id, currency: 'GBP', balance: 50000 },
  })
  await prisma.wallet.upsert({
    where: { investorProfileId_currency: { investorProfileId: investorProfile.id, currency: 'USDC' } },
    update: {},
    create: { investorProfileId: investorProfile.id, currency: 'USDC', balance: 18240 },
  })

  // ── Compliance officer ───────────────────────
  const coPassword = await bcrypt.hash('Compliance1234!@', 12)
  const coUser = await prisma.user.upsert({
    where: { email: 'compliance@nexus.local' },
    update: {},
    create: {
      email: 'compliance@nexus.local',
      hashedPassword: coPassword,
      emailVerified: new Date(),
      role: 'COMPLIANCE_OFFICER',
    },
  })

  await prisma.adminProfile.upsert({
    where: { userId: coUser.id },
    update: {},
    create: {
      userId: coUser.id,
      firstName: 'Compliance',
      lastName: 'Officer',
      department: 'Compliance',
      permissions: ['kyc:review', 'investor:read', 'audit:read'],
    },
  })

  // ── One live deal (no hardcoded financials — realistic test data) ──
  const existingDeal = await prisma.deal.findFirst({ where: { internalId: 'NXSD-DEV-001' } })
  if (!existingDeal) {
    await prisma.deal.create({
      data: {
        internalId: 'NXSD-DEV-001',
        name: 'Test Bridge Loan — Development',
        status: 'LIVE',
        type: 'BRIDGE_FINANCE',
        borrowerType: 'Property company (SPV)',
        borrowerPurpose: 'Acquisition bridge while arranging long-term refinance',
        summary: 'A senior secured first-charge bridge loan against a prime residential property in Central London. Conservative LTV with a confirmed refinance exit strategy.',
        propertyType: 'Residential — House',
        propertyAddress: '1 Test Street',
        propertyCity: 'London',
        propertyRegion: 'London',
        propertyPostcode: 'W1A 1AA',
        propertyDescription: 'Development seed deal for testing. Not a real transaction.',
        loanAmount: 500000,
        propertyValuation: 850000,
        ltv: 58.8,
        investorApr: 9.5,
        borrowerRate: 12.0,
        minimumInvestment: 1000,
        loanDurationMonths: 12,
        maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        repaymentType: 'MONTHLY_INTEREST_BULLET',
        exitRoute: 'Refinance to term lender',
        targetRaise: 500000,
        currentRaised: 120000,
        riskGrade: 'A',
        chargeType: 'FIRST_CHARGE',
        valuationSource: 'Test Valuers · RICS',
        underwritingSummary: 'Development seed deal. Conservative LTV, first charge, experienced test borrower.',
        keyStrengths: '• Low LTV of 58.8%\n• First charge security\n• Confirmed refinance mandate',
        keyRisks: '• Refinance delay risk\n• Development seed data only',
        downsideProtection: 'First charge security over residential property. LTV provides material equity buffer.',
        recoveryTimeMonths: 5,
        scenarioNote: 'Property must fall 41% below current valuation before principal is at risk.',
        visibleToInvestors: true,
        openForInvestment: true,
        autoInvestEligible: true,
        publishedAt: new Date(),
        createdById: adminUser.id,
      },
    })
  }

  console.log('✅ Seed complete.')
  console.log('   Admin:     admin@nexus.local     / Admin1234!@')
  console.log('   Investor:  investor@nexus.local  / Investor1234!@')
  console.log('   Compliance: compliance@nexus.local / Compliance1234!@')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
