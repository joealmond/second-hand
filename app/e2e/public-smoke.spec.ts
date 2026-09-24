import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test as base, type Page, type BrowserContext } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'

const photoFixture = 'public/icons/tovabb-512.png'
const privateMarker = 'CSA KÉSZÍTŐI JEGYZET 7f32'

// Reuse one real anonymous seller session across sequential tests. This exercises
// repeat-item use without manufacturing signups that hit auth's signup limiter.
const test = base.extend<
  object,
  { ownerState: Awaited<ReturnType<BrowserContext['storageState']>> }
>({
  ownerState: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      await page.goto(process.env.E2E_BASE_URL || 'http://127.0.0.1:3000')
      await page.getByRole('button', { name: 'Új tárgy' }).click()
      await expect(page).toHaveURL(/\/item\//)
      const state = await context.storageState()
      await context.close()
      await use(state)
    },
    { scope: 'worker' },
  ],
  storageState: async ({ ownerState }, use) => {
    await use(ownerState)
  },
})

async function createDraft(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Új tárgy', exact: true }).click()
  await expect(page).toHaveURL(/\/item\//)
  await expect(page.getByText('Mentve', { exact: true })).toBeVisible()
}

async function addPhotoAndFacts(page: Page) {
  await page.getByLabel('Galériából', { exact: true }).setInputFiles([photoFixture, photoFixture])
  await expect(page.locator('.photo-grid img')).toHaveCount(2, { timeout: 30_000 })
  await expect(page.locator('.ai-progress')).toBeHidden({ timeout: 60_000 })
  await page.getByLabel('Cím', { exact: true }).fill('Csepel városi kerékpár')
  await page.getByLabel('Ár', { exact: true }).fill('42000')
  await page.getByLabel('Település', { exact: true }).fill('Budapest XI.')
  await page.getByLabel('Nem próbáltam ki').check()
  await page.getByLabel('Igen, leírom').check()
  await page.getByLabel('1. ismert hiba').fill('Karcos láncvédő')
  await page.getByLabel('E-mail-cím', { exact: true }).fill('test@example.com')
  await page.getByRole('button', { name: 'Hozzáadás', exact: true }).click()
  await page.getByLabel('Privát jegyzet', { exact: true }).fill(privateMarker)
  await expect(page.getByText('Mentve', { exact: true })).toBeVisible()
}

async function publish(page: Page) {
  await page.getByRole('button', { name: 'Előnézet és feladás' }).click()
  await expect(page.getByText('Minden megvan a feladáshoz.')).toBeVisible()
  await page.getByRole('button', { name: 'Link létrehozása' }).click()
  const dialog = page.getByRole('dialog', { name: 'Létrehozod a linket?' })
  await expect(
    dialog.getByText('A privát jegyzeted és az eredeti fotók nem látszanak.')
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Link létrehozása' }).click()
  const buyerLink = page.getByRole('link', { name: 'Hirdetésoldal megnyitása' })
  await expect(buyerLink).toBeVisible()
  return await buyerLink.getAttribute('href')
}

test('anonymous owner can publish, update, revoke, and export a private-preserving item', async ({
  browser,
  page,
}, testInfo) => {
  await createDraft(page)
  await addPhotoAndFacts(page)
  const publicPath = await publish(page)
  expect(publicPath).toMatch(/^\/p\//)
  await page.getByRole('link', { name: 'Hirdetésoldal megnyitása' }).click()
  await expect(page).toHaveURL(/\/p\//)
  await expect(page.locator('.public-header')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Vissza', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Vissza', exact: true }).click()
  await expect(page).toHaveURL(/\/item\//)
  await page.getByRole('link', { name: 'Szerkesztés' }).click()

  const buyerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const buyer = await buyerContext.newPage()
  await buyer.goto(publicPath!)
  await expect(buyer.getByRole('heading', { name: 'Csepel városi kerékpár' })).toBeVisible()
  await expect(buyer.getByText('Karcos láncvédő')).toBeVisible()
  await expect(buyer.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    /Csepel városi kerékpár/
  )
  await expect(buyer.locator('meta[property="og:image"]')).toHaveCount(1)
  await buyer.setViewportSize({ width: 390, height: 844 })
  await buyer.getByRole('button', { name: 'Következő fotó' }).first().click()
  await expect(buyer.getByRole('button', { name: 'Előző fotó' }).first()).toBeEnabled()
  await buyer.getByRole('button', { name: '2. fotó nagyítása' }).click()
  const viewer = buyer.getByRole('dialog', { name: 'Fotók' })
  await expect(viewer.getByText('2 / 2')).toBeVisible()
  await viewer.getByRole('button', { name: 'Előző fotó' }).click()
  await expect(viewer.getByText('1 / 2')).toBeVisible()
  await viewer.getByRole('button', { name: 'Bezárás' }).click()
  const serverHtml = await (await buyer.request.get(publicPath!)).text()
  expect(serverHtml).toContain('og:image')
  expect(serverHtml).toContain('mailto:test@example.com')
  expect(serverHtml).not.toContain(privateMarker)
  expect(await buyer.content()).not.toContain(privateMarker)
  const publicImage = await buyer.locator('.public-gallery img').first().getAttribute('src')
  expect(publicImage).toBeTruthy()
  expect((await buyer.request.get(`${publicImage}&original=1`)).status()).toBe(404)

  const expectedHash = createHash('sha256').update(readFileSync(photoFixture)).digest('hex')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Letöltés (ZIP)' }).click()
  const download = await downloadPromise
  const zipPath = testInfo.outputPath(await download.suggestedFilename())
  await download.saveAs(zipPath)
  const archive = unzipSync(readFileSync(zipPath))
  expect(strFromU8(archive['manifest.json']!)).toContain(privateMarker)
  for (const file of ['listing.md', 'jofogas.txt', 'facebook.txt'])
    expect(strFromU8(archive[file]!)).not.toContain(privateMarker)
  const originalEntry = Object.entries(archive).find(([name]) => name.startsWith('originals/'))
  expect(originalEntry).toBeDefined()
  expect(createHash('sha256').update(originalEntry![1]).digest('hex')).toBe(expectedHash)

  await page.getByRole('button', { name: 'További műveletek' }).click()
  await page.getByRole('menuitem', { name: 'Eladtam' }).click()
  await expect(buyer.getByText('Elkelt', { exact: true })).toBeVisible()
  const soldSheet = page.getByRole('dialog', { name: 'Eladva! Szép munka.' })
  await expect(soldSheet.getByText('Mostantól „Elkelt” felirat látszik rajta.')).toBeVisible()
  await soldSheet.getByRole('button', { name: 'Kész' }).click()
  await page.getByRole('button', { name: 'Link kikapcsolása' }).click()
  await expect(buyer.getByRole('heading', { name: 'Ez a hirdetés már nem elérhető' })).toBeVisible()
  await buyerContext.close()
})

test('camera uses one in-app preview without a second system selector', async ({ page }) => {
  await createDraft(page)
  await expect(page.locator('input[capture]')).toHaveCount(0)
  await page
    .getByRole('region', { name: 'Fotók' })
    .getByRole('button', { name: 'Fotózás', exact: true })
    .click()
  const camera = page.getByRole('dialog', { name: 'Kamera' })
  await expect(camera).toBeVisible()
  const video = camera.getByLabel('Élő kamerakép')
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.videoWidth))
    .toBeGreaterThan(0)
  await camera.getByRole('button', { name: 'Fénykép készítése' }).click()
  await expect(camera.getByRole('button', { name: 'Kész · 1 fotó' })).toBeVisible()
  await camera.getByRole('button', { name: 'Fénykép készítése' }).click()
  await camera.getByRole('button', { name: 'Kész · 2 fotó' }).click()
  await expect(camera).toBeHidden()
  await expect(page.locator('.photo-grid img')).toHaveCount(2, { timeout: 30_000 })
  await expect(page.locator('.ai-progress')).toBeHidden({ timeout: 60_000 })
})

test('denied camera permission offers a direct gallery fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        throw new DOMException('denied', 'NotAllowedError')
      },
    })
  })
  await createDraft(page)
  await page
    .getByRole('region', { name: 'Fotók' })
    .getByRole('button', { name: 'Fotózás', exact: true })
    .click()
  const camera = page.getByRole('dialog', { name: 'Kamera' })
  await expect(camera.getByRole('alert')).toContainText('galériából')
  await camera.getByLabel('Fotó választása').setInputFiles(photoFixture)
  await expect(camera).toBeHidden()
  await expect(page.locator('.photo-grid img')).toHaveCount(1, { timeout: 30_000 })
})

test('narrow screens keep home, editor, details, and share controls within the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  // On phones the floating "Új tárgy" button goes straight to the camera.
  await expect(page.getByRole('button', { name: 'Új tárgy', exact: true })).toBeVisible()
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).resolves.toBe(true)
  await page.getByRole('button', { name: 'Új tárgy', exact: true }).click()
  const camera = page.getByRole('dialog', { name: 'Kamera' })
  await expect(camera).toBeVisible()
  await camera.getByRole('button', { name: 'Kamera bezárása' }).click()
  await expect(camera).toBeHidden()
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).resolves.toBe(true)
  await expect(page.getByLabel('Cím', { exact: true })).toBeEditable()
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).resolves.toBe(true)
  await page.getByRole('button', { name: 'Előnézet és feladás' }).click()
  await expect(page.getByRole('heading', { name: 'Hol hirdeted?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Link létrehozása' })).toBeVisible()
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).resolves.toBe(true)
})

test('a rejected follow-up upload leaves the valid photo and editable draft intact', async ({
  page,
}) => {
  await createDraft(page)
  await page.getByLabel('Galériából', { exact: true }).setInputFiles(photoFixture)
  await expect(page.locator('.photo-grid img')).toHaveCount(1, { timeout: 30_000 })
  await expect(page.locator('.ai-progress')).toBeHidden({ timeout: 60_000 })
  await page.getByLabel('Galériából', { exact: true }).setInputFiles({
    name: 'nem-foto.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  await expect(page.getByRole('alert')).toContainText('JPEG, PNG, WebP, HEIC vagy HEIF')
  await expect(page.locator('.photo-grid img')).toHaveCount(1)
  await page.getByLabel('Cím', { exact: true }).fill('Menthető a sikertelen feltöltés után')
  await expect(page.getByText('Mentve', { exact: true })).toBeVisible()
})

test('conflicting tabs preserve the local draft until the owner chooses a version', async ({
  page,
  context,
}) => {
  await createDraft(page)
  const second = await context.newPage()
  await second.goto(page.url())
  await expect(second.getByLabel('Cím', { exact: true })).toBeEditable()
  await page.getByLabel('Cím', { exact: true }).fill('Frissebb szerverváltozat')
  await expect(page.getByText('Mentve', { exact: true })).toBeVisible()
  await second.getByLabel('Cím', { exact: true }).fill('Megőrzendő helyi változat')
  await expect(second.getByText('Egy másik lapon is szerkesztetted', { exact: true })).toBeVisible()
  await second.getByRole('button', { name: 'Legfrissebb betöltése' }).click()
  await expect(second.getByText('Van egy korábbi, nem mentett piszkozatod.')).toBeVisible()
  expect(await second.evaluate(() => Object.values(sessionStorage).join(' '))).toContain(
    'Megőrzendő helyi változat'
  )
  await second.getByRole('button', { name: 'A piszkozatommal' }).click()
  await expect(second.getByText('Mentve', { exact: true })).toBeVisible()
  await second.reload()
  await expect(second.getByLabel('Cím', { exact: true })).toHaveValue('Megőrzendő helyi változat')
  await second.close()
})

test('a private editor URL explains a missing owner session', async ({ page, browser }) => {
  await createDraft(page)
  const otherContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const other = await otherContext.newPage()
  await other.goto(page.url())
  await expect(
    other.getByText('Ez a tárgy nem érhető el ebben a böngészőben.', { exact: false })
  ).toBeVisible()
  await expect(other.getByRole('button', { name: 'Vissza a tárgyakhoz' })).toBeVisible()
  await otherContext.close()
})
