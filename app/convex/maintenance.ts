import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation } from './_generated/server'

const BATCH_SIZE = 100

export const deleteExpiredData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const intents = await ctx.db.query('uploadIntents').withIndex('by_expiry', (query) => query.lt('expiresAt', now)).take(BATCH_SIZE)
    for (const intent of intents) await ctx.db.delete(intent._id)

    const expiredMessages: Array<never> = []
    if (intents.length === BATCH_SIZE || expiredMessages.length === BATCH_SIZE) await ctx.scheduler.runAfter(0, internal.maintenance.deleteExpiredData)
  },
})

export const deleteUserDataBatch = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const files = await ctx.db.query('files').withIndex('by_uploader', (query) => query.eq('uploadedBy', userId)).take(BATCH_SIZE)
    for (const file of files) { await ctx.storage.delete(file.storageId); await ctx.db.delete(file._id) }
    const intents = await ctx.db.query('uploadIntents').withIndex('by_user', (query) => query.eq('userId', userId)).take(BATCH_SIZE)
    for (const intent of intents) await ctx.db.delete(intent._id)
    const usage = await ctx.db.query('fileUsage').withIndex('by_user', (query) => query.eq('userId', userId)).unique()
    if (usage) await ctx.db.delete(usage._id)

    const messages: Array<never> = []
    if (files.length === BATCH_SIZE || messages.length === BATCH_SIZE || intents.length === BATCH_SIZE) await ctx.scheduler.runAfter(0, internal.maintenance.deleteUserDataBatch, { userId })
  },
})
