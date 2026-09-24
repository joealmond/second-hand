import type { ItemClient } from './item-client'
import type { ItemRecord } from './item-contract'

const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|heic|heif)$/i

export function previewUrl(itemId: string, photoId: string): string {
  return `/api/media?itemId=${encodeURIComponent(itemId)}&photoId=${encodeURIComponent(photoId)}`
}

export function publicPreviewUrl(shareId: string, photoId: string): string {
  return `/api/media?shareId=${encodeURIComponent(shareId)}&photoId=${encodeURIComponent(photoId)}`
}

async function makePreview(file: File): Promise<Blob> {
  let source: CanvasImageSource
  let width: number
  let height: number
  let cleanup: () => void
  try {
    const bitmap = await createImageBitmap(file)
    source = bitmap
    width = bitmap.width
    height = bitmap.height
    cleanup = () => bitmap.close()
  } catch {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.src = url
    try {
      await image.decode()
    } catch {
      URL.revokeObjectURL(url)
      throw new Error('Ezt a fotóformátumot a böngésző nem tudja megnyitni.')
    }
    source = image
    width = image.naturalWidth
    height = image.naturalHeight
    cleanup = () => URL.revokeObjectURL(url)
  }
  const scale = Math.min(1, 1600 / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    cleanup()
    throw new Error('A böngésző nem tud képelőnézetet készíteni.')
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  cleanup()
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Nem készült előnézeti kép.'))),
      'image/jpeg',
      0.84
    )
  )
}

async function postBlob(url: string, body: Blob): Promise<string> {
  const response = await fetch(url, { method: 'POST', body })
  if (!response.ok) throw new Error('A fotó feltöltése nem sikerült. Próbáld újra.')
  const json = (await response.json()) as { storageId?: string }
  if (!json.storageId) throw new Error('A feltöltő válasza hiányos.')
  return json.storageId
}

export async function uploadPhoto(
  client: ItemClient,
  itemId: string,
  file: File
): Promise<ItemRecord> {
  if (!IMAGE_TYPES.has(file.type.toLowerCase()) && !IMAGE_EXTENSION.test(file.name))
    throw new Error('JPEG, PNG, WebP, HEIC vagy HEIF képet válassz.')
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error('Egy fotó legfeljebb 15 MB lehet.')
  const preview = await makePreview(file)
  const upload = await client.beginUpload(itemId)
  const [originalStorageId, previewStorageId] = await Promise.all([
    postBlob(upload.originalUploadUrl, file),
    postBlob(upload.previewUploadUrl, preview),
  ])
  return await client.completeUpload({
    id: itemId,
    intentId: upload.intentId,
    originalStorageId,
    previewStorageId,
    name: file.name,
  })
}
