const CACHE_NAME = 'tovabb-shell-v7'
const SHELL_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/tovabb-192.png',
  '/icons/tovabb-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('tovabb-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

function cachedResponse(response, fallbackMessage) {
  if (!response) return new Response(fallbackMessage, { status: 503 })
  // Cloudflare may cache a redirected static response (for example,
  // /offline.html -> /offline). A fresh Response removes redirect metadata,
  // making it safe to return for a navigation fallback.
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(request)
          .then((response) =>
            cachedResponse(response, 'Az oldal jelenleg nem érhető el kapcsolat nélkül.')
          )
      )
    )
    return
  }

  const isAssetPath =
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|mjs|map|json|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|pdf)$/i.test(url.pathname)
  if (request.mode !== 'navigate' || isAssetPath) return

  event.respondWith(
    fetch(request).catch(() =>
      caches
        .match('/offline.html')
        .then((response) =>
          cachedResponse(response, 'Most nincs kapcsolat. Kapcsolódás után töltsd újra az oldalt.')
        )
    )
  )
})
