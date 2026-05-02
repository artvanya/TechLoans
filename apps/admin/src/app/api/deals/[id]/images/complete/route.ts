// Registers a DealImage after a successful browser → R2/S3 PUT (direct upload).
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { dealImageStorageIsLocal, getSignedDownloadUrl, headObjectMeta } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 20 * 1024 * 1024

function expectedKeyPrefix(dealId: string) {
  return `deals/${dealId}/images/`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })
  }

  const dealId = (await params).id
  const deal = await prisma.deal.findFirst({ where: { id: dealId }, select: { id: true } })
  if (!deal) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } }, { status: 404 })
  }

  if (dealImageStorageIsLocal()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'USE_MULTIPART',
          message: 'Local storage: use POST /api/deals/:id/images with multipart FormData.',
        },
      },
      { status: 400 }
    )
  }

  let body: {
    storageKey?: string
    fileName?: string
    mimeType?: string
    sizeBytes?: number
    isPrimary?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_JSON', message: 'Invalid JSON' } }, { status: 400 })
  }

  const storageKey = typeof body.storageKey === 'string' ? body.storageKey.trim() : ''
  const fileName = typeof body.fileName === 'string' ? body.fileName : ''
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
  const sizeBytes = typeof body.sizeBytes === 'number' ? body.sizeBytes : -1
  const makePrimary = body.isPrimary === true

  const prefix = expectedKeyPrefix(dealId)
  if (!storageKey.startsWith(prefix)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_KEY', message: 'Invalid storage key' } }, { status: 400 })
  }

  if (!fileName || !IMAGE_MIME_TYPES.includes(mimeType) || sizeBytes < 1 || sizeBytes > MAX_IMAGE_SIZE) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Invalid file metadata' } }, { status: 400 })
  }

  if (!dealImageStorageIsLocal()) {
    const meta = await headObjectMeta(storageKey)
    if (!meta || meta.contentLength < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OBJECT_MISSING',
            message: 'File not found in storage. Complete the PUT to the presigned URL first, or check R2 CORS for your admin origin.',
          },
        },
        { status: 400 }
      )
    }
    if (meta.contentLength !== sizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SIZE_MISMATCH',
            message: `Stored size ${meta.contentLength} does not match declared ${sizeBytes}`,
          },
        },
        { status: 400 }
      )
    }
  }

  const maxOrder = await prisma.dealImage.findFirst({
    where: { dealId, deletedAt: null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  if (makePrimary) {
    await prisma.dealImage.updateMany({
      where: { dealId, isPrimary: true },
      data: { isPrimary: false },
    })
  }

  const existingCount = await prisma.dealImage.count({ where: { dealId, deletedAt: null } })
  const isPrimary = makePrimary || existingCount === 0

  const image = await prisma.dealImage.create({
    data: {
      dealId,
      storageKey,
      fileName,
      mimeType,
      sizeBytes,
      isPrimary,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      uploadedById: (session.user as any).id,
    },
  })

  const url = await getSignedDownloadUrl(storageKey)

  await writeAuditLog({
    actorId: (session.user as any).id,
    actorEmail: session.user.email!,
    action: 'CREATE',
    entityType: 'DealImage',
    entityId: image.id,
    afterState: { dealId, storageKey },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({
    success: true,
    data: { id: image.id, url, isPrimary, sortOrder: image.sortOrder },
  })
}
