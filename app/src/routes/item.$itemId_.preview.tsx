import { createFileRoute } from '@tanstack/react-router'
import { ItemPreview } from '@/components/ItemWorkspace'
import { SellerGate } from '@/components/SellerGate'

export const Route = createFileRoute('/item/$itemId_/preview')({
  component: PreviewRoute,
})

function PreviewRoute() {
  const { itemId } = Route.useParams()
  return (
    <SellerGate>
      <ItemPreview itemId={itemId} />
    </SellerGate>
  )
}
