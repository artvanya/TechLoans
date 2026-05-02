/** Client-side deal image upload: presigned PUT → R2 (Vercel-safe) or multipart for local storage. */

export type UploadDealImageResult =
  | { ok: true; data: { id: string; url: string; isPrimary: boolean; sortOrder: number } }
  | { ok: false; message: string; details?: string }

export async function uploadDealImageFromBrowser(
  dealId: string,
  file: File,
  opts: { isPrimary: boolean }
): Promise<UploadDealImageResult> {
  const mimeType = file.type || 'application/octet-stream'
  const meta = { fileName: file.name, mimeType, fileSize: file.size }

  const u1 = await fetch(`/api/deals/${dealId}/images/upload-url?_=${Date.now()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  })
  const u1text = await u1.text()
  let j1: { success?: boolean; data?: unknown; error?: { message?: string; details?: string } }
  try {
    j1 = JSON.parse(u1text) as typeof j1
  } catch {
    return {
      ok: false,
      message: `Upload URL returned non-JSON (HTTP ${u1.status})`,
      details: u1text.slice(0, 300),
    }
  }
  if (!j1.success) {
    return {
      ok: false,
      message: j1.error?.message ?? 'Could not start upload',
      details: j1.error?.details,
    }
  }

  const data1 = j1.data as { mode?: string } | undefined
  if (data1?.mode === 'local') {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('isPrimary', opts.isPrimary ? 'true' : 'false')
    const u2 = await fetch(`/api/deals/${dealId}/images`, { method: 'POST', body: fd })
    const j2 = await u2.json()
    if (!j2.success) {
      return {
        ok: false,
        message: j2.error?.message ?? 'Upload failed',
        details: j2.error?.details,
      }
    }
    return { ok: true, data: j2.data }
  }

  const { uploadUrl, storageKey, mimeType: signedMime } = j1.data as {
    uploadUrl: string
    storageKey: string
    mimeType: string
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': signedMime },
  })
  if (!putRes.ok) {
    const t = await putRes.text().catch(() => '')
    return {
      ok: false,
      message: `Direct upload failed (${putRes.status}). For R2, add a CORS rule on the bucket allowing PUT from your admin site origin.`,
      details: t.slice(0, 400),
    }
  }

  const u3 = await fetch(`/api/deals/${dealId}/images/complete?_=${Date.now()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storageKey,
      fileName: file.name,
      mimeType: signedMime,
      sizeBytes: file.size,
      isPrimary: opts.isPrimary,
    }),
  })
  const j3 = await u3.json()
  if (!j3.success) {
    return {
      ok: false,
      message: j3.error?.message ?? 'Could not finalize upload',
      details: j3.error?.details,
    }
  }
  return { ok: true, data: j3.data }
}
