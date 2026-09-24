import { createRootRouteWithContext, useRouteContext, useRouterState } from '@tanstack/react-router'
import { Outlet, HeadContent, Scripts } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import type { AuthClient } from '@convex-dev/better-auth/react'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PwaInstall } from '@/components/PwaInstall'
import { authClient } from '@/lib/auth-client'
import { getToken } from '@/lib/auth-server'
import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'

import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/figtree'
import '../styles/globals.css'

// Get auth information for SSR using available cookies
const getAuth = createServerFn({ method: 'GET' }).handler(async () => {
  return await getToken()
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Tovább — használt tárgyak' },
      {
        name: 'description',
        content:
          'Fotózd le a tárgyat, mi segítünk kész hirdetést írni belőle – őszintén, a hibáival együtt.',
      },
      { name: 'theme-color', content: '#F2F8F7' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Tovább' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icons/tovabb-192.png' },
    ],
  }),
  beforeLoad: async (ctx) => {
    const token = await getAuth()

    // All queries, mutations and actions through TanStack Query will be
    // authenticated during SSR if we have a valid token
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    }

    return {
      isAuthenticated: !!token,
      token,
    }
  },
  component: RootComponent,
})

function RootComponent() {
  const context = useRouteContext({ from: Route.id })
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      // The provider's public union type cannot preserve Better Auth's plugin
      // inference, although this client includes the required Convex plugin.
      authClient={authClient as unknown as AuthClient}
      initialToken={context.token}
    >
      <html lang="hu">
        <head>
          <HeadContent />
        </head>
        <body>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          <Toaster position="top-center" toastOptions={{ className: 'toast' }} />
          <PwaInstall showInstallHelp={pathname === '/'} />
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  )
}
