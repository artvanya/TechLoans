// apps/investor/src/lib/storage.ts
// Abstraction layer for file storage
// Supports AWS S3, Cloudflare R2, and local filesystem (development)

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const LOCAL_ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001'

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
  _expirySeconds?: number
): Promise<string> {
  const key = (storageKey ?? '').trim()
  if (/^https?:\/\//i.test(key)) return key
  if (key.startsWith('/')) return key
  if (storageProvider() === 'local') {
    return `${LOCAL_ADMIN_URL}/uploads/${key}`
  }

  const client = getS3Client()
  const bucket = resolveBucketName()
  if (!bucket) {
    throw new StorageError('Storage bucket env var is not set.', 'MISSING_BUCKET')
  }
  const expiry = _expirySeconds ?? parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? '3600')

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn: expiry })
}

/**
 * Resolves a browser-safe URL for deal images (R2/S3 presigned, local admin /uploads, or optional public read base).
 * Prefer this over raw getSignedDownloadUrl for investor UI so missing R2 env on Vercel can still use a public CDN base.
 */
export async function getDealImageDisplayUrl(
  storageKey: string,
  expirySeconds = 3600
): Promise<string | null> {
  const key = (storageKey ?? '').trim()
  if (!key) return null
  if (/^https?:\/\//i.test(key)) return key
  if (key.startsWith('/')) return key

  const readBase = process.env.NEXT_PUBLIC_STORAGE_READ_BASE_URL?.replace(/\/$/, '')
  if (readBase) {
    return `${readBase}/${key.replace(/^\//, '')}`
  }

  if (storageProvider() === 'local') {
    return `${LOCAL_ADMIN_URL}/uploads/${key}`
  }

  try {
    return await getSignedDownloadUrl(key, expirySeconds)
  } catch (err) {
    console.error('[getDealImageDisplayUrl] presign failed — check R2/AWS env on investor app matches admin:', err)
    return null
  }
}

export async function deleteFile(storageKey: string): Promise<void> {
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
