// apps/admin/src/lib/storage-impl.ts
// Abstraction layer for file storage
// Supports AWS S3, Cloudflare R2, and local filesystem (development)

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs/promises'

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')
const LOCAL_BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3001'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 100MB

export class StorageError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
  }
}

/** Vercel values sometimes include trailing newlines; compare case-insensitively for R2. */
function storageProvider(): string {
  return (process.env.STORAGE_PROVIDER ?? 's3').trim().toLowerCase()
}

function resolveBucketName(): string {
  const p = storageProvider()
  if (p === 'r2') {
    return (process.env.R2_BUCKET || process.env.AWS_S3_BUCKET || '').trim()
  }
  return (process.env.AWS_S3_BUCKET || process.env.R2_BUCKET || '').trim()
}

function getS3Client() {
  const provider = storageProvider()

  if (provider === 'r2') {
    const accountId = (process.env.R2_ACCOUNT_ID ?? '').trim()
    const accessKeyId = (process.env.R2_ACCESS_KEY_ID ?? '').trim()
    const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY ?? '').trim()
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new StorageError(
        'STORAGE_PROVIDER is r2 but R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY is missing or empty.',
        'R2_CONFIG'
      )
    }
    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    })
  }

  return new S3Client({
    region: process.env.AWS_REGION ?? 'eu-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

export function generateStorageKey(
  category: string,
  entityId: string,
  fileName: string
): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'bin'
  const uuid = randomUUID()
  return `${category}/${entityId}/${uuid}.${ext}`
}

export function validateFileUpload(
  mimeType: string,
  sizeBytes: number,
  allowedTypes?: string[]
): void {
  const allowed = allowedTypes ?? ALLOWED_MIME_TYPES
  if (!allowed.includes(mimeType)) {
    throw new StorageError(
      `File type ${mimeType} is not permitted`,
      'INVALID_FILE_TYPE'
    )
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new StorageError(
      `File size ${sizeBytes} exceeds maximum of ${MAX_FILE_SIZE_BYTES}`,
      'FILE_TOO_LARGE'
    )
  }
}

export async function uploadFile(
  storageKey: string,
  fileBuffer: Buffer,
  mimeType: string,
  _isPrivate: boolean = true
): Promise<string> {
  if (storageProvider() === 'local') {
    const dest = path.join(LOCAL_UPLOADS_DIR, storageKey)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(dest, fileBuffer)
    return storageKey
  }

  const client = getS3Client()
  const bucket = resolveBucketName()
  if (!bucket) {
    throw new StorageError(
      storageProvider() === 'r2'
        ? 'R2_BUCKET (or AWS_S3_BUCKET) is not set — uploads have no target bucket.'
        : 'AWS_S3_BUCKET (or R2_BUCKET) is not set.',
      'MISSING_BUCKET'
    )
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  )

  return storageKey
}

export async function getSignedDownloadUrl(
  storageKey: string,
  expirySeconds?: number
): Promise<string> {
  const key = (storageKey ?? '').trim()
  if (/^https?:\/\//i.test(key)) return key
  if (key.startsWith('/')) return key
  if (storageProvider() === 'local') {
    return `${LOCAL_BASE_URL}/uploads/${key}`
  }

  const client = getS3Client()
  const bucket = resolveBucketName()
  if (!bucket) {
    throw new StorageError('Storage bucket env var is not set.', 'MISSING_BUCKET')
  }
  const expiry = expirySeconds ?? parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? '3600')

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn: expiry })
}

/** True when uploads are written to admin `public/uploads` (no direct browser → R2 PUT). */
export function dealImageStorageIsLocal(): boolean {
  return storageProvider() === 'local'
}

export async function getPresignedPutImageUrl(
  storageKey: string,
  mimeType: string,
  expiresSeconds = 900
): Promise<string> {
  if (storageProvider() === 'local') {
    throw new StorageError('Presigned PUT is not used for local storage', 'LOCAL_STORAGE')
  }
  const client = getS3Client()
  const bucket = resolveBucketName()
  if (!bucket) {
    throw new StorageError('Storage bucket env var is not set.', 'MISSING_BUCKET')
  }
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: mimeType,
  })
  return getSignedUrl(client, command, { expiresIn: expiresSeconds })
}

/** Returns null if object does not exist (or local file missing). */
export async function headObjectMeta(
  storageKey: string
): Promise<{ contentLength: number; contentType?: string } | null> {
  if (storageProvider() === 'local') {
    const dest = path.join(LOCAL_UPLOADS_DIR, storageKey)
    try {
      const st = await fs.stat(dest)
      return { contentLength: st.size }
    } catch {
      return null
    }
  }
  const client = getS3Client()
  const bucket = resolveBucketName()
  if (!bucket) return null
  try {
    const out = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }))
    return { contentLength: out.ContentLength ?? 0, contentType: out.ContentType }
  } catch {
    return null
  }
}

export async function deleteFile(storageKey: string): Promise<void> {
  if (storageProvider() === 'local') {
    try {
      await fs.unlink(path.join(LOCAL_UPLOADS_DIR, storageKey))
    } catch {}
    return
  }

  const client = getS3Client()
  const bucket = resolveBucketName()
  if (!bucket) return

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    })
  )
}

// Generate a presigned URL for client-side direct upload
export async function getPresignedUploadUrl(
  storageKey: string,
  mimeType: string,
  expirySeconds: number = 300
): Promise<string> {
  const { createPresignedPost } = await import('@aws-sdk/s3-presigned-post')
  const client = getS3Client()
  const bucket = resolveBucketName()
  if (!bucket) {
    throw new StorageError('Storage bucket env var is not set.', 'MISSING_BUCKET')
  }

  const { url, fields } = await createPresignedPost(client, {
    Bucket: bucket,
    Key: storageKey,
    Conditions: [
      ['content-length-range', 1, MAX_FILE_SIZE_BYTES],
      ['eq', '$Content-Type', mimeType],
    ],
    Fields: { 'Content-Type': mimeType },
    Expires: expirySeconds,
  })

  // Return as JSON string for client to parse
  return JSON.stringify({ url, fields })
}
