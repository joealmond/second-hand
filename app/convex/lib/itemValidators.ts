import { v, ConvexError } from 'convex/values'
import type { ItemFacts } from '../../src/lib/item-contract'

export const fields = {
  category: v.union(
    v.literal('bicycle'),
    v.literal('electronics'),
    v.literal('furniture'),
    v.literal('household'),
    v.literal('clothing'),
    v.literal('sport'),
    v.literal('toy'),
    v.literal('book'),
    v.literal('other')
  ),
  title: v.string(),
  manufacturer: v.optional(v.string()),
  model: v.optional(v.string()),
  description: v.string(),
  aestheticNotes: v.optional(v.array(v.string())),
  accessoriesStatus: v.optional(
    v.union(v.literal('unknown'), v.literal('complete'), v.literal('listed'))
  ),
  accessories: v.optional(v.array(v.string())),
  priceHuf: v.union(v.number(), v.null()),
  city: v.string(),
  pickupNote: v.string(),
  workingCondition: v.union(v.literal('unknown'), v.literal('working'), v.literal('needs_repair')),
  defectsStatus: v.union(v.literal('unknown'), v.literal('none'), v.literal('listed')),
  defects: v.array(v.string()),
  negotiable: v.boolean(),
  contactKind: v.union(v.literal('email'), v.literal('phone'), v.literal('link')),
  contactValue: v.string(),
  privateNote: v.string(),
}
export const itemFactsValidator = v.object(fields)
export const factSourceValidator = v.union(
  v.literal('unknown'),
  v.literal('ai'),
  v.literal('location'),
  v.literal('seller')
)
export const factSourcesValidator = v.object({
  category: factSourceValidator,
  title: factSourceValidator,
  description: factSourceValidator,
  city: factSourceValidator,
  manufacturer: v.optional(factSourceValidator),
  model: v.optional(factSourceValidator),
  priceHuf: v.optional(factSourceValidator),
})
export const itemSuggestionValidator = v.object({
  model: v.string(),
  analyzedAt: v.number(),
  visibleDetails: v.array(v.string()),
  possibleDefects: v.array(v.string()),
  photo: v.object({
    score: v.number(),
    ready: v.boolean(),
    summary: v.string(),
    issues: v.array(v.string()),
    suggestedAngles: v.array(v.string()),
  }),
})
export const postingValidator = v.object({
  destination: v.union(v.literal('jofogas'), v.literal('facebook')),
  status: v.union(v.literal('reported_posted'), v.literal('reported_removed')),
  url: v.string(),
  updatedAt: v.number(),
})
export function cleanFacts(f: ItemFacts): ItemFacts {
  const result = {
    ...f,
    manufacturer: f.manufacturer ?? '',
    model: f.model ?? '',
    aestheticNotes: (f.aestheticNotes ?? []).map((s) => s.trim()).filter(Boolean),
    accessoriesStatus: f.accessoriesStatus ?? 'unknown',
    accessories: (f.accessories ?? []).map((s) => s.trim()).filter(Boolean),
    defects: f.defects.map((s) => s.trim()).filter(Boolean),
  }
  for (const key of [
    'title',
    'manufacturer',
    'model',
    'description',
    'city',
    'pickupNote',
    'contactValue',
    'privateNote',
  ] as const) {
    result[key] = result[key].trim()
    const max = key === 'description' || key === 'privateNote' ? 5000 : key === 'title' ? 140 : 500
    if (result[key].length > max)
      throw new ConvexError(`Túl hosszú mező: ${key} (legfeljebb ${max} karakter).`)
  }
  if (
    result.priceHuf !== null &&
    (!Number.isSafeInteger(result.priceHuf) ||
      result.priceHuf <= 0 ||
      result.priceHuf > 999_999_999)
  )
    throw new ConvexError('Az ár pozitív egész forint legyen.')
  if (
    result.aestheticNotes.length > 20 ||
    result.accessories.length > 20 ||
    [...result.aestheticNotes, ...result.accessories].some((s) => s.length > 500)
  )
    throw new ConvexError('A felsorolás túl hosszú.')
  if (result.defects.length > 20 || result.defects.some((s) => s.length > 500))
    throw new ConvexError('A hibák leírása túl hosszú.')
  if (result.defects.length && result.defectsStatus !== 'listed')
    throw new ConvexError('A felsorolt hibákat jelöld ismert hibaként.')
  return result
}

export const MAX_ORIGINAL = 15 * 1024 * 1024
export const MAX_PREVIEW = 2 * 1024 * 1024
export const MAX_PHOTOS = 8
export const MAX_STORAGE = 250 * 1024 * 1024

export function detectImage(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg'
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    return 'image/png'
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') {
    const brand = String.fromCharCode(...bytes.slice(8, 12))
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic'
    if (['mif1', 'msf1'].includes(brand)) return 'image/heif'
  }
  return null
}

/** Strip metadata from every JPEG segment, including between progressive scans. */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (detectImage(bytes) !== 'image/jpeg') throw new ConvexError('Az előnézeti kép JPEG legyen.')
  const parts: Uint8Array[] = [bytes.slice(0, 2)]
  let offset = 2
  let sawScan = false
  while (offset < bytes.length) {
    const start = offset
    if (bytes[offset] !== 255) throw new ConvexError('Sérült JPEG-fotó.')
    while (bytes[offset] === 255) offset++
    const marker = bytes[offset++]
    if (marker === 217) {
      if (!sawScan) break
      parts.push(new Uint8Array([255, 217]))
      const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
      let cursor = 0
      for (const part of parts) {
        result.set(part, cursor)
        cursor += part.length
      }
      return result
    }
    const length = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)
    if (length < 2 || offset + length > bytes.length) throw new ConvexError('Sérült JPEG-fotó.')
    const end = offset + length
    if (!((marker !== undefined && marker >= 224 && marker <= 239) || marker === 254))
      parts.push(bytes.slice(start, end))
    offset = end
    if (marker === 218) {
      sawScan = true
      const scanStart = offset
      while (offset < bytes.length) {
        if (bytes[offset] !== 255) {
          offset++
          continue
        }
        const next = bytes[offset + 1]
        if (next === 0 || (next !== undefined && next >= 208 && next <= 215)) {
          offset += 2
          continue
        }
        break
      }
      parts.push(bytes.slice(scanStart, offset))
    }
  }
  throw new ConvexError('Hiányos JPEG-fotó.')
}
