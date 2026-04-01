// apps/investor/src/app/api/wallet/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      wallets: true,
      whitelistedAddresses: true,
      bankAccounts: true,
    },
  })

  if (!profile) return NextResponse.json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Investor profile not found' } }, { status: 404 })

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })

  return NextResponse.json({
    success: true,
    data: {
      wallets: profile.wallets.map((w) => ({
        id: w.id,
        currency: w.currency,
        balance: Number(w.balance),
        address: w.fireblocksAddress,
      })),
      whitelistedAddresses: profile.whitelistedAddresses.map((a) => ({
        id: a.id,
        address: a.address,
        network: a.network,
        label: a.label,
        verifiedAt: a.verifiedAt?.toISOString() ?? null,
      })),
      bankAccounts: profile.bankAccounts.map((b) => ({
        id: b.id,
        bankName: b.bankName,
        accountNumberMasked: b.accountNumberMasked,
        verifiedAt: b.verifiedAt?.toISOString() ?? null,
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        description: t.description,
        txHash: t.txHash,
        createdAt: t.createdAt.toISOString(),
      })),
    },
  })
}

const withdrawalSchema = z.object({
  amount: z.number().positive().min(100),
  currency: z.string().default('GBP'),
  destinationType: z.enum(['bank', 'crypto']),
  destinationRef: z.string(), // bankAccountId or whitelistedAddressId
  notes: z.string().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()
  if (body.action !== 'withdraw') {
    return NextResponse.json({ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Unknown action' } }, { status: 400 })
  }

  const parsed = withdrawalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid withdrawal request', fields: parsed.error.flatten().fieldErrors },
    }, { status: 422 })
  }

  const { amount, currency, destinationType, destinationRef } = parsed.data

  // Verify destination is whitelisted/verified
  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      wallets: { where: { currency } },
      whitelistedAddresses: { where: { id: destinationRef } },
      bankAccounts: { where: { id: destinationRef } },
    },
  })

  if (!profile) return NextResponse.json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } }, { status: 404 })

  // Verify destination exists and is verified
  const cryptoDest = profile.whitelistedAddresses.find((a) => a.id === destinationRef)
  const bankDest = profile.bankAccounts.find((b) => b.id === destinationRef)

  if (destinationType === 'crypto' && (!cryptoDest || !cryptoDest.verifiedAt)) {
    return NextResponse.json({ success: false, error: { code: 'DESTINATION_NOT_VERIFIED', message: 'Destination address is not whitelisted or verified' } }, { status: 400 })
  }
  if (destinationType === 'bank' && (!bankDest || !bankDest.verifiedAt)) {
    return NextResponse.json({ success: false, error: { code: 'DESTINATION_NOT_VERIFIED', message: 'Bank account is not linked or verified' } }, { status: 400 })
  }

  // Check balance
  const wallet = profile.wallets[0]
  if (!wallet || Number(wallet.balance) < amount) {
    return NextResponse.json({ success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient wallet balance' } }, { status: 400 })
  }

  // Create withdrawal request (pending admin approval)
  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId: session.user.id,
      amount,
      currency,
      destinationType,
      destinationRef,
      status: 'PENDING',
    },
  })

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPDATE',
    entityType: 'Withdrawal',
    entityId: withdrawal.id,
    afterState: { amount, currency, destinationType, status: 'PENDING' },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { withdrawalId: withdrawal.id, status: 'PENDING', message: 'Withdrawal request submitted. Processing within 1-2 business days.' } })
}
