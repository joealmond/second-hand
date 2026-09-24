import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { authComponent, createAuth } from './auth'
import { internal } from './_generated/api'
import { requireAuth } from './lib/authHelpers'

const http = httpRouter()

http.route({
  path: '/media',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const params = new URL(request.url).searchParams
    const shareId = params.get('shareId') || undefined
    const user = shareId ? null : await requireAuth(ctx).catch(() => null)
    const metadata = await ctx.runQuery(internal.items.mediaMetadata, {
      photoId: params.get('photoId') || '',
      itemId: params.get('itemId') || undefined,
      shareId,
      ownerId: user?._id,
      original: params.get('original') === '1',
    })
    if (!metadata) return new Response('Nem található.', { status: 404 })
    const blob = await ctx.storage.get(metadata.storageId)
    if (!blob) return new Response('Nem található.', { status: 404 })
    return new Response(blob, {
      headers: {
        'Content-Type': metadata.contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }),
})

// Health check endpoint for monitoring
http.route({
  path: '/api/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: 'ok',
        layer: 'convex',
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }),
})

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth)

export default http
