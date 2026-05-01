// apps/investor/src/app/api/deals/[id]/documents/[docId]/route.ts
// Generates a time-limited signed URL for document access
// Only allows access to investors who have invested in the deal

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { getSignedDownloadUrl } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
): Promise<NextResponse> {
  const { id, docId } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const doc = await prisma.dealDocument.findFirst({
    where: {
      id: docId,
      dealId: id,
      deletedAt: null,
      isInternal: false,
    },
  })

  if (!doc) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 })
  }

  // Check investor has a confirmed investment in this deal
  const investment = await prisma.investment.findFirst({
    where: {
      userId: session.user.id,
      dealId: id,
      status: { in: ['CONFIRMED', 'ACTIVE'] },
    },
  })

  if (!investment) {
    return NextResponse.json(
      { success: false, error: { code: 'ACCESS_DENIED', message: 'Documents are available to investors in this deal only' } },
      { status: 403 }
    )
  }

  try {
    const signedUrl = await getSignedDownloadUrl(doc.storageKey, 300) // 5-minute URL

    await writeAuditLog({
      actorId: session.user.id,
      actorEmail: session.user.email!,
      action: 'DOWNLOAD',
      entityType: 'DealDocument',
      entityId: doc.id,
      metadata: { dealId: id, fileName: doc.fileName, category: doc.category },
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json({ success: true, data: { url: signedUrl, expiresIn: 300 } })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'STORAGE_ERROR', message: 'Document temporarily unavailable' } },
      { status: 503 }
    )
  }
}
