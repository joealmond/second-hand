import { createFileRoute } from '@tanstack/react-router'
import { ItemHome } from '@/components/ItemWorkspace'
import { SellerGate } from '@/components/SellerGate'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <SellerGate>
      <ItemHome />
    </SellerGate>
  )
}
