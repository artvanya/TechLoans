// apps/admin/src/app/api/deals/[id]/images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { uploadFile, validateFileUpload, generateStorageKey, deleteFile, getSignedDownloadUrl } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const makePrimary = formData.get('isPrimary') === 'true'

  if (!file) return NextResponse.json({ success: false, error: { code: 'MISSING_FILE', message: 'No file provided' } }, { status: 400 })

  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG and WebP images are accepted' } }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  if (buffer.length > MAX_IMAGE_SIZE) {
    return NextResponse.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Image must be under 20MB' } }, { status: 400 })
  }

  const storageKey = generateStorageKey(`deals/${(await params).id}/images`, (await params).id, file.name)

  try {
    await uploadFile(storageKey, buffer, file.type, true)
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    const details = raw.length > 400 ? `${raw.slice(0, 400)}…` : raw
    console.error('[images/upload] Storage error:', err)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Image upload failed — check Admin Vercel logs and R2 token permissions.',
          details,
        },
      },
      { status: 500 }
    )
  }

  // Get current max sort order
  const maxOrder = await prisma.dealImage.findFirst({
    where: { dealId: (await params).id, deletedAt: null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  // If making primary, unset existing primary
  if (makePrimary) {
    await prisma.dealImage.updateMany({
      where: { dealId: (await params).id, isPrimary: true },
      data: { isPrimary: false },
    })
  }

  // Check if this is the first image — make it primary automatically
  const existingCount = await prisma.dealImage.count({ where: { dealId: (await params).id, deletedAt: null } })
  const isPrimary = makePrimary || existingCount === 0

  const image = await prisma.dealImage.create({
    data: {
      dealId: (await params).id,
      storageKey,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: buffer.length,
      isPrimary,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      uploadedById: (session.user as any).id,
    },
  })

  let signedUrl: string
  try {
    signedUrl = await getSignedDownloadUrl(storageKey)
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('[images/upload] presign failed after PutObject:', err)
    try {
      await prisma.dealImage.delete({ where: { id: image.id } })
    } catch {}
    try {
      await deleteFile(storageKey)
    } catch {}
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SIGN_ERROR',
          message: 'Image was stored but creating a read URL failed (check R2 env on admin).',
          details: raw.length > 400 ? `${raw.slice(0, 400)}…` : raw,
        },
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { id: image.id, url: signedUrl, isPrimary, sortOrder: image.sortOrder },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const images = await prisma.dealImage.findMany({
    where: { dealId: (await params).id, deletedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
  })

  const withUrls = await Promise.all(
    images.map(async (img) => ({
      id: img.id,
      fileName: img.fileName,
      isPrimary: img.isPrimary,
      sortOrder: img.sortOrder,
      url: await getSignedDownloadUrl(img.storageKey).catch(() => ''),
    }))
  )

  return NextResponse.json({ success: true, data: withUrls })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 })

  const body = await req.json()
  const { action, imageId, order } = body

  if (action === 'set_primary') {
    await prisma.dealImage.updateMany({ where: { dealId: (await params).id }, data: { isPrimary: false } })
    await prisma.dealImage.update({ where: { id: imageId }, data: { isPrimary: true } })
    return NextResponse.json({ success: true, data: { updated: true } })
  }

  if (action === 'reorder' && Array.isArray(order)) {
    // order = [{id, sortOrder}]
    await prisma.$transaction(
      order.map((item: { id: string; sortOrder: number }) =>
        prisma.dealImage.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
      )
    )
    return NextResponse.json({ success: true, data: { updated: true } })
  }

  if (action === 'delete') {
    const img = await prisma.dealImage.findFirst({ where: { id: imageId, dealId: (await params).id } })
    if (!img) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } }, { status: 404 })
    await prisma.dealImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } })
    try { await deleteFile(img.storageKey) } catch {}
    await writeAuditLog({ actorId: (session.user as any).id, actorEmail: session.user.email!, action: 'DELETE', entityType: 'DealImage', entityId: imageId })
    return NextResponse.json({ success: true, data: { deleted: true } })
  }

  return NextResponse.json({ success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action' } }, { status: 400 })
}
