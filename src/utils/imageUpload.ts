import { loadEditCode } from './editCode'

/**
 * Longest edge an uploaded image is scaled down to. A board is shown on a
 * projector or a TV, so anything past this is invisible detail that only makes
 * the upload slower and the database bigger.
 */
const MAX_EDGE = 1600

/** Must stay at or below the server's own limit in server/index.ts. */
const MAX_BYTES = 600 * 1024

/** Quality steps tried in order until the encoded image fits under MAX_BYTES. */
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45]

/** Formats the browser may encode to, best first. */
const ENCODE_TYPES = ['image/webp', 'image/jpeg'] as const

export class ImageUploadError extends Error {}

/** Promise wrapper around the callback-style canvas encoder. */
function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

/** Decodes a file into a bitmap, rejecting anything that isn't a real image. */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    throw new ImageUploadError('Klarte ikke lese bildefila. Bruk JPEG, PNG eller WebP.')
  }
}

/**
 * Scales an image down to fit MAX_EDGE and re-encodes it small enough to store.
 *
 * Re-encoding rather than uploading the original is what keeps this feature
 * cheap: a 6 MB phone photo comes out around 150 KB, which is small enough to
 * live in the same database as the boards.
 */
async function shrink(file: File): Promise<{ blob: Blob; type: string }> {
  const bitmap = await decode(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageUploadError('Nettleseren klarte ikke behandle bildet.')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    for (const type of ENCODE_TYPES) {
      for (const quality of QUALITY_STEPS) {
        const blob = await encode(canvas, type, quality)
        // A browser that can't encode `type` silently falls back to PNG, which
        // ignores `quality` and would loop pointlessly — move to the next type.
        if (!blob || blob.type !== type) break
        if (blob.size <= MAX_BYTES) return { blob, type }
      }
    }
    throw new ImageUploadError('Bildet er for stort. Prøv et mindre bilde.')
  } finally {
    bitmap.close()
  }
}

/**
 * Uploads an image and returns the path to store on the board.
 *
 * The returned path is what `isUploadedImagePath` accepts; nothing else may be
 * written into a board's image fields.
 */
export async function uploadImage(file: File): Promise<string> {
  const { blob, type } = await shrink(file)
  const code = loadEditCode()

  let res: Response
  try {
    res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': type, ...(code ? { 'x-edit-code': code } : {}) },
      body: blob,
    })
  } catch {
    throw new ImageUploadError('Kunne ikke kontakte serveren. Prøv igjen.')
  }

  if (!res.ok) {
    if (res.status === 401) throw new ImageUploadError('Koden er ikke lenger gyldig. Lås opp på nytt.')
    // body-parser answers an over-limit body itself, in English, before the route runs.
    if (res.status === 413) throw new ImageUploadError('Bildet er for stort. Prøv et mindre bilde.')
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ImageUploadError(body?.error ?? `Kunne ikke laste opp bildet (${res.status})`)
  }

  const body = (await res.json().catch(() => null)) as { url?: unknown } | null
  if (!body || typeof body.url !== 'string') {
    throw new ImageUploadError('Uventet svar fra serveren.')
  }
  return body.url
}
