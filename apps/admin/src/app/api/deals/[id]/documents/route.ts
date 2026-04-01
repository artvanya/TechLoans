// apps/admin/src/app/api/deals/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { uploadFile, validateFileUpload, generateStorageKey, deleteFile } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const deal = await prisma.deal.findUnique({ where: { id: params.id } })
  if (!deal) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const category = formData.get('category') as string | null
  const isInternal = formData.get('isInternal') === 'true'

  if (!file || !category) {
    return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'file and category are required' } }, { status: 400 })
  }

  const validCategories = ['VALUATION_REPORT', 'LEGAL_PACK', 'BORROWER_SUMMARY', 'COLLATERAL_DOCS', 'TERM_SHEET', 'INTERNAL_MEMO', 'OTHER']
  if (!validCategories.includes(category)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Invalid document category' } }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    validateFileUpload(file.type, buffer.length)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: 400 })
  }

  const storageKey = generateStorageKey(`deals/${params.id}/documents`, params.id, file.name)

  try {
    await uploadFile(storageKey, buffer, file.type, true)
  } catch (err) {
    console.error('[Upload] Storage error:', err)
    return NextResponse.json({ success: false, error: { code: 'STORAGE_ERROR', message: 'File upload failed' } }, { status: 500 })
  }

  const doc = await prisma.dealDocument.create({
    data: {
      dealId: params.id,
      category: category as any,
      fileName: file.name,
      storageKey,
      mimeType: file.type,
      sizeBytes: buffer.length,
      isInternal,
      uploadedById: (session.user as any).id,
    },
  })

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'UPLOAD',
    entityType: 'DealDocument',
    entityId: doc.id,
    metadata: { dealId: params.id, category, fileName: file.name, isInternal },
  })

  return NextResponse.json({ success: true, data: { id: doc.id, category: doc.category, fileName: doc.fileName, uploadedAt: doc.uploadedAt } })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const { searchParams } = req.nextUrl
  const docId = searchParams.get('docId')
  if (!docId) return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'docId required' } }, { status: 400 })

  const doc = await prisma.dealDocument.findFirst({ where: { id: docId, dealId: params.id } })
  if (!doc) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 })

  // Soft delete in DB, then remove from storage
  await prisma.dealDocument.update({ where: { id: docId }, data: { deletedAt: new Date() } })
  
  try {
    await deleteFile(doc.storageKey)
  } catch (err) {
    console.error('[Storage] Failed to delete file from storage:', err)
    // DB record soft-deleted — storage cleanup can be retried
  }

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'DELETE',
    entityType: 'DealDocument',
    entityId: docId,
    metadata: { dealId: params.id, fileName: doc.fileName },
  })

  return NextResponse.json({ success: true, data: { deleted: true } })
}
