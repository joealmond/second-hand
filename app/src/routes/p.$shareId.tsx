import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { ConvexHttpClient } from 'convex/browser'
import { z } from 'zod'
import { PublicItemPage } from '@/components/PublicItemPage'
import { api } from '@convex/_generated/api'
import { env } from '@/lib/env'

const loadPublicItem = createServerFn({ method: 'GET' })
  .validator(z.object({ shareId: z.string() }))
  .handler(async ({ data }) => {
    const item = await new ConvexHttpClient(env.VITE_CONVEX_URL, { logger: false }).query(
      api.items.getPublic,
      { shareId: data.shareId }
    )
    return { item, origin: new URL(getRequest().url).origin }
  })

export const Route = createFileRoute('/p/$shareId')({
  loader: async ({ params }) => {
    const result = await loadPublicItem({ data: { shareId: params.shareId } })
    if (!result.item) throw notFound()
    return result
  },
  notFoundComponent: () => <PublicItemPage shareId="" initialItem={null} />,
  head: ({ loaderData, params }) => {
    const item = loaderData?.item
    const url = `${loaderData?.origin ?? ''}/p/${params.shareId}`
    const image = item?.photos[0]
      ? `${loaderData?.origin}/api/media?shareId=${encodeURIComponent(params.shareId)}&photoId=${encodeURIComponent(item.photos[0].id)}`
      : undefined
    const title = item ? `${item.title} · Tovább` : 'Hirdetés nem található · Tovább'
    const description = item?.description || 'Ez a hirdetés már nem elérhető.'
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        ...(image ? [{ property: 'og:image', content: image }] : []),
      ],
    }
  },
  component: PublicRoute,
})
function PublicRoute() {
  const { shareId } = Route.useParams()
  const { item } = Route.useLoaderData()
  return <PublicItemPage shareId={shareId} initialItem={item} />
}
