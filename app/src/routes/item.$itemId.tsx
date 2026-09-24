import { createFileRoute } from '@tanstack/react-router'
import { ItemEditor } from '@/components/ItemWorkspace'
import { SellerGate } from '@/components/SellerGate'

export const Route = createFileRoute('/item/$itemId')({ component: ItemRoute })
function ItemRoute() {
  const { itemId } = Route.useParams()
  return (
    <SellerGate>
      <ItemEditor itemId={itemId} />
    </SellerGate>
  )
}
