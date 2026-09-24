import { createFileRoute } from '@tanstack/react-router'

interface CloudflareRequest extends Request {
  cf?: { city?: string; region?: string }
}

export const Route = createFileRoute('/api/location')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const cf = (request as CloudflareRequest).cf
        const city = [cf?.city, cf?.region].filter(Boolean).join(', ').slice(0, 120)
        return Response.json(
          { city },
          {
            headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
          }
        )
      },
    },
  },
})
