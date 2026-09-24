# Tovább — first prototype

A Hungarian-first selling assistant: photos, a few confirmed facts, an editable preview, a buyer link, sold status and a portable ZIP.

## Try on your phone

[Open Tovább](https://tovabb-prototype-preview.jozsef-mandula.workers.dev). In Safari on iPhone, use Share → Add to Home Screen. In Chrome on Android, use Install or the browser menu → Add to Home screen. Install first, then sign in with an invited Google account. Seller data follows that account across browsers.

The hosted trial uses its own Convex backend in Ireland. Offline navigation shows a connection message; syncing, uploading and selling require internet. Private pages, auth, media and listing data are not put in the service-worker cache. Gemini analyzes private previews after capture to suggest the category, Hungarian title/description and better photo angles; originals are not sent. If AI is unavailable, the saved-photo and manual flow still works. [Checks and limitations](../docs/12-pwa-trial.md).

## Run locally

Node 24 is the tested runtime. From this directory:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. First startup downloads/initializes an anonymous local Convex backend and saves local configuration; later starts reuse it. No Convex cloud account is needed. Ports: web 3000, Convex API 3220, HTTP actions 3221. Keep the terminal running. The backend persists in `.convex/`; configuration and local session secret are in `.env.local`. Neither belongs in source control.

Seller access uses Google through Better Auth and the backend allowlist in `convex/lib/config.ts`. Existing anonymous trial drafts transfer when that same browser first signs in with an invited account. Local URLs cannot be sent to buyers on other machines as internet links. Do not expose this development backend publicly; the Convex CLI binds its backend ports on all interfaces.

Use “Kamera” for the app's live preview and shutter, or “Galériából” for the only system picker and multi-select. On iPhone, Chrome and Safari each require camera permission before capture works. JPEG, PNG, WebP, HEIC and HEIF originals are accepted (15 MB each; 8 per item). Originals remain unchanged; the separate JPEG preview has metadata removed on the backend.

Gemini pre-populates image-supported fields and gives post-shot photo guidance. AI provenance stays visible, possible defects remain unconfirmed, and seller edits always win. Coarse city/region can be filled from Cloudflare network data; precise GPS coordinates are not collected. Listing text still distinguishes these suggestions from seller-confirmed facts. Saved items have explicit edit and public-link actions. Deleting an item also revokes its buyer page and removes its stored photos. The buyer preview has a Back control that returns to the same editor step. Marketplace buttons copy text and record your own posting/removal report; they do not publish externally.

## Checks

```sh
npm run lint
npm run test
npm run typecheck
npm exec tsc -- --noEmit -p convex/tsconfig.json
npm run build
npm run test:e2e
```

See [the prototype evidence](../docs/11-prototype.md) for actual results, browser/physical-device limits and the next slice. The ZIP contains a versioned `manifest.json`, text variants and original bytes; it is a prototype export contract, not the legacy Python `ad.md` schema or a completed re-import feature.

## Source

- `src/components/ItemWorkspace.tsx`: seller flow and draft recovery
- `src/components/PublicItemPage.tsx`: buyer view
- `src/lib/item-contract.ts`: portable facts and deterministic copy
- `convex/items.ts`: owner-scoped records, uploads and publication snapshots
- `convex/http.ts` + `src/routes/api/media.ts`: authorized originals and published previews

Adapted from the locally inspected ConvexKit snapshot using its files-only scaffold. Its MIT license is retained in `LICENSE`. Application-level plans and guidance remain in the parent repository; copied starter documentation is historical reference.

## Rebuild the hosted trial

Use `.env.pwa.local` (see `.env.pwa.example`) for the hosted URLs; preserve `.env.local` for local development. The commands used for the trial were:

```sh
npm run typecheck:backend
npx convex deploy --env-file .env.pwa.local --typecheck enable --yes
CLOUDFLARE_ENV=preview CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_LOG_PATH=../output/wrangler npm run build -- --mode pwa
WRANGLER_LOG_PATH=../output/wrangler npx wrangler deploy --config dist/server/wrangler.json
E2E_PWA=1 E2E_BASE_URL=https://tovabb-prototype-preview.jozsef-mandula.workers.dev npm run test:e2e
```

Deployment commands write to the hosted trial and require account authorization. Its Better Auth secret lives in the backend; local `.env.backend-pwa.local` is untracked and must stay private. No key belongs in the manifest, service worker or public build. Bump the `tovabb-shell-*` cache version when changing offline shell assets; updates wait for an explicit reload action.

## Google sign-in setup

Create a Google OAuth web client and authorize these redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://tovabb-prototype-preview.jozsef-mandula.workers.dev/api/auth/callback/google`

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SITE_URL` on the matching Convex deployment. Then set `VITE_GOOGLE_AUTH_ENABLED=true` in the matching Vite environment file. The backend email allowlist remains authoritative. Set backend-only `SELLER_EMAILS` to a comma-separated list of verified invited Google email addresses before deploying this public source. `ADDITIONAL_SELLER_EMAILS` remains available for later invites. An empty allowlist denies all Google accounts. Do not put the invite list in `VITE_*` variables or the Worker.
