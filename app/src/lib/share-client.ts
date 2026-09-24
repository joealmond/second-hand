import { zipSync } from 'fflate'
import type { ItemRecord } from './item-contract'
import { previewUrl } from './photo-client'

/** Copies text, falling back to a hidden textarea where the async clipboard is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  }
}

function isAbort(cause: unknown) {
  return cause instanceof DOMException && cause.name === 'AbortError'
}

/** Opens the system share sheet when there is one; otherwise copies the link. */
export async function shareLink(data: {
  title: string
  url: string
}): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: data.title, url: data.url })
      return 'shared'
    } catch (cause) {
      if (isAbort(cause)) return 'cancelled'
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'failed'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function fileSlug(title: string) {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'targy'
}

/**
 * The marketplace-ready photos: the private previews, which are resized JPEGs
 * with metadata (such as GPS position) already removed. Originals stay private.
 */
export async function listingPhotoFiles(item: ItemRecord): Promise<File[]> {
  const slug = fileSlug(item.facts.title)
  return await Promise.all(
    item.photos.map(async (photo, index) => {
      const response = await fetch(previewUrl(item.id, photo.id))
      if (!response.ok) throw new Error(`A fotó nem tölthető le (${response.status}).`)
      const blob = await response.blob()
      return new File([blob], `${slug}-${String(index + 1).padStart(2, '0')}.jpg`, {
        type: blob.type || 'image/jpeg',
      })
    })
  )
}

/**
 * On a phone the share sheet can put the photos straight into the camera roll.
 * Elsewhere the photos download, zipped when there are several.
 */
export async function savePhotoFiles(
  files: File[],
  title: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (touch && typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
    try {
      await navigator.share({ files, title })
      return 'shared'
    } catch (cause) {
      if (isAbort(cause)) return 'cancelled'
    }
  }
  if (files.length === 1) {
    downloadBlob(files[0]!, files[0]!.name)
    return 'downloaded'
  }
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) entries[file.name] = new Uint8Array(await file.arrayBuffer())
  const archive = new Uint8Array(zipSync(entries, { level: 0 }))
  downloadBlob(
    new Blob([archive.buffer], { type: 'application/zip' }),
    `${fileSlug(title)}-fotok.zip`
  )
  return 'downloaded'
}
