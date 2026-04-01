// apps/admin/src/app/api/deals/[id]/documents/[docId]/admin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { getSignedDownloadUrl } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const doc = await prisma.dealDocument.findFirst({
    where: { id: params.docId, dealId: params.id, deletedAt: null },
  })

  if (!doc) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 })
  }

  const signedUrl = await getSignedDownloadUrl(doc.storageKey, 600) // 10-minute URL for admin

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'DOWNLOAD',
    entityType: 'DealDocument',
    entityId: doc.id,
    metadata: { dealId: params.id, fileName: doc.fileName, isInternal: doc.isInternal },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ success: true, data: { url: signedUrl, expiresIn: 600 } })
}
