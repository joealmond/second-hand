import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  factSourcesValidator,
  itemFactsValidator,
  itemSuggestionValidator,
  postingValidator,
} from './lib/itemValidators'

export default defineSchema({
  items: defineTable({
    ownerId: v.string(),
    facts: itemFactsValidator,
    status: v.union(v.literal('draft'), v.literal('active'), v.literal('sold')),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    shareId: v.optional(v.id('publications')),
    postings: v.array(postingValidator),
    factSources: v.optional(factSourcesValidator),
    aiSuggestion: v.optional(itemSuggestionValidator),
    priceSuggestion: v.optional(
      v.object({
        query: v.string(),
        manufacturer: v.optional(v.string()),
        searchEntryPoint: v.optional(v.string()),
        priceHuf: v.number(),
        lowHuf: v.number(),
        highHuf: v.number(),
        summary: v.string(),
        sources: v.array(v.object({ title: v.string(), url: v.string() })),
        researchedAt: v.number(),
      })
    ),
  }).index('by_owner', ['ownerId']),
  itemPhotos: defineTable({
    itemId: v.id('items'),
    ownerId: v.string(),
    originalStorageId: v.id('_storage'),
    previewStorageId: v.id('_storage'),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    previewSize: v.number(),
  })
    .index('by_item', ['itemId'])
    .index('by_original', ['originalStorageId'])
    .index('by_preview', ['previewStorageId'])
    .index('by_owner', ['ownerId']),
  itemUploadIntents: defineTable({
    itemId: v.id('items'),
    ownerId: v.string(),
    expiresAt: v.number(),
    completedPhotoId: v.optional(v.id('itemPhotos')),
  })
    .index('by_owner', ['ownerId'])
    .index('by_item', ['itemId']),
  publications: defineTable({
    itemId: v.id('items'),
    facts: itemFactsValidator,
    photoIds: v.array(v.id('itemPhotos')),
    updatedAt: v.number(),
  }),

  // <convexkit:files>
  // File uploads example
  files: defineTable({
    storageId: v.id('_storage'),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    uploadedBy: v.optional(v.string()),
  })
    .index('by_uploader', ['uploadedBy'])
    .index('by_storage', ['storageId']),

  // Short-lived authorization records for the two-step direct upload flow.
  uploadIntents: defineTable({
    userId: v.string(),
    expiresAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_expiry', ['expiresAt']),

  // Transactionally maintained per-user quotas avoid an unbounded scan per upload.
  fileUsage: defineTable({
    userId: v.string(),
    totalBytes: v.number(),
    fileCount: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
  // </convexkit:files>
})
