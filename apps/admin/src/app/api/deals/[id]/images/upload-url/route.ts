// Presigned PUT for browser → R2/S3 direct upload (bypasses Vercel ~4.5MB request body limit).
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import {
  dealImageStorageIsLocal,
  generateStorageKey,
  getPresignedPutImageUrl,
} from '@/lib/storage'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 20 * 1024 * 1024

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

  let body: { fileName?: string; mimeType?: string; fileSize?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_JSON', message: 'Invalid JSON' } }, { status: 400 })
  }

  const fileName = typeof body.fileName === 'string' ? body.fileName : ''
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
  const fileSize = typeof body.fileSize === 'number' ? body.fileSize : -1

  if (!fileName || !mimeType || fileSize < 1) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION', message: 'fileName, mimeType, and fileSize are required' } },
      { status: 400 }
    )
  }

  if (!IMAGE_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG and WebP images are accepted' } },
      { status: 400 }
    )
  }

  if (fileSize > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: `Image must be under ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` } },
      { status: 400 }
    )
  }

  if (dealImageStorageIsLocal()) {
    return NextResponse.json({ success: true, data: { mode: 'local' as const } })
  }

  const storageKey = generateStorageKey(`deals/${dealId}/images`, dealId, fileName)

  try {
    const uploadUrl = await getPresignedPutImageUrl(storageKey, mimeType, 900)
    return NextResponse.json({
      success: true,
      data: {
        mode: 'direct' as const,
        uploadUrl,
        storageKey,
        mimeType,
      },
    })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('[images/upload-url]', err)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PRESIGN_ERROR',
          message: 'Could not create upload URL',
          details: raw.length > 400 ? `${raw.slice(0, 400)}…` : raw,
        },
      },
      { status: 500 }
    )
  }
}
