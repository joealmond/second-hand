import { createFileRoute } from '@tanstack/react-router'
import { getToken } from '@/lib/auth-server'
import { env } from '@/lib/env'

export const Route = createFileRoute('/api/media')({
  server: { handlers: { GET: async ({ request }) => {
    const incoming = new URL(request.url)
    const target = new URL('/media', env.VITE_CONVEX_SITE_URL)
    for (const key of ['itemId', 'photoId', 'shareId', 'original']) {
      const value = incoming.searchParams.get(key)
      if (value) target.searchParams.set(key, value)
    }
    const headers = new Headers()
    if (!target.searchParams.has('shareId')) {
      const token = await getToken()
      if (!token) return new Response('Nem található.', { status: 404 })
      headers.set('Authorization', `Bearer ${token}`)
    }
    const result = await fetch(target, { headers })
    return new Response(result.body, { status: result.status, headers: {
      'Content-Type': result.headers.get('Content-Type') || 'text/plain',
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    } })
  } } },
})
