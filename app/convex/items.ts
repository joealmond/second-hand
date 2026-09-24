import { ConvexError, v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { EMPTY_FACTS, EMPTY_FACT_SOURCES, publicationProblems } from '../src/lib/item-contract'
import type {
  FactSources,
  ItemFacts,
  ItemRecord,
  ItemSuggestion,
  PriceSuggestion,
  PublicItem,
} from '../src/lib/item-contract'
import {
  itemAnalysisPromptFor,
  canonicalManufacturer,
  itemAnalysisResponseSchema,
  parseItemAnalysis,
  protectedDetailsPreserved,
} from './lib/itemAnalysis'
import { requireAuth } from './lib/authHelpers'
import { rateLimiter } from './lib/services/rateLimitService'
import {
  cleanFacts,
  detectImage,
  fields,
  itemFactsValidator,
  itemSuggestionValidator,
  MAX_ORIGINAL,
  MAX_PHOTOS,
  MAX_PREVIEW,
  MAX_STORAGE,
  stripJpegMetadata,
} from './lib/itemValidators'

async function owned(ctx: QueryCtx | MutationCtx, id: Id<'items'>) {
  const user = await requireAuth(ctx)
  const item = await ctx.db.get(id)
  if (!item || item.ownerId !== user._id)
    throw new ConvexError('Ez a tárgy nem érhető el ebben a munkamenetben.')
  return item
}
function normalizedFacts(facts: Partial<ItemFacts>): ItemFacts {
  return { ...EMPTY_FACTS, ...facts }
}
function currentFactSources(item: Doc<'items'>): FactSources {
  if (item.factSources) return { ...EMPTY_FACT_SOURCES, ...item.factSources }
  // Items saved before provenance existed only carry seller-entered text.
  return {
    ...EMPTY_FACT_SOURCES,
    ...(item.facts.title
      ? { title: 'seller' as const, description: 'seller' as const, category: 'seller' as const }
      : {}),
    ...(item.facts.city ? { city: 'seller' as const } : {}),
  }
}
const PUBLIC_FACT_KEYS = (Object.keys(EMPTY_FACTS) as (keyof ItemFacts)[]).filter(
  (key) => key !== 'privateNote'
)
/** Whether the shared snapshot still matches the owner's current public facts and photos. */
async function publicationOutdated(
  ctx: QueryCtx | MutationCtx,
  item: Doc<'items'>,
  photoIds: Id<'itemPhotos'>[]
): Promise<boolean> {
  if (!item.shareId) return false
  const publication = await ctx.db.get(item.shareId)
  if (!publication) return false
  const published = normalizedFacts(publication.facts)
  const current = normalizedFacts(item.facts)
  return (
    publication.photoIds.length !== photoIds.length ||
    publication.photoIds.some((id, index) => id !== photoIds[index]) ||
    PUBLIC_FACT_KEYS.some((key) => JSON.stringify(published[key]) !== JSON.stringify(current[key]))
  )
}
async function record(ctx: QueryCtx | MutationCtx, item: Doc<'items'>): Promise<ItemRecord> {
  const photos = await ctx.db
    .query('itemPhotos')
    .withIndex('by_item', (q) => q.eq('itemId', item._id))
    .take(MAX_PHOTOS)
  return {
    id: item._id,
    facts: normalizedFacts(item.facts),
    status: item.status,
    revision: item.revision,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    shareId: item.shareId ?? null,
    postings: item.postings,
    factSources: currentFactSources(item),
    publicationOutdated: await publicationOutdated(
      ctx,
      item,
      photos.map((p) => p._id)
    ),
    aiSuggestion: item.aiSuggestion ?? null,
    priceSuggestion: item.priceSuggestion ?? null,
    photos: photos.map((p) => ({
      id: p._id,
      name: p.name,
      contentType: p.contentType,
      size: p.size,
    })),
  }
}
function assertRevision(item: Doc<'items'>, expected: number) {
  if (item.revision !== expected)
    throw new ConvexError(
      'CONFLICT: A tárgy egy másik lapon megváltozott. Töltsd be az új változatot, mielőtt mented.'
    )
}
export const transferOwnership = internalMutation({
  args: { fromOwnerId: v.string(), toOwnerId: v.string() },
  handler: async (ctx, { fromOwnerId, toOwnerId }) => {
    const items = await ctx.db
      .query('items')
      .withIndex('by_owner', (q) => q.eq('ownerId', fromOwnerId))
      .take(100)
    const photos = await ctx.db
      .query('itemPhotos')
      .withIndex('by_owner', (q) => q.eq('ownerId', fromOwnerId))
      .take(100)
    const intents = await ctx.db
      .query('itemUploadIntents')
      .withIndex('by_owner', (q) => q.eq('ownerId', fromOwnerId))
      .take(100)
    for (const item of items) await ctx.db.patch(item._id, { ownerId: toOwnerId })
    for (const photo of photos) await ctx.db.patch(photo._id, { ownerId: toOwnerId })
    for (const intent of intents) await ctx.db.patch(intent._id, { ownerId: toOwnerId })
    if (items.length === 100 || photos.length === 100 || intents.length === 100) {
      await ctx.scheduler.runAfter(0, internal.items.transferOwnership, {
        fromOwnerId,
        toOwnerId,
      })
    }
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)
    const items = await ctx.db
      .query('items')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .order('desc')
      .take(100)
    return await Promise.all(items.map((i) => record(ctx, i)))
  },
})
export const get = query({
  args: { id: v.id('items') },
  handler: async (ctx, { id }) => record(ctx, await owned(ctx, id)),
})
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)
    const existing = await ctx.db
      .query('items')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .take(100)
    if (existing.length >= 100)
      throw new ConvexError('Ebben a prototípusban legfeljebb 100 tárgy menthető.')
    const now = Date.now()
    const id = await ctx.db.insert('items', {
      ownerId: user._id,
      facts: { ...EMPTY_FACTS, contactValue: user.isAnonymous ? '' : user.email },
      status: 'draft',
      revision: 0,
      createdAt: now,
      updatedAt: now,
      postings: [],
      factSources: EMPTY_FACT_SOURCES,
    })
    return { id }
  },
})
export const save = mutation({
  args: { id: v.id('items'), expectedRevision: v.number(), facts: itemFactsValidator },
  handler: async (ctx, args) => {
    const item = await owned(ctx, args.id)
    assertRevision(item, args.expectedRevision)
    const facts = cleanFacts(normalizedFacts(args.facts))
    const previous = { ...EMPTY_FACT_SOURCES, ...item.factSources }
    const factSources: FactSources = { ...previous }
    for (const key of [
      'category',
      'title',
      'description',
      'city',
      'manufacturer',
      'model',
      'priceHuf',
    ] as const) {
      if (facts[key] !== item.facts[key]) factSources[key] = 'seller'
    }
    await ctx.db.patch(item._id, {
      facts,
      factSources,
      revision: item.revision + 1,
      updatedAt: Date.now(),
    })
    return record(ctx, (await ctx.db.get(item._id))!)
  },
})
/**
 * The seller confirms AI- or location-suggested facts as their own without
 * retyping them. Provenance is metadata, not a fact change, so the revision
 * stays put and an in-flight save of the same item cannot conflict with it.
 */
export const confirmFacts = mutation({
  args: {
    id: v.id('items'),
    keys: v.array(
      v.union(
        v.literal('category'),
        v.literal('title'),
        v.literal('description'),
        v.literal('city'),
        v.literal('manufacturer'),
        v.literal('model'),
        v.literal('priceHuf')
      )
    ),
  },
  handler: async (ctx, { id, keys }) => {
    const item = await owned(ctx, id)
    const factSources = currentFactSources(item)
    for (const key of keys) factSources[key] = 'seller'
    await ctx.db.patch(id, { factSources })
    return record(ctx, (await ctx.db.get(id))!)
  },
})
export const publish = mutation({
  args: { id: v.id('items'), expectedRevision: v.number() },
  handler: async (ctx, args) => {
    const item = await owned(ctx, args.id)
    assertRevision(item, args.expectedRevision)
    const photos = await ctx.db
      .query('itemPhotos')
      .withIndex('by_item', (q) => q.eq('itemId', item._id))
      .take(MAX_PHOTOS)
    const problems = publicationProblems(normalizedFacts(item.facts), photos.length)
    if (problems.length) throw new ConvexError(problems.join(' '))
    const now = Date.now()
    // No private values are copied into a public snapshot, even internally.
    const snapshot = {
      itemId: item._id,
      facts: { ...normalizedFacts(item.facts), privateNote: '' },
      photoIds: photos.map((p) => p._id),
      updatedAt: now,
    }
    const shareId = item.shareId ?? (await ctx.db.insert('publications', snapshot))
    if (item.shareId) await ctx.db.replace(item.shareId, snapshot)
    await ctx.db.patch(item._id, {
      shareId,
      status: item.status === 'sold' ? 'sold' : 'active',
      revision: item.revision + 1,
      updatedAt: now,
    })
    return record(ctx, (await ctx.db.get(item._id))!)
  },
})
export const unpublish = mutation({
  args: { id: v.id('items') },
  handler: async (ctx, { id }) => {
    const item = await owned(ctx, id)
    if (item.shareId) await ctx.db.delete(item.shareId)
    await ctx.db.patch(id, {
      shareId: undefined,
      status: item.status === 'sold' ? 'sold' : 'draft',
      revision: item.revision + 1,
      updatedAt: Date.now(),
    })
    return record(ctx, (await ctx.db.get(id))!)
  },
})
export const markSold = mutation({
  args: { id: v.id('items'), sold: v.boolean() },
  handler: async (ctx, { id, sold }) => {
    const item = await owned(ctx, id)
    await ctx.db.patch(id, {
      status: sold ? 'sold' : item.shareId ? 'active' : 'draft',
      revision: item.revision + 1,
      updatedAt: Date.now(),
    })
    return record(ctx, (await ctx.db.get(id))!)
  },
})
export const setPosting = mutation({
  args: {
    id: v.id('items'),
    destination: v.union(v.literal('jofogas'), v.literal('facebook')),
    status: v.union(v.literal('reported_posted'), v.literal('reported_removed')),
    url: v.string(),
  },
  handler: async (ctx, { id, destination, status, url }) => {
    const item = await owned(ctx, id)
    if (url && (!/^https:\/\//.test(url) || url.length > 1000))
      throw new ConvexError('A hirdetéshez HTTPS-linket adj meg.')
    const postings = [
      ...item.postings.filter((p) => p.destination !== destination),
      { destination, status, url, updatedAt: Date.now() },
    ]
    await ctx.db.patch(id, { postings, revision: item.revision + 1, updatedAt: Date.now() })
    return record(ctx, (await ctx.db.get(id))!)
  },
})
export const getPublic = query({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }): Promise<PublicItem | null> => {
    const id = ctx.db.normalizeId('publications', shareId)
    const publication = id ? await ctx.db.get(id) : null
    if (!publication) return null
    const item = await ctx.db.get(publication.itemId)
    if (!item || item.shareId !== publication._id) return null
    const f = normalizedFacts(publication.facts)
    const photos = await Promise.all(publication.photoIds.map((photoId) => ctx.db.get(photoId)))
    // Explicit allowlist. Never spread an owner record into this response.
    return {
      shareId,
      title: f.title,
      description: f.description,
      manufacturer: f.manufacturer,
      model: f.model,
      aestheticNotes: f.aestheticNotes,
      accessoriesStatus: f.accessoriesStatus,
      accessories: f.accessories,
      priceHuf: f.priceHuf!,
      city: f.city,
      pickupNote: f.pickupNote,
      workingCondition: f.workingCondition,
      defectsStatus: f.defectsStatus,
      defects: f.defects,
      negotiable: f.negotiable,
      contactKind: f.contactKind,
      contactValue: f.contactValue,
      status: item.status === 'sold' ? 'sold' : 'active',
      updatedAt: Math.max(publication.updatedAt, item.updatedAt),
      photos: photos
        .filter((p): p is Doc<'itemPhotos'> => !!p)
        .map((p) => ({ id: p._id, name: 'Termékfotó' })),
    }
  },
})

export const beginUpload = mutation({
  args: { id: v.id('items') },
  handler: async (ctx, { id }) => {
    const item = await owned(ctx, id)
    const photos = await ctx.db
      .query('itemPhotos')
      .withIndex('by_item', (q) => q.eq('itemId', id))
      .take(MAX_PHOTOS)
    if (photos.length >= MAX_PHOTOS)
      throw new ConvexError('Legfeljebb 8 fotót adhatsz egy tárgyhoz.')
    const intents = await ctx.db
      .query('itemUploadIntents')
      .withIndex('by_owner', (q) => q.eq('ownerId', item.ownerId))
      .take(100)
    if (intents.filter((i) => i.expiresAt > Date.now() && !i.completedPhotoId).length >= 8)
      throw new ConvexError('Túl sok feltöltés folyamatban. Várj egy kicsit.')
    const intentId = await ctx.db.insert('itemUploadIntents', {
      ownerId: item.ownerId,
      itemId: id,
      expiresAt: Date.now() + 10 * 60_000,
    })
    return {
      intentId,
      originalUploadUrl: await ctx.storage.generateUploadUrl(),
      previewUploadUrl: await ctx.storage.generateUploadUrl(),
    }
  },
})
export const inspectUpload = internalQuery({
  args: {
    id: v.id('items'),
    intentId: v.id('itemUploadIntents'),
    ownerId: v.string(),
    originalStorageId: v.id('_storage'),
    previewStorageId: v.id('_storage'),
  },
  handler: async (ctx, a) => {
    const item = await ctx.db.get(a.id)
    const intent = await ctx.db.get(a.intentId)
    if (
      !item ||
      item.ownerId !== a.ownerId ||
      !intent ||
      intent.ownerId !== a.ownerId ||
      intent.itemId !== a.id
    )
      throw new ConvexError('Érvénytelen feltöltési engedély.')
    if (intent.completedPhotoId) return { completed: true }
    if (intent.expiresAt < Date.now())
      throw new ConvexError('A feltöltési engedély lejárt. Próbáld újra.')
    for (const storageId of [a.originalStorageId, a.previewStorageId]) {
      if (
        (await ctx.db
          .query('itemPhotos')
          .withIndex('by_original', (q) => q.eq('originalStorageId', storageId))
          .first()) ||
        (await ctx.db
          .query('itemPhotos')
          .withIndex('by_preview', (q) => q.eq('previewStorageId', storageId))
          .first())
      )
        throw new ConvexError('Ez a fotó már egy tárgyhoz tartozik.')
    }
    if (a.originalStorageId === a.previewStorageId)
      throw new ConvexError('Az eredeti és az előnézet külön fájl legyen.')
    return { completed: false }
  },
})
export const finishUpload = internalMutation({
  args: {
    id: v.id('items'),
    ownerId: v.string(),
    intentId: v.id('itemUploadIntents'),
    originalStorageId: v.id('_storage'),
    previewStorageId: v.id('_storage'),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    previewSize: v.number(),
  },
  handler: async (ctx, a) => {
    const item = await ctx.db.get(a.id)
    const intent = await ctx.db.get(a.intentId)
    if (
      !item ||
      item.ownerId !== a.ownerId ||
      !intent ||
      intent.ownerId !== a.ownerId ||
      intent.itemId !== a.id
    )
      throw new ConvexError('Érvénytelen feltöltés.')
    if (intent.completedPhotoId) return { item: await record(ctx, item), inserted: false }
    if (intent.expiresAt < Date.now()) throw new ConvexError('Lejárt feltöltés.')
    const photos = await ctx.db
      .query('itemPhotos')
      .withIndex('by_owner', (q) => q.eq('ownerId', a.ownerId))
      .take(801)
    if (
      photos.filter((p) => p.itemId === a.id).length >= MAX_PHOTOS ||
      photos.reduce((n, p) => n + p.size + p.previewSize, 0) + a.size + a.previewSize > MAX_STORAGE
    )
      throw new ConvexError('A fotók tárhelykorlátja betelt.')
    const duplicate = await ctx.db
      .query('itemPhotos')
      .withIndex('by_original', (q) => q.eq('originalStorageId', a.originalStorageId))
      .first()
    if (duplicate) throw new ConvexError('Ez a fotó már fel van töltve.')
    const photoId = await ctx.db.insert('itemPhotos', {
      itemId: a.id,
      ownerId: a.ownerId,
      originalStorageId: a.originalStorageId,
      previewStorageId: a.previewStorageId,
      name:
        Array.from(a.name)
          .map((c) => (c.charCodeAt(0) < 32 || c === '/' || c === '\\' ? '_' : c))
          .join('')
          .slice(0, 160) || 'foto',
      contentType: a.contentType,
      size: a.size,
      previewSize: a.previewSize,
    })
    await ctx.db.patch(a.intentId, { completedPhotoId: photoId })
    await ctx.db.patch(a.id, {
      updatedAt: Date.now(),
      revision: item.revision + 1,
    })
    return { item: await record(ctx, (await ctx.db.get(a.id))!), inserted: true }
  },
})
export const completeUpload = action({
  args: {
    id: v.id('items'),
    intentId: v.id('itemUploadIntents'),
    originalStorageId: v.id('_storage'),
    previewStorageId: v.id('_storage'),
    name: v.string(),
  },
  handler: async (ctx, a): Promise<ItemRecord> => {
    const user = await requireAuth(ctx)
    const inspected = await ctx.runQuery(internal.items.inspectUpload, {
      id: a.id,
      intentId: a.intentId,
      originalStorageId: a.originalStorageId,
      previewStorageId: a.previewStorageId,
      ownerId: user._id,
    })
    if (inspected.completed)
      return ctx.runQuery(internal.items.ownerRecord, { id: a.id, ownerId: user._id })
    const original = await ctx.storage.get(a.originalStorageId)
    const preview = await ctx.storage.get(a.previewStorageId)
    if (
      !original ||
      !preview ||
      !original.size ||
      original.size > MAX_ORIGINAL ||
      !preview.size ||
      preview.size > MAX_PREVIEW
    )
      throw new ConvexError('Az eredeti legfeljebb 15 MB, az előnézet legfeljebb 2 MB lehet.')
    const originalType = detectImage(new Uint8Array(await original.slice(0, 12).arrayBuffer()))
    if (!originalType)
      throw new ConvexError('JPEG, PNG vagy WebP, illetve HEIC/HEIF fotót válassz.')
    const clean = stripJpegMetadata(new Uint8Array(await preview.arrayBuffer()))
    const cleanStorageId = await ctx.storage.store(
      new Blob([clean.slice().buffer], { type: 'image/jpeg' })
    )
    try {
      const result = await ctx.runMutation(internal.items.finishUpload, {
        ...a,
        ownerId: user._id,
        previewStorageId: cleanStorageId,
        contentType: originalType,
        size: original.size,
        previewSize: clean.byteLength,
      })
      if (!result.inserted) await ctx.storage.delete(cleanStorageId)
      else await ctx.storage.delete(a.previewStorageId)
      return result.item
    } catch (error) {
      await ctx.storage.delete(cleanStorageId)
      throw error
    }
  },
})
export const ownerRecord = internalQuery({
  args: { id: v.id('items'), ownerId: v.string() },
  handler: async (ctx, { id, ownerId }) => {
    const item = await ctx.db.get(id)
    if (!item || item.ownerId !== ownerId) throw new ConvexError('Nem található.')
    return record(ctx, item)
  },
})
export const deletePhoto = mutation({
  args: { id: v.id('items'), photoId: v.id('itemPhotos') },
  handler: async (ctx, { id, photoId }) => {
    const item = await owned(ctx, id)
    const photo = await ctx.db.get(photoId)
    if (!photo || photo.itemId !== id) throw new ConvexError('Nem található a fotó.')
    if (item.shareId) {
      const publication = await ctx.db.get(item.shareId)
      if (publication?.photoIds.includes(photoId))
        throw new ConvexError('A megosztott fotó törlése előtt rejtsd el a hirdetést.')
    }
    await ctx.storage.delete(photo.originalStorageId)
    await ctx.storage.delete(photo.previewStorageId)
    await ctx.db.delete(photoId)
    await ctx.db.patch(id, {
      revision: item.revision + 1,
      updatedAt: Date.now(),
    })
    return record(ctx, (await ctx.db.get(id))!)
  },
})
export const deleteItem = mutation({
  args: { id: v.id('items') },
  handler: async (ctx, { id }) => {
    const item = await owned(ctx, id)
    const photos = await ctx.db
      .query('itemPhotos')
      .withIndex('by_item', (q) => q.eq('itemId', id))
      .collect()
    const intents = await ctx.db
      .query('itemUploadIntents')
      .withIndex('by_item', (q) => q.eq('itemId', id))
      .collect()
    if (item.shareId) await ctx.db.delete(item.shareId)
    for (const photo of photos) {
      await ctx.storage.delete(photo.originalStorageId)
      await ctx.storage.delete(photo.previewStorageId)
      await ctx.db.delete(photo._id)
    }
    for (const intent of intents) await ctx.db.delete(intent._id)
    await ctx.db.delete(id)
    return { deleted: true }
  },
})
export const setDetectedCity = mutation({
  args: { id: v.id('items'), city: v.string() },
  handler: async (ctx, { id, city }) => {
    const item = await owned(ctx, id)
    const value = city.trim().slice(0, 120)
    const sources = { ...EMPTY_FACT_SOURCES, ...item.factSources }
    if (!value || sources.city === 'seller' || item.facts.city === value) return record(ctx, item)
    await ctx.db.patch(id, {
      facts: { ...item.facts, city: value },
      factSources: { ...sources, city: 'location' },
      revision: item.revision + 1,
      updatedAt: Date.now(),
    })
    return record(ctx, (await ctx.db.get(id))!)
  },
})

export const analysisInput = internalQuery({
  args: { id: v.id('items'), ownerId: v.string() },
  handler: async (ctx, { id, ownerId }) => {
    const item = await ctx.db.get(id)
    if (!item || item.ownerId !== ownerId) throw new ConvexError('Nem található.')
    const photos = await ctx.db
      .query('itemPhotos')
      .withIndex('by_item', (q) => q.eq('itemId', id))
      .take(MAX_PHOTOS)
    if (!photos.length) throw new ConvexError('Előbb adj hozzá legalább egy fotót.')
    return {
      facts: normalizedFacts(item.facts),
      factSources: { ...EMPTY_FACT_SOURCES, ...item.factSources },
      photoIds: photos.map((photo) => photo._id),
      previews: photos.map((photo) => photo.previewStorageId),
    }
  },
})

export const applyAnalysis = internalMutation({
  args: {
    id: v.id('items'),
    ownerId: v.string(),
    photoIds: v.array(v.id('itemPhotos')),
    baseFacts: v.object({
      category: fields.category,
      title: v.string(),
      manufacturer: v.string(),
      model: v.string(),
      description: v.string(),
      aestheticNotes: v.array(v.string()),
      accessoriesStatus: fields.accessoriesStatus,
      accessories: v.array(v.string()),
    }),
    suggestion: itemSuggestionValidator,
    suggestedFacts: v.object({
      category: fields.category,
      title: v.string(),
      manufacturer: v.string(),
      model: v.string(),
      description: v.string(),
      aestheticNotes: v.array(v.string()),
      accessories: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id)
    if (!item || item.ownerId !== args.ownerId) throw new ConvexError('Nem található.')
    const photos = await ctx.db
      .query('itemPhotos')
      .withIndex('by_item', (q) => q.eq('itemId', args.id))
      .take(MAX_PHOTOS)
    if (photos.map((photo) => photo._id).join(',') !== args.photoIds.join(',')) {
      return record(ctx, item)
    }
    const sources = { ...EMPTY_FACT_SOURCES, ...item.factSources }
    const factSources: FactSources = { ...sources }
    const facts = normalizedFacts(item.facts)
    for (const key of ['category', 'title', 'manufacturer', 'model', 'description'] as const) {
      const suggestion = args.suggestedFacts[key]
      const wouldEraseIdentity =
        (key === 'title' || key === 'manufacturer' || key === 'model') &&
        Boolean(facts[key]) &&
        !suggestion
      if (facts[key] === args.baseFacts[key] && sources[key] !== 'seller' && !wouldEraseIdentity) {
        facts[key] = suggestion as never
        factSources[key] = 'ai'
      }
    }
    if (
      JSON.stringify(facts.aestheticNotes ?? []) === JSON.stringify(args.baseFacts.aestheticNotes)
    )
      facts.aestheticNotes = args.suggestedFacts.aestheticNotes
    if (
      JSON.stringify(facts.accessories ?? []) === JSON.stringify(args.baseFacts.accessories) &&
      facts.accessoriesStatus === args.baseFacts.accessoriesStatus
    ) {
      facts.accessories = args.suggestedFacts.accessories
      facts.accessoriesStatus = args.suggestedFacts.accessories.length ? 'listed' : 'unknown'
    }
    await ctx.db.patch(args.id, {
      facts: cleanFacts(facts),
      factSources,
      aiSuggestion: args.suggestion,
      revision: item.revision + 1,
      updatedAt: Date.now(),
    })
    return record(ctx, (await ctx.db.get(args.id))!)
  },
})

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  }
  return btoa(binary)
}

export const analyzePhotos = action({
  args: { id: v.id('items') },
  handler: async (ctx, { id }): Promise<ItemRecord> => {
    const user = await requireAuth(ctx)
    const photoLimit = await rateLimiter.limit(ctx, 'analyzeItemPhotos', { key: user._id })
    if (!photoLimit.ok)
      throw new ConvexError(
        'A fotóelemzés kerete betelt. Próbáld újra ' +
          Math.max(1, Math.ceil(photoLimit.retryAfter / 60_000)) +
          ' perc múlva.'
      )
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    if (!key || !/^[a-zA-Z0-9.-]+$/.test(model)) {
      throw new ConvexError(
        'A képfelismerés most nem érhető el. A fotóid ettől még el vannak mentve.'
      )
    }
    const input = await ctx.runQuery(internal.items.analysisInput, { id, ownerId: user._id })
    try {
      const images = await Promise.all(
        input.previews.map(async (storageId) => {
          const blob = await ctx.storage.get(storageId)
          if (!blob || !blob.size || blob.size > MAX_PREVIEW) throw new Error('Invalid preview')
          return bytesToBase64(new Uint8Array(await blob.arrayBuffer()))
        })
      )
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: AbortSignal.timeout(45_000),
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: itemAnalysisPromptFor(input.facts, input.factSources) },
                  ...images.map((data) => ({ inline_data: { mime_type: 'image/jpeg', data } })),
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 2000,
              responseMimeType: 'application/json',
              responseJsonSchema: itemAnalysisResponseSchema,
            },
          }),
        }
      )
      if (!response.ok) throw new Error(`Provider ${response.status}`)
      const body = await response.text()
      if (body.length > 80_000) throw new Error('Response too large')
      const parts = JSON.parse(body)?.candidates?.[0]?.content?.parts
      const raw = parts?.find(
        (part: { text?: unknown; thought?: boolean }) =>
          typeof part.text === 'string' && !part.thought
      )?.text
      if (typeof raw !== 'string') throw new Error('No result')
      const parsed = parseItemAnalysis(JSON.parse(raw))
      const suggestion: ItemSuggestion = {
        model,
        analyzedAt: Date.now(),
        visibleDetails: parsed.visibleDetails,
        possibleDefects: parsed.possibleDefects,
        photo: parsed.photo,
      }
      return await ctx.runMutation(internal.items.applyAnalysis, {
        id,
        ownerId: user._id,
        photoIds: input.photoIds,
        baseFacts: {
          category: input.facts.category,
          title: input.facts.title,
          manufacturer: input.facts.manufacturer ?? '',
          model: input.facts.model ?? '',
          description: input.facts.description,
          aestheticNotes: input.facts.aestheticNotes,
          accessoriesStatus: input.facts.accessoriesStatus,
          accessories: input.facts.accessories,
        },
        suggestedFacts: {
          category: parsed.category,
          title: parsed.title,
          manufacturer: parsed.manufacturer,
          model: parsed.model,
          description: parsed.description,
          aestheticNotes: parsed.aestheticNotes,
          accessories: parsed.accessories,
        },
        suggestion,
      })
    } catch {
      console.error('[Item analysis] Failed', { model })
      throw new ConvexError(
        'A fotók elemzése nem sikerült. A képeid megmaradtak; próbáld újra később.'
      )
    }
  },
})

export const applyPriceResearch = internalMutation({
  args: {
    id: v.id('items'),
    ownerId: v.string(),
    baseManufacturer: v.string(),
    baseModel: v.string(),
    baseTitle: v.string(),
    suggestion: v.object({
      query: v.string(),
      manufacturer: v.optional(v.string()),
      searchEntryPoint: v.optional(v.string()),
      priceHuf: v.number(),
      lowHuf: v.number(),
      highHuf: v.number(),
      summary: v.string(),
      sources: v.array(v.object({ title: v.string(), url: v.string() })),
      researchedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id)
    if (!item || item.ownerId !== args.ownerId) throw new ConvexError('Nem található.')
    const facts = normalizedFacts(item.facts)
    if (
      facts.manufacturer !== args.baseManufacturer ||
      facts.model !== args.baseModel ||
      facts.title !== args.baseTitle
    )
      return record(ctx, item)
    const sources = { ...EMPTY_FACT_SOURCES, ...item.factSources }
    const researchedManufacturer = canonicalManufacturer(args.suggestion.manufacturer ?? '')
    const setManufacturer =
      Boolean(researchedManufacturer) &&
      sources.manufacturer !== 'seller' &&
      canonicalManufacturer(facts.manufacturer) !== researchedManufacturer
    const clearAiPrice = sources.priceHuf === 'ai'
    const nextFacts = {
      ...facts,
      ...(clearAiPrice ? { priceHuf: null } : {}),
      ...(setManufacturer ? { manufacturer: researchedManufacturer } : {}),
    }
    await ctx.db.patch(args.id, {
      facts: nextFacts,
      factSources: {
        ...sources,
        ...(clearAiPrice ? { priceHuf: 'unknown' as const } : {}),
        ...(setManufacturer ? { manufacturer: 'ai' as const } : {}),
      },
      priceSuggestion: args.suggestion,
      revision: item.revision + 1,
      updatedAt: Date.now(),
    })
    return record(ctx, (await ctx.db.get(args.id))!)
  },
})

type GeminiPart = { text?: unknown; thought?: boolean }
function responseText(parts: GeminiPart[] | undefined): string {
  return (parts ?? [])
    .filter((part) => typeof part.text === 'string' && !part.thought)
    .map((part) => String(part.text))
    .join('\n')
    .trim()
}

type GeminiGroundedResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] }
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { title?: unknown; uri?: unknown } }>
      searchEntryPoint?: { renderedContent?: unknown }
    }
  }>
}

export const researchPrice = action({
  args: { id: v.id('items') },
  handler: async (ctx, { id }): Promise<ItemRecord> => {
    const user = await requireAuth(ctx)
    const researchLimit = await rateLimiter.limit(ctx, 'researchItemPrice', { key: user._id })
    if (!researchLimit.ok)
      throw new ConvexError(
        'Az árkutatás kerete betelt. Próbáld újra ' +
          Math.max(1, Math.ceil(researchLimit.retryAfter / 60_000)) +
          ' perc múlva.'
      )
    const current = await ctx.runQuery(internal.items.ownerRecord, { id, ownerId: user._id })
    const identity = [current.facts.manufacturer, current.facts.model, current.facts.title]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (!current.facts.model.trim())
      throw new ConvexError('Az árkereséshez add meg a gyártót, a modellt vagy a tárgy nevét.')
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    if (!key || !/^[a-zA-Z0-9.-]+$/.test(model))
      throw new ConvexError('Az árkutatás most nem érhető el.')
    try {
      const groundedResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: AbortSignal.timeout(45_000),
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Keress megbízható webes forrásokat ehhez a használt tárgyhoz: ${identity}. Először hivatalos vagy elsődleges forrásból azonosítsd a gyártót vagy márkát, ha a pontos modellhez egyértelműen tartozik. Ha nincs márka, vagy nem egyértelmű, ezt mondd ki. Ezután keress jelenlegi magyar használtpiaci összehasonlító árakat kizárólag ugyanahhoz a pontos modellhez és generációhoz. Ne keverd a termékcsalád különböző generációit vagy modelljeit. Ha a generáció nem ismert és csak családszintű árak vannak, ne adj árat. Ne találj ki gyártót, modellt vagy árat. Rövid magyar bizonyíték-összefoglalót adj.`,
                  },
                ],
              },
            ],
            tools: [{ google_search: {} }],
          }),
        }
      )
      if (!groundedResponse.ok) throw new Error(`Search provider ${groundedResponse.status}`)
      const groundedBody = (await groundedResponse.json()) as GeminiGroundedResponse
      const groundedCandidate = groundedBody?.candidates?.[0]
      const evidence = responseText(groundedCandidate?.content?.parts)
      const chunks = groundedCandidate?.groundingMetadata?.groundingChunks ?? []
      const sources = chunks
        .map((chunk: { web?: { title?: unknown; uri?: unknown } }) => ({
          title: String(chunk?.web?.title ?? 'Forrás').slice(0, 160),
          url: String(chunk?.web?.uri ?? ''),
        }))
        .filter((source: { url: string }) => source.url.startsWith('https://'))
        .filter(
          (source, index, all) =>
            all.findIndex((candidate) => candidate.url === source.url) === index
        )
        .slice(0, 20)
      if (typeof evidence !== 'string' || !evidence.trim() || !sources.length)
        throw new Error('No grounded evidence')
      const extractionResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Kizárólag az alábbi webes bizonyítékból készíts strukturált eredményt. A manufacturer legyen üres, ha a gyártó nem egyértelmű vagy a tárgy márka nélküli. A priceHuf, lowHuf és highHuf legyen 0, ha nincs elég összehasonlítható magyar használtpiaci ár ugyanahhoz a pontos modellhez és generációhoz, vagy a bizonyíték csak egy többgenerációs termékcsalád árairól szól. Ne egészítsd ki saját tudással.\n\n${evidence}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseJsonSchema: {
                type: 'object',
                additionalProperties: false,
                required: ['manufacturer', 'priceHuf', 'lowHuf', 'highHuf', 'summary'],
                properties: {
                  manufacturer: { type: 'string' },
                  priceHuf: { type: 'integer' },
                  lowHuf: { type: 'integer' },
                  highHuf: { type: 'integer' },
                  summary: { type: 'string' },
                },
              },
            },
          }),
        }
      )
      if (!extractionResponse.ok)
        throw new Error(`Extraction provider ${extractionResponse.status}`)
      const extractionBody = (await extractionResponse.json()) as GeminiGroundedResponse
      const raw = responseText(extractionBody?.candidates?.[0]?.content?.parts)
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null
      const manufacturer = String(parsed?.manufacturer ?? '')
        .trim()
        .slice(0, 120)
      const rawPrice = Number(parsed?.priceHuf)
      const rawLow = Number(parsed?.lowHuf)
      const rawHigh = Number(parsed?.highHuf)
      const validPrice =
        Number.isSafeInteger(rawPrice) &&
        rawPrice > 0 &&
        rawPrice <= 999_999_999 &&
        Number.isSafeInteger(rawLow) &&
        Number.isSafeInteger(rawHigh) &&
        rawLow > 0 &&
        rawLow <= rawPrice &&
        rawPrice <= rawHigh &&
        rawHigh <= 999_999_999
      if (!manufacturer && !validPrice) throw new Error('No grounded result')
      const suggestion: PriceSuggestion = {
        query: identity,
        manufacturer,
        searchEntryPoint: String(
          groundedCandidate?.groundingMetadata?.searchEntryPoint?.renderedContent ?? ''
        ).slice(0, 20_000),
        priceHuf: validPrice ? rawPrice : 0,
        lowHuf: validPrice ? rawLow : 0,
        highHuf: validPrice ? rawHigh : 0,
        summary: String(parsed?.summary ?? '').slice(0, 500),
        sources,
        researchedAt: Date.now(),
      }
      return await ctx.runMutation(internal.items.applyPriceResearch, {
        id,
        ownerId: user._id,
        baseManufacturer: current.facts.manufacturer,
        baseModel: current.facts.model,
        baseTitle: current.facts.title,
        suggestion,
      })
    } catch {
      throw new ConvexError(
        'Nem találtunk elég megbízható, hivatkozható árat. Az árat kézzel is megadhatod.'
      )
    }
  },
})

export const correctDescription = action({
  args: { id: v.id('items'), text: v.string() },
  handler: async (ctx, { id, text }) => {
    const user = await requireAuth(ctx)
    await ctx.runQuery(internal.items.ownerRecord, { id, ownerId: user._id })
    const original = text.trim().slice(0, 5000)
    if (!original) throw new ConvexError('Előbb írj le néhány tényt.')
    const correctionLimit = await rateLimiter.limit(ctx, 'correctItemText', { key: user._id })
    if (!correctionLimit.ok)
      throw new ConvexError(
        'A szövegjavítás kerete betelt. Próbáld újra ' +
          Math.max(1, Math.ceil(correctionLimit.retryAfter / 60_000)) +
          ' perc múlva.'
      )
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    if (!key || !/^[a-zA-Z0-9.-]+$/.test(model))
      throw new ConvexError('A szövegjavítás most nem érhető el.')
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Javítsd a következő magyar használtcikk-leírás helyesírását és tömörítsd felsorolássá. Semmilyen tényt, számot, tagadást, hibát vagy jelentést ne adj hozzá és ne vegyél el. Csak a javított szöveget add vissza.\n\n${original}`,
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 1200 },
          }),
        }
      )
      if (!response.ok) throw new Error('Provider error')
      const body = (await response.json()) as GeminiGroundedResponse
      const suggestion = String(
        body?.candidates?.[0]?.content?.parts?.find(
          (part: GeminiPart) => typeof part.text === 'string' && !part.thought
        )?.text ?? ''
      )
        .trim()
        .slice(0, 5000)
      if (!suggestion || !protectedDetailsPreserved(original, suggestion))
        throw new Error('Meaning changed')
      return { original, suggestion }
    } catch {
      throw new ConvexError(
        'A javítás nem őrizte meg biztosan az eredeti jelentést. A szöveg változatlan maradt.'
      )
    }
  },
})

export const mediaMetadata = internalQuery({
  args: {
    photoId: v.string(),
    itemId: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    shareId: v.optional(v.string()),
    original: v.boolean(),
  },
  handler: async (ctx, a) => {
    const photoId = ctx.db.normalizeId('itemPhotos', a.photoId)
    const photo = photoId ? await ctx.db.get(photoId) : null
    if (!photo) return null
    if (a.shareId) {
      if (a.original) return null
      const publicationId = ctx.db.normalizeId('publications', a.shareId)
      const publication = publicationId ? await ctx.db.get(publicationId) : null
      const item = publication ? await ctx.db.get(publication.itemId) : null
      if (
        !publication ||
        !item ||
        item.shareId !== publication._id ||
        !publication.photoIds.includes(photo._id)
      )
        return null
    } else if (!a.ownerId || photo.ownerId !== a.ownerId || photo.itemId !== a.itemId) return null
    return {
      storageId: a.original ? photo.originalStorageId : photo.previewStorageId,
      contentType: a.original ? photo.contentType : 'image/jpeg',
    }
  },
})
