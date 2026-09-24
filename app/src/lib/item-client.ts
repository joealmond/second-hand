import { useConvex } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useMemo } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { FactSourceKey, ItemFacts, ItemRecord, Posting, PublicItem } from './item-contract'

// The generated API is refreshed by `convex dev`; keeping the transport here
// means the screens only depend on the portable item contract.
export type SaveConflict = Error & { code?: string }

export interface ItemClient {
  list(): Promise<ItemRecord[]>
  get(id: string): Promise<ItemRecord | null>
  create(): Promise<{ id: string }>
  save(id: string, expectedRevision: number, facts: ItemFacts): Promise<ItemRecord>
  confirmFacts(id: string, keys: FactSourceKey[]): Promise<ItemRecord>
  publish(id: string, expectedRevision: number): Promise<ItemRecord>
  unpublish(id: string): Promise<ItemRecord>
  markSold(id: string, sold: boolean): Promise<ItemRecord>
  setPosting(id: string, posting: Omit<Posting, 'updatedAt'>): Promise<ItemRecord>
  deletePhoto(id: string, photoId: string): Promise<ItemRecord>
  deleteItem(id: string): Promise<{ deleted: boolean }>
  analyzePhotos(id: string): Promise<ItemRecord>
  researchPrice(id: string): Promise<ItemRecord>
  correctDescription(id: string, text: string): Promise<{ original: string; suggestion: string }>
  setDetectedCity(id: string, city: string): Promise<ItemRecord>
  beginUpload(
    id: string
  ): Promise<{ originalUploadUrl: string; previewUploadUrl: string; intentId: string }>
  completeUpload(args: {
    id: string
    intentId: string
    originalStorageId: string
    previewStorageId: string
    name: string
  }): Promise<ItemRecord>
  getPublic(shareId: string): Promise<PublicItem | null>
}

export function useItemClient(): ItemClient {
  const convex = useConvex()
  return useMemo(
    () => ({
      list: () => convex.query(api.items.list, {}),
      get: (id) => convex.query(api.items.get, { id: id as Id<'items'> }),
      create: () => convex.mutation(api.items.create, {}),
      save: (id, expectedRevision, facts) =>
        convex.mutation(api.items.save, { id: id as Id<'items'>, expectedRevision, facts }),
      confirmFacts: (id, keys) =>
        convex.mutation(api.items.confirmFacts, { id: id as Id<'items'>, keys }),
      publish: (id, expectedRevision) =>
        convex.mutation(api.items.publish, { id: id as Id<'items'>, expectedRevision }),
      unpublish: (id) => convex.mutation(api.items.unpublish, { id: id as Id<'items'> }),
      markSold: (id, sold) => convex.mutation(api.items.markSold, { id: id as Id<'items'>, sold }),
      setPosting: (id, posting) =>
        convex.mutation(api.items.setPosting, { id: id as Id<'items'>, ...posting }),
      deletePhoto: (id, photoId) =>
        convex.mutation(api.items.deletePhoto, {
          id: id as Id<'items'>,
          photoId: photoId as Id<'itemPhotos'>,
        }),
      deleteItem: (id) => convex.mutation(api.items.deleteItem, { id: id as Id<'items'> }),
      analyzePhotos: (id) => convex.action(api.items.analyzePhotos, { id: id as Id<'items'> }),
      researchPrice: (id) => convex.action(api.items.researchPrice, { id: id as Id<'items'> }),
      correctDescription: (id, text) =>
        convex.action(api.items.correctDescription, { id: id as Id<'items'>, text }),
      setDetectedCity: (id, city) =>
        convex.mutation(api.items.setDetectedCity, { id: id as Id<'items'>, city }),
      beginUpload: (id) => convex.mutation(api.items.beginUpload, { id: id as Id<'items'> }),
      completeUpload: (args) =>
        convex.action(api.items.completeUpload, {
          ...args,
          id: args.id as Id<'items'>,
          intentId: args.intentId as Id<'itemUploadIntents'>,
          originalStorageId: args.originalStorageId as Id<'_storage'>,
          previewStorageId: args.previewStorageId as Id<'_storage'>,
        }),
      getPublic: (shareId) => convex.query(api.items.getPublic, { shareId }),
    }),
    [convex]
  )
}

export function isRevisionConflict(error: unknown): boolean {
  const message = itemErrorMessage(error)
  return /revision|conflict|változott/i.test(message)
}

// Convex hides stack/message detail in production but preserves intentional
// application errors in data. Reuse the starter's error-display convention.
export function itemErrorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === 'string') return error.data
  return error instanceof Error ? error.message : String(error)
}
