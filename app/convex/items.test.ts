import { describe, expect, it } from 'vitest'
import type { Id } from './_generated/dataModel'
import { api, components, internal } from './_generated/api'
import { EMPTY_FACTS } from '../src/lib/item-contract'
import { MAX_ORIGINAL } from './lib/itemValidators'
import { createAuthenticatedTest } from './test.utils'

const jpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 0, 0, 0, 0, 0, 0, 1, 2, 0xff, 0xd9,
])
const previewWithExif = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 1, 2, 0xff, 0xda, 0x00, 0x08, 0, 0, 0, 0, 0, 0, 3, 0xff, 0xd9,
])

const publishableFacts = {
  ...EMPTY_FACTS,
  title: 'Városi kerékpár',
  description: 'Megkímélt, de lánc-karcos.',
  priceHuf: 42_000,
  city: 'Budapest',
  pickupNote: 'XI. kerület',
  workingCondition: 'unknown' as const,
  defectsStatus: 'listed' as const,
  defects: ['karcos láncvédő'],
  contactKind: 'email' as const,
  contactValue: 'seller@example.com',
  privateNote: 'Kapukód: 1234',
}

async function createItemWithPhoto() {
  const test = await createAuthenticatedTest()
  const created = await test.asUser.mutation(api.items.create)
  const saved = await test.asUser.mutation(api.items.save, {
    id: created.id,
    expectedRevision: 0,
    facts: publishableFacts,
  })
  const originalStorageId = await test.t.run((ctx) =>
    ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
  )
  const previewStorageId = await test.t.run((ctx) =>
    ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
  )
  const photoId = await test.t.run((ctx) =>
    ctx.db.insert('itemPhotos', {
      itemId: created.id,
      ownerId: test.userId,
      originalStorageId,
      previewStorageId,
      name: 'private-original-name.jpg',
      contentType: 'image/jpeg',
      size: jpeg.byteLength,
      previewSize: jpeg.byteLength,
    })
  )
  return { ...test, id: created.id, saved, photoId, originalStorageId, previewStorageId }
}

async function otherAuthenticatedActor(
  t: Awaited<ReturnType<typeof createAuthenticatedTest>>['t']
) {
  const now = Date.now()
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: 'user',
      data: {
        name: 'Other Person',
        email: 'second@example.com',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    },
  })
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: 'session',
      data: {
        userId: user._id as string,
        token: `other-${user._id}`,
        expiresAt: now + 3_600_000,
        createdAt: now,
        updatedAt: now,
      },
    },
  })
  return t.withIdentity({
    subject: user._id as string,
    email: 'second@example.com',
    name: 'Other Person',
    sessionId: session._id as string,
  })
}

describe('items', () => {
  it('prefills a new draft with the signed-in seller email', async () => {
    const { asUser } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    expect(await asUser.query(api.items.get, { id: created.id })).toMatchObject({
      facts: { contactKind: 'email', contactValue: 'seller@example.com' },
    })
  })

  it('rejects authenticated accounts outside the seller allowlist', async () => {
    const { asUser } = await createAuthenticatedTest({ email: 'other@gmail.com' })
    await expect(asUser.mutation(api.items.create)).rejects.toThrow('Authentication required')
  })

  it('isolates owner records from anonymous and foreign sessions', async () => {
    const { t, asUser, id } = await createItemWithPhoto()
    expect(await asUser.query(api.items.get, { id })).toMatchObject({
      id,
      facts: { privateNote: 'Kapukód: 1234' },
    })
    await expect(t.query(api.items.get, { id })).rejects.toThrow()
    await expect((await otherAuthenticatedActor(t)).query(api.items.get, { id })).rejects.toThrow(
      'nem érhető el'
    )
  })

  it('does not expose drafts and blocks publication until the required facts and photo exist', async () => {
    const { asUser } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    await expect(
      asUser.mutation(api.items.publish, { id: created.id, expectedRevision: 0 })
    ).rejects.toThrow('Adj rövid címet')
    expect(await asUser.query(api.items.getPublic, { shareId: 'not-a-share' })).toBeNull()
  })

  it('publishes only the allowlisted snapshot and public preview media', async () => {
    const { t, asUser, id, saved, originalStorageId } = await createItemWithPhoto()
    const published = await asUser.mutation(api.items.publish, {
      id,
      expectedRevision: saved.revision,
    })
    const publicItem = await t.query(api.items.getPublic, { shareId: published.shareId! })
    expect(publicItem).toMatchObject({
      title: 'Városi kerékpár',
      status: 'active',
      photos: [{ name: 'Termékfotó' }],
    })
    expect(JSON.stringify(publicItem)).not.toContain('Kapukód')
    expect(JSON.stringify(publicItem)).not.toContain('private-original-name')
    expect(JSON.stringify(publicItem)).not.toContain(originalStorageId)
    const photoId = publicItem!.photos[0]!.id
    expect(
      await t.query(internal.items.mediaMetadata, {
        photoId,
        shareId: published.shareId!,
        original: true,
      })
    ).toBeNull()
    expect(
      await t.query(internal.items.mediaMetadata, {
        photoId,
        shareId: published.shareId!,
        original: false,
      })
    ).toMatchObject({ contentType: 'image/jpeg' })
  })

  it('keeps a public snapshot unchanged after editing until the seller republishes', async () => {
    const { asUser, id, saved } = await createItemWithPhoto()
    const published = await asUser.mutation(api.items.publish, {
      id,
      expectedRevision: saved.revision,
    })
    const edited = await asUser.mutation(api.items.save, {
      id,
      expectedRevision: published.revision,
      facts: { ...publishableFacts, title: 'Új cím' },
    })
    expect((await asUser.query(api.items.getPublic, { shareId: published.shareId! }))?.title).toBe(
      'Városi kerékpár'
    )
    await asUser.mutation(api.items.publish, { id, expectedRevision: edited.revision })
    expect((await asUser.query(api.items.getPublic, { shareId: published.shareId! }))?.title).toBe(
      'Új cím'
    )
  })

  it('flags a shared page as outdated until the seller refreshes it', async () => {
    const { asUser, id, saved } = await createItemWithPhoto()
    const published = await asUser.mutation(api.items.publish, {
      id,
      expectedRevision: saved.revision,
    })
    expect(published.publicationOutdated).toBe(false)
    const privateOnly = await asUser.mutation(api.items.save, {
      id,
      expectedRevision: published.revision,
      facts: { ...publishableFacts, privateNote: 'Csak nekem' },
    })
    expect(privateOnly.publicationOutdated).toBe(false)
    const edited = await asUser.mutation(api.items.save, {
      id,
      expectedRevision: privateOnly.revision,
      facts: { ...publishableFacts, privateNote: 'Csak nekem', priceHuf: 39_000 },
    })
    expect(edited.publicationOutdated).toBe(true)
    const refreshed = await asUser.mutation(api.items.publish, {
      id,
      expectedRevision: edited.revision,
    })
    expect(refreshed.publicationOutdated).toBe(false)
  })

  it('lets the seller confirm suggested facts without a revision conflict', async () => {
    const { t, asUser, id, saved } = await createItemWithPhoto()
    await t.run((ctx) =>
      ctx.db.patch(id, {
        factSources: {
          category: 'ai',
          title: 'ai',
          description: 'ai',
          city: 'location',
          manufacturer: 'unknown',
          model: 'ai',
          priceHuf: 'seller',
        },
      })
    )
    const confirmed = await asUser.mutation(api.items.confirmFacts, {
      id,
      keys: ['title', 'city'],
    })
    expect(confirmed.factSources).toMatchObject({
      title: 'seller',
      city: 'seller',
      description: 'ai',
      model: 'ai',
    })
    expect(confirmed.facts).toEqual(saved.facts)
    expect(confirmed.revision).toBe(saved.revision)
    const next = await asUser.mutation(api.items.save, {
      id,
      expectedRevision: saved.revision,
      facts: { ...publishableFacts, description: 'Átírt leírás' },
    })
    expect(next.factSources).toMatchObject({ title: 'seller', description: 'seller', model: 'ai' })
    await expect(
      (await otherAuthenticatedActor(t)).mutation(api.items.confirmFacts, { id, keys: ['model'] })
    ).rejects.toThrow('nem érhető el')
  })

  it('shows sold publicly and unpublish revokes the share', async () => {
    const { asUser, id, saved } = await createItemWithPhoto()
    const published = await asUser.mutation(api.items.publish, {
      id,
      expectedRevision: saved.revision,
    })
    await asUser.mutation(api.items.markSold, { id, sold: true })
    expect((await asUser.query(api.items.getPublic, { shareId: published.shareId! }))?.status).toBe(
      'sold'
    )
    await asUser.mutation(api.items.unpublish, { id })
    expect(await asUser.query(api.items.getPublic, { shareId: published.shareId! })).toBeNull()
  })

  it('rejects stale saves without losing the newer owner data', async () => {
    const { asUser, id, saved } = await createItemWithPhoto()
    const newer = await asUser.mutation(api.items.save, {
      id,
      expectedRevision: saved.revision,
      facts: { ...publishableFacts, title: 'Első mentés' },
    })
    await expect(
      asUser.mutation(api.items.save, {
        id,
        expectedRevision: saved.revision,
        facts: { ...publishableFacts, title: 'Elveszne' },
      })
    ).rejects.toThrow('CONFLICT')
    expect(await asUser.query(api.items.get, { id })).toMatchObject({
      revision: newer.revision,
      facts: { title: 'Első mentés' },
    })
  })

  it('rejects foreign, duplicate, malformed, and oversized upload completion intents', async () => {
    const { t, asUser } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    const intent = await asUser.mutation(api.items.beginUpload, { id: created.id })
    const original = await t.run((ctx) =>
      ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }))
    )
    const preview = await t.run((ctx) =>
      ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
    )
    await expect(
      (await otherAuthenticatedActor(t)).action(api.items.completeUpload, {
        id: created.id,
        intentId: intent.intentId,
        originalStorageId: original,
        previewStorageId: preview,
        name: 'foreign.jpg',
      })
    ).rejects.toThrow('Érvénytelen feltöltési engedély')
    await expect(
      asUser.action(api.items.completeUpload, {
        id: created.id,
        intentId: intent.intentId,
        originalStorageId: original,
        previewStorageId: preview,
        name: 'bad.jpg',
      })
    ).rejects.toThrow('JPEG, PNG vagy WebP')
    await expect(
      asUser.action(api.items.completeUpload, {
        id: created.id,
        intentId: intent.intentId,
        originalStorageId: preview,
        previewStorageId: preview,
        name: 'same.jpg',
      })
    ).rejects.toThrow('külön fájl')
    const oversizeIntent = await asUser.mutation(api.items.beginUpload, { id: created.id })
    const oversize = await t.run((ctx) =>
      ctx.storage.store(new Blob([new Uint8Array(MAX_ORIGINAL + 1)], { type: 'image/jpeg' }))
    )
    const otherPreview = await t.run((ctx) =>
      ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
    )
    await expect(
      asUser.action(api.items.completeUpload, {
        id: created.id,
        intentId: oversizeIntent.intentId,
        originalStorageId: oversize,
        previewStorageId: otherPreview,
        name: 'large.jpg',
      })
    ).rejects.toThrow('legfeljebb 15 MB')
  })

  it('preserves original upload bytes, strips preview EXIF, and retries a completion idempotently', async () => {
    const { t, asUser } = await createAuthenticatedTest()
    const { id } = await asUser.mutation(api.items.create)
    const intent = await asUser.mutation(api.items.beginUpload, { id })
    const original = await t.run((ctx) =>
      ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
    )
    const preview = await t.run((ctx) =>
      ctx.storage.store(new Blob([previewWithExif], { type: 'image/jpeg' }))
    )
    const args = {
      id,
      intentId: intent.intentId,
      originalStorageId: original,
      previewStorageId: preview,
      name: 'a/b.jpg',
    }
    const first = await asUser.action(api.items.completeUpload, args)
    const retry = await asUser.action(api.items.completeUpload, args)
    expect(retry.photos).toHaveLength(1)
    expect(retry.photos[0]!.id).toBe(first.photos[0]!.id)
    const duplicateIntent = await asUser.mutation(api.items.beginUpload, { id })
    const duplicatePreview = await t.run((ctx) =>
      ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
    )
    await expect(
      asUser.action(api.items.completeUpload, {
        id,
        intentId: duplicateIntent.intentId,
        originalStorageId: original,
        previewStorageId: duplicatePreview,
        name: 'duplicate.jpg',
      })
    ).rejects.toThrow('már egy tárgyhoz tartozik')
    const originalBytes = await t.run(async (ctx) =>
      Array.from(new Uint8Array(await (await ctx.storage.get(original))!.arrayBuffer()))
    )
    expect(originalBytes).toEqual([...jpeg])
    const photoId = first.photos[0]!.id as Id<'itemPhotos'>
    const storedPhoto = await t.run((ctx) => ctx.db.get(photoId))
    expect(storedPhoto?.name).toBe('a_b.jpg')
    const cleanedPreviewBytes = await t.run(async (ctx) =>
      Array.from(
        new Uint8Array(await (await ctx.storage.get(storedPhoto!.previewStorageId))!.arrayBuffer())
      )
    )
    expect(cleanedPreviewBytes).not.toContain(0xe1)
  })

  it('keeps simultaneous completion retries to one photo and two retained blobs', async () => {
    const { t, asUser } = await createAuthenticatedTest()
    const { id } = await asUser.mutation(api.items.create)
    const intent = await asUser.mutation(api.items.beginUpload, { id })
    const originalStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
    )
    const previewStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob([previewWithExif], { type: 'image/jpeg' }))
    )
    const args = {
      id,
      intentId: intent.intentId,
      originalStorageId,
      previewStorageId,
      name: 'same-retry.jpg',
    }
    const [first, second] = await Promise.all([
      asUser.action(api.items.completeUpload, args),
      asUser.action(api.items.completeUpload, args),
    ])
    expect(first.photos).toHaveLength(1)
    expect(second.photos).toHaveLength(1)
    expect(first.photos[0]!.id).toBe(second.photos[0]!.id)
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('itemPhotos')
          .withIndex('by_item', (q) => q.eq('itemId', id))
          .collect()
      )
    ).toHaveLength(1)
    expect(await t.run((ctx) => ctx.db.system.query('_storage').collect())).toHaveLength(2)
  })

  it('prefills image-supported fields but never overwrites a seller edit', async () => {
    const { t, asUser, userId } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
    )
    const photoId = await t.run((ctx) =>
      ctx.db.insert('itemPhotos', {
        itemId: created.id,
        ownerId: userId,
        originalStorageId: storageId,
        previewStorageId: storageId,
        name: 'chair.jpg',
        contentType: 'image/jpeg',
        size: jpeg.byteLength,
        previewSize: jpeg.byteLength,
      })
    )
    const suggestion = {
      model: 'gemini-test',
      analyzedAt: 1,
      visibleDetails: ['barna'],
      possibleDefects: [],
      photo: { score: 80, ready: true, summary: 'Jó kép.', issues: [], suggestedAngles: [] },
    }
    const first = await t.mutation(internal.items.applyAnalysis, {
      id: created.id,
      ownerId: userId,
      photoIds: [photoId],
      baseFacts: {
        category: 'other',
        title: '',
        manufacturer: '',
        model: '',
        description: '',
        aestheticNotes: [],
        accessoriesStatus: 'unknown',
        accessories: [],
      },
      suggestedFacts: {
        category: 'furniture',
        title: 'Fa szék',
        manufacturer: '',
        model: '',
        description: 'Barna szék látható.',
        aestheticNotes: ['barna'],
        accessories: [],
      },
      suggestion,
    })
    expect(first).toMatchObject({
      facts: {
        category: 'furniture',
        title: 'Fa szék',
        accessoriesStatus: 'unknown',
        accessories: [],
      },
      factSources: { category: 'ai', title: 'ai', description: 'ai' },
      aiSuggestion: { model: 'gemini-test' },
    })
    const seller = await asUser.mutation(api.items.save, {
      id: created.id,
      expectedRevision: first.revision,
      facts: { ...first.facts, title: 'Saját cím' },
    })
    const delayed = await t.mutation(internal.items.applyAnalysis, {
      id: created.id,
      ownerId: userId,
      photoIds: [photoId],
      baseFacts: {
        category: 'furniture',
        title: 'Fa szék',
        manufacturer: '',
        model: '',
        description: 'Barna szék látható.',
        aestheticNotes: ['barna'],
        accessoriesStatus: 'unknown',
        accessories: [],
      },
      suggestedFacts: {
        category: 'furniture',
        title: 'Elveszne',
        manufacturer: '',
        model: '',
        description: 'Másik leírás.',
        aestheticNotes: [],
        accessories: ['Ülőpárna'],
      },
      suggestion,
    })
    expect(delayed.facts.title).toBe('Saját cím')
    expect(delayed.facts).toMatchObject({
      accessoriesStatus: 'listed',
      accessories: ['Ülőpárna'],
    })
    expect(delayed.factSources.title).toBe('seller')
    expect(delayed.revision).toBeGreaterThan(seller.revision)
  })

  it('lets stronger label evidence correct AI identity without later blank regression', async () => {
    const { t, userId, id, saved, photoId } = await createItemWithPhoto()
    const aiFacts = { ...saved.facts, manufacturer: 'logi', model: '' }
    await t.run(async (ctx) => {
      const item = await ctx.db.get(id)
      await ctx.db.patch(id, {
        facts: aiFacts,
        factSources: { ...item!.factSources!, manufacturer: 'ai', model: 'ai' },
      })
    })
    const suggestion = {
      model: 'gemini-test',
      analyzedAt: 1,
      visibleDetails: ['modellfelirat'],
      possibleDefects: [],
      photo: {
        score: 90,
        ready: true,
        summary: 'Címke olvasható.',
        issues: [],
        suggestedAngles: [],
      },
    }
    const corrected = await t.mutation(internal.items.applyAnalysis, {
      id,
      ownerId: userId,
      photoIds: [photoId],
      baseFacts: {
        category: aiFacts.category,
        title: aiFacts.title,
        manufacturer: 'logi',
        model: '',
        description: aiFacts.description,
        aestheticNotes: aiFacts.aestheticNotes,
        accessoriesStatus: aiFacts.accessoriesStatus,
        accessories: aiFacts.accessories,
      },
      suggestedFacts: {
        category: aiFacts.category,
        title: aiFacts.title,
        manufacturer: 'Logitech',
        model: 'MX Master 2S',
        description: aiFacts.description,
        aestheticNotes: aiFacts.aestheticNotes,
        accessories: aiFacts.accessories,
      },
      suggestion,
    })
    expect(corrected.facts).toMatchObject({ manufacturer: 'Logitech', model: 'MX Master 2S' })
    const retained = await t.mutation(internal.items.applyAnalysis, {
      id,
      ownerId: userId,
      photoIds: [photoId],
      baseFacts: {
        category: corrected.facts.category,
        title: corrected.facts.title,
        manufacturer: 'Logitech',
        model: 'MX Master 2S',
        description: corrected.facts.description,
        aestheticNotes: corrected.facts.aestheticNotes,
        accessoriesStatus: corrected.facts.accessoriesStatus,
        accessories: corrected.facts.accessories,
      },
      suggestedFacts: {
        category: corrected.facts.category,
        title: corrected.facts.title,
        manufacturer: '',
        model: '',
        description: corrected.facts.description,
        aestheticNotes: corrected.facts.aestheticNotes,
        accessories: corrected.facts.accessories,
      },
      suggestion,
    })
    expect(retained.facts).toMatchObject({ manufacturer: 'Logitech', model: 'MX Master 2S' })
  })

  it('adds a grounded manufacturer without replacing a seller price', async () => {
    const { t, asUser, userId } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    const saved = await asUser.mutation(api.items.save, {
      id: created.id,
      expectedRevision: 0,
      facts: { ...EMPTY_FACTS, model: 'Muse', title: 'Muse tárgy', priceHuf: 12_000 },
    })
    const researched = await t.mutation(internal.items.applyPriceResearch, {
      id: created.id,
      ownerId: userId,
      baseManufacturer: '',
      baseModel: 'Muse',
      baseTitle: 'Muse tárgy',
      suggestion: {
        query: 'Muse Muse tárgy',
        manufacturer: 'Példa Gyártó',
        priceHuf: 0,
        lowHuf: 0,
        highHuf: 0,
        summary: 'A gyártó forrásból azonosítható, összehasonlítható ár nincs.',
        sources: [{ title: 'Gyártói adatlap', url: 'https://example.com/muse' }],
        researchedAt: 1,
      },
    })
    expect(researched.facts).toMatchObject({ manufacturer: 'Példa Gyártó', priceHuf: 12_000 })
    expect(researched.factSources).toMatchObject({ manufacturer: 'ai', priceHuf: 'seller' })
    expect(researched.revision).toBeGreaterThan(saved.revision)
  })

  it('keeps an AI price recommendation separate from the seller price', async () => {
    const { t, asUser, userId } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    const saved = await asUser.mutation(api.items.save, {
      id: created.id,
      expectedRevision: 0,
      facts: { ...EMPTY_FACTS, model: 'MX Master 2S', title: 'Logitech egér' },
    })
    const researched = await t.mutation(internal.items.applyPriceResearch, {
      id: created.id,
      ownerId: userId,
      baseManufacturer: '',
      baseModel: 'MX Master 2S',
      baseTitle: 'Logitech egér',
      suggestion: {
        query: 'MX Master 2S Logitech egér',
        priceHuf: 18_000,
        lowHuf: 15_000,
        highHuf: 20_000,
        summary: 'Összehasonlítható magyar hirdetések alapján.',
        sources: [{ title: 'Példa hirdetés', url: 'https://example.com/mx-master' }],
        researchedAt: 1,
      },
    })
    expect(researched.facts.priceHuf).toBeNull()
    expect(researched.factSources.priceHuf).toBe('unknown')
    expect(researched.priceSuggestion?.priceHuf).toBe(18_000)
    expect(researched.revision).toBeGreaterThan(saved.revision)
  })

  it('analyzes every saved photo so later label evidence is included', async () => {
    const { t, asUser, userId } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    await t.run(async (ctx) => {
      for (let index = 0; index < 6; index++) {
        const originalStorageId = await ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
        const previewStorageId = await ctx.storage.store(new Blob([jpeg], { type: 'image/jpeg' }))
        await ctx.db.insert('itemPhotos', {
          itemId: created.id,
          ownerId: userId,
          originalStorageId,
          previewStorageId,
          name: `photo-${index + 1}.jpg`,
          contentType: 'image/jpeg',
          size: jpeg.byteLength,
          previewSize: jpeg.byteLength,
        })
      }
    })
    const input = await t.query(internal.items.analysisInput, { id: created.id, ownerId: userId })
    expect(input.photoIds).toHaveLength(6)
    expect(input.previews).toHaveLength(6)
  })

  it('uses network location only until the seller edits it', async () => {
    const { asUser } = await createAuthenticatedTest()
    const created = await asUser.mutation(api.items.create)
    const detected = await asUser.mutation(api.items.setDetectedCity, {
      id: created.id,
      city: 'Budapest',
    })
    expect(detected).toMatchObject({
      facts: { city: 'Budapest' },
      factSources: { city: 'location' },
    })
    const seller = await asUser.mutation(api.items.save, {
      id: created.id,
      expectedRevision: detected.revision,
      facts: { ...detected.facts, city: 'Budaörs' },
    })
    const ignored = await asUser.mutation(api.items.setDetectedCity, {
      id: created.id,
      city: 'Budapest',
    })
    expect(ignored.facts.city).toBe('Budaörs')
    expect(ignored.factSources.city).toBe('seller')
    expect(ignored.revision).toBe(seller.revision)
  })

  it('deletes an owned item, its publication, photos, and upload intents', async () => {
    const { t, asUser, userId, id, saved, originalStorageId, previewStorageId } =
      await createItemWithPhoto()
    const published = await asUser.mutation(api.items.publish, {
      id,
      expectedRevision: saved.revision,
    })
    await t.run((ctx) =>
      ctx.db.insert('itemUploadIntents', {
        itemId: id,
        ownerId: userId,
        expiresAt: Date.now() + 60_000,
      })
    )
    await expect(asUser.mutation(api.items.deleteItem, { id })).resolves.toEqual({ deleted: true })
    expect(await asUser.query(api.items.getPublic, { shareId: published.shareId! })).toBeNull()
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull()
    expect(await t.run((ctx) => ctx.storage.get(originalStorageId))).toBeNull()
    expect(await t.run((ctx) => ctx.storage.get(previewStorageId))).toBeNull()
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('itemPhotos')
          .withIndex('by_item', (q) => q.eq('itemId', id))
          .collect()
      )
    ).toEqual([])
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('itemUploadIntents')
          .withIndex('by_item', (q) => q.eq('itemId', id))
          .collect()
      )
    ).toEqual([])
  })
})
