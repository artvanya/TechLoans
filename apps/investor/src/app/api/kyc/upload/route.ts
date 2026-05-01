// apps/investor/src/app/api/kyc/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { uploadFile, validateFileUpload, generateStorageKey } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'

const ALLOWED_KYC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const category = formData.get('category') as string | null
  const kycCaseId = formData.get('kycCaseId') as string | null

  if (!file || !category) {
    return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'file and category are required' } }, { status: 400 })
  }

  const validCategories = ['KYC_IDENTITY', 'KYC_ADDRESS', 'SOURCE_OF_FUNDS', 'OTHER']
  if (!validCategories.includes(category)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Invalid document category' } }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    validateFileUpload(file.type, buffer.length, ALLOWED_KYC_TYPES)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: 400 })
  }

  // Get or create KYC case
  const profile = await prisma.investorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return NextResponse.json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } }, { status: 404 })

  let caseRecord
  if (kycCaseId) {
    caseRecord = await prisma.kycCase.findFirst({ where: { id: kycCaseId, investorProfileId: profile.id } })
    if (!caseRecord) return NextResponse.json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'KYC case not found' } }, { status: 404 })
  } else {
    // Create new case if none exists or get active one
    caseRecord = await prisma.kycCase.findFirst({
      where: {
        investorProfileId: profile.id,
        status: { in: ['DOCUMENTS_REQUESTED', 'ADDITIONAL_INFO_REQUIRED', 'UNDER_REVIEW', 'DOCUMENTS_SUBMITTED'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!caseRecord) {
      caseRecord = await prisma.kycCase.create({
        data: {
          investorProfileId: profile.id,
          level: profile.kycLevel,
          status: 'DOCUMENTS_SUBMITTED',
        },
      })
    }
  }

  const storageKey = generateStorageKey(`kyc/${profile.id}`, profile.id, file.name)

  try {
    await uploadFile(storageKey, buffer, file.type, true)
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: 'STORAGE_ERROR', message: 'File upload failed' } }, { status: 500 })
  }

  const doc = await prisma.kycDocument.create({
    data: {
      kycCaseId: caseRecord.id,
      category: category as any,
      fileName: file.name,
      storageKey,
      mimeType: file.type,
      sizeBytes: buffer.length,
    },
  })

  // Advance KYC case status to DOCUMENTS_SUBMITTED
  await prisma.kycCase.update({
    where: { id: caseRecord.id },
    data: { status: 'DOCUMENTS_SUBMITTED' },
  })
  await prisma.investorProfile.update({
    where: { id: profile.id },
    data: { kycStatus: 'DOCUMENTS_SUBMITTED' },
  })

  await writeAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: 'UPLOAD',
    entityType: 'KycDocument',
    entityId: doc.id,
    metadata: { category, kycCaseId: caseRecord.id },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { id: doc.id, fileName: doc.fileName, category: doc.category } })
}
