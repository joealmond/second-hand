import { expect, test } from '@playwright/test'

test.skip(process.env.E2E_PWA !== '1', 'PWA checks require the built HTTPS trial (E2E_PWA=1).')

test('the HTTPS build exposes an installable manifest and an active service worker', async ({
  page,
  context,
}) => {
  const home = await page.goto('/')
  expect(home?.headers()['content-security-policy']).not.toContain('fonts.googleapis.com')
  expect(home?.headers()['content-security-policy']).not.toContain('fonts.gstatic.com')
  expect(await page.content()).not.toContain('fonts.googleapis.com')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest'
  )
  const response = await page.request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest).toMatchObject({
    name: 'Tovább — használt tárgyak',
    start_url: '/',
    scope: '/',
    display: 'standalone',
  })
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512'])
  )
  for (const icon of manifest.icons) {
    const image = await page.request.get(icon.src)
    expect(image.ok()).toBe(true)
    expect(image.headers()['content-type']).toContain('image/png')
  }
  const fontFamilies = await page.evaluate(async () => {
    await document.fonts.ready
    return Array.from(document.fonts).map((font) => font.family)
  })
  expect(fontFamilies).toContain('Figtree Variable')
  expect(fontFamilies).toContain('Bricolage Grotesque Variable')
  const worker = await page.request.get('/sw.js')
  expect(await worker.text()).toContain('tovabb-shell-v7')
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller))
  const cdp = await context.newCDPSession(page)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])
  await cdp.detach()
})

test('offline navigation is honest and the worker caches no private or API content', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller))
  const paths = await page.evaluate(async () => {
    const all = await caches.keys()
    const urls: string[] = []
    for (const key of all.filter((k) => k.startsWith('tovabb-shell-'))) {
      const cache = await caches.open(key)
      for (const request of await cache.keys()) urls.push(new URL(request.url).pathname)
    }
    return urls.sort()
  })
  expect(paths).toEqual(
    [
      '/favicon.svg',
      '/icons/tovabb-192.png',
      '/icons/tovabb-512.png',
      '/manifest.webmanifest',
      '/offline.html',
    ].sort()
  )
  await context.setOffline(true)
  try {
    await page.goto('/item/offline-probe')
    await expect(page.getByRole('heading', { name: 'Most nincs kapcsolat.' })).toBeVisible()
    await expect(page.getByText('internetkapcsolat kell.', { exact: false })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const apiFailed = await page.evaluate(async () => {
      try {
        await fetch('/api/media?photoId=offline-probe')
        return false
      } catch {
        return true
      }
    })
    expect(apiFailed).toBe(true)
  } finally {
    await context.setOffline(false)
  }
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Belépés Google-fiókkal' })).toBeEnabled()
})
