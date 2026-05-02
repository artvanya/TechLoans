/**
 * Push files from local admin disk (apps/admin/public/uploads) into S3/R2
 * using the same keys as in Postgres (DealImage + DealDocument).
 *
 * Env load order (later overwrites earlier): .env → .env.example → default env file (.env.local or --env-file).
 * Do NOT paste secrets into AI chat — use .env.local only on your machine.
 *
 * Usage:
 *   cd apps/investor && pnpm exec tsx scripts/push-local-uploads-to-remote-storage.ts
 *   cd apps/investor && pnpm exec tsx scripts/push-local-uploads-to-remote-storage.ts --dry-run
 *   cd apps/investor && pnpm exec tsx scripts/push-local-uploads-to-remote-storage.ts --env-file ../../.env.production.local
 */

import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '@nexus/db'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFile(filePath: string, overwrite = false) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  if (!existsSync(abs)) {
    console.warn(`[env] file not found (skip): ${abs}`)
    return
  }
  const text = readFileSync(abs, 'utf8')
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (overwrite || process.env[key] === undefined) process.env[key] = val
  }
}

function looksLikePlaceholder(key: string | undefined): boolean {
  if (!key || !key.trim()) return true
  const k = key.trim().toLowerCase()
  return (
    k === 'placeholder' ||
    k.startsWith('replace') ||
    k.startsWith('ak_replace') ||
    k.startsWith('re_replace')
  )
}

/** This script always targets remote object storage; pick R2 or S3 from env. */
function resolveRemoteStorageProvider(): 'r2' | 's3' {
  const r2Ready =
    !!process.env.R2_ACCOUNT_ID &&
    !looksLikePlaceholder(process.env.R2_ACCESS_KEY_ID) &&
    !looksLikePlaceholder(process.env.R2_SECRET_ACCESS_KEY) &&
    !!process.env.R2_BUCKET
  const s3Ready =
    !looksLikePlaceholder(process.env.AWS_ACCESS_KEY_ID) &&
    !looksLikePlaceholder(process.env.AWS_SECRET_ACCESS_KEY) &&
    !!process.env.AWS_S3_BUCKET

  if (r2Ready) {
    process.env.STORAGE_PROVIDER = 'r2'
    console.log('[storage:push-local] Target: R2')
    return 'r2'
  }
  if (s3Ready) {
    process.env.STORAGE_PROVIDER = 's3'
    console.log('[storage:push-local] Target: S3')
    return 's3'
  }
  throw new Error(
    'Add real R2 credentials to .env.local (or pass --env-file): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET=nexus-investor-files. ' +
      'Remove or fix placeholder AWS_* keys if you are not using S3.'
  )
}

function getS3Client() {
  const provider = process.env.STORAGE_PROVIDER ?? 's3'
  if (provider === 'local') {
    throw new Error(
      'STORAGE_PROVIDER=local cannot push to remote. Set STORAGE_PROVIDER=s3 or r2 and bucket credentials for this run.'
    )
  }
  if (provider === 'r2') {
    const accountId = process.env.R2_ACCOUNT_ID
    if (!accountId) throw new Error('R2_ACCOUNT_ID is required for STORAGE_PROVIDER=r2')
    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
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

function bucketName(): string {
  const b = process.env.AWS_S3_BUCKET ?? process.env.R2_BUCKET
  if (!b) throw new Error('Set AWS_S3_BUCKET (S3) or R2_BUCKET (R2)')
  return b
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const envIdx = args.indexOf('--env-file')
  const envFile = envIdx >= 0 ? args[envIdx + 1] : '.env.local'
  if (envIdx >= 0 && !args[envIdx + 1]) {
    console.error('Usage: --env-file <path>')
    process.exit(1)
  }

  loadEnvFile('.env', false)
  loadEnvFile('.env.example', true)
  loadEnvFile(envFile, true)

  try {
    resolveRemoteStorageProvider()
  } catch (e) {
    const need = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']
    const missing = need.filter((k) => !process.env[k]?.trim())
    if (missing.length) {
      console.error(
        `[storage:push-local] Missing or empty in ${path.resolve(process.cwd(), envFile)}: ${missing.join(', ')}`
      )
      console.error(
        '[storage:push-local] R2 uses different names than AWS. Add the four R2_* vars (see apps/investor/.env.example).'
      )
    }
    throw e
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required (same DB whose keys you are syncing).')
    process.exit(1)
  }

  const adminUploadsDir = path.resolve(__dirname, '../../admin/public/uploads')

  if (!existsSync(adminUploadsDir)) {
    console.error(`Admin uploads directory missing: ${adminUploadsDir}`)
    process.exit(1)
  }

  const client = dryRun ? null : getS3Client()
  const bucket = dryRun ? '(dry-run)' : bucketName()

  const images = await prisma.dealImage.findMany({
    where: { deletedAt: null },
    select: { id: true, storageKey: true, mimeType: true, dealId: true },
  })
  const docs = await prisma.dealDocument.findMany({
    where: { deletedAt: null },
    select: { id: true, storageKey: true, mimeType: true, dealId: true },
  })

  const rows = [
    ...images.map((r) => ({ ...r, kind: 'image' as const })),
    ...docs.map((r) => ({ ...r, kind: 'document' as const })),
  ]

  let ok = 0
  let skip = 0
  let fail = 0

  for (const row of rows) {
    const sk = row.storageKey.trim()
    if (/^https?:\/\//i.test(sk) || sk.startsWith('/')) {
      skip++
      continue
    }
    const localPath = path.join(adminUploadsDir, sk)
    if (!existsSync(localPath)) {
      console.warn(`[missing file] ${row.kind} ${row.id} key=${sk}`)
      skip++
      continue
    }
    const body = readFileSync(localPath)
    if (dryRun) {
      console.log(`[dry-run] would upload ${sk} (${body.length} bytes)`)
      ok++
      continue
    }
    try {
      await client!.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: sk,
          Body: body,
          ContentType: row.mimeType || 'application/octet-stream',
        })
      )
      console.log(`[ok] ${sk}`)
      ok++
    } catch (e) {
      console.error(`[fail] ${sk}`, e)
      fail++
    }
  }

  await prisma.$disconnect()
  console.log(`\nDone. uploaded=${ok} skipped_missing=${skip} failed=${fail} bucket=${bucket}`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect().catch(() => {})
  process.exit(1)
})
