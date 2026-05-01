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

function getS3Client() {
  const provider = process.env.STORAGE_PROVIDER ?? 's3'

  if (provider === 'r2') {
    return new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
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
  const bucket = process.env.AWS_S3_BUCKET ?? process.env.R2_BUCKET!

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
  if ((process.env.STORAGE_PROVIDER ?? 's3') === 'local') {
    return `${LOCAL_ADMIN_URL}/uploads/${storageKey}`
  }

  const client = getS3Client()
  const bucket = process.env.AWS_S3_BUCKET ?? process.env.R2_BUCKET!
  const expiry = _expirySeconds ?? parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? '3600')

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  })

  return getSignedUrl(client, command, { expiresIn: expiry })
}

export async function deleteFile(storageKey: string): Promise<void> {
  const client = getS3Client()
  const bucket = process.env.AWS_S3_BUCKET ?? process.env.R2_BUCKET!

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
  const bucket = process.env.AWS_S3_BUCKET ?? process.env.R2_BUCKET!

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
