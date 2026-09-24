# First prototype — implementation and evidence

Date: 2026-09-08. Status: LOCAL PROTOTYPE COMPLETE. Checklist: [roadmap](05-roadmap.md#first-working-prototype).

## Scope and decisions

Build the individual-item loop from the core plan: real photos → missing facts → editable preview → working buyer page/contact → sold state → export. Hungarian, mobile first, a bicycle-default flow plus a generic item category. No preloaded private ads or automatic external posting. Keep existing Python files and item records intact.

Use the local ConvexKit snapshot as a starting point in `app/`, recording its actual dependency versions. Reuse its installed dependency cache when safe. Run Convex in anonymous local mode; no paid service or remote deployment is needed to try the core flow. The local development backend is not a production hosting configuration. Public links on localhost work only while the development server is running and reachable.

Use explicit file ownership for delegation: orchestration/configuration/documentation, backend/domain, and frontend screens/styles. Root integrates and reviews boundaries. Thin Workflow remains ordinary repo guidance.

AI photo analysis is optional and must be visibly distinct from deterministic listing composition. No OpenAI key is currently present in the process environment. The flow must work with honest unknowns and editable facts without cloud AI; do not simulate successful image recognition. Implement only a bounded optional provider path if it can be verified without blocking the usable prototype.

For the local prototype, use Convex-managed storage with owner-authorized access to originals and separately published image derivatives; do not issue public original-file URLs. The previously proposed R2/Images production integration remains a later infrastructure change. Record this explicit prototype deviation rather than silently claiming R2 is integrated.

## Acceptance cases

- Create/import real photos, preserve original bytes, reject unsupported/oversize uploads with actionable feedback, and recover the saved draft after refresh.
- Ask condition/defects, price and approximate pickup location; retain unknowns, never equate missing defects with flawless, and keep defects in every copy/export variant.
- Edit title/text and facts without a delayed save or generation overwriting newer edits; show save/errors and permit recovery.
- Private draft/images are inaccessible to a second session. Publishing explicitly selects buyer-visible content and contact; drafts/private notes never appear in public responses.
- Buyer opens a forwarded page without an app login and gets a usable seller-approved contact route; mark sold updates that page, unshare revokes app-served visibility.
- Copy Jófogás/Facebook text without claiming successful marketplace posting. Record seller-reported posting/removal separately.
- Export an item package containing versioned facts, listing text and unchanged originals; verify archive contents and public/private separation.
- Browser checks at desktop and narrow mobile widths include upload → edit → refresh → publish → buyer page → sold → export, plus failures/empty states; inspect screenshots for overflow and obscured controls.
- Run receiving-runtime backend validation, domain/backend tests, application typecheck/build, and existing Python read-only validation. Log checks under `output/` with exact counts and limitations.

## Evidence

Implementation checked on 2026-09-08 with Node 24.15.0, npm 11.12.1, React 19.2.8, TanStack Start 1.168.49, Convex 1.45.0, Better Auth 1.6.30, Vite 8.2.2 and Wrangler 4.129.0. The files-only scaffold used the current local ConvexKit snapshot, including its uncommitted source; the application has its own installed dependencies and lockfile (no dependency symlinks). No Git metadata is present here.

Source identity: SHA-256 `beddb148b0d63bae6239faf1ce06d4e52f5cd3ec55c5f3c839b84e15a5c50634` across 70 source/config/lock files. [Build identity](../output/prototype-build-identity.json).

| Status | Evidence |
|---|---|
| PASS | Anonymous local Convex/Better Auth session, persistent item data, Vite/workerd app running at `http://127.0.0.1:3000`. [Startup instructions](../app/README.md), [server log](../output/dev.log). |
| PASS | `npm run check`: lint, 8 test files / 34 tests, app TypeScript check, client and Worker SSR build. [Full final log](../output/final-check.log). |
| PASS | Receiving backend runtime: `npm exec tsc -- --noEmit -p convex/tsconfig.json`; anonymous local Convex successfully bundles/pushes the application functions. [Backend typecheck log](../output/backend-typecheck.log). |
| PASS | `E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e`: 5 Chromium scenarios / 5 passed. Publish/contact/SSR metadata, private-data exclusion, original access denial, exact original ZIP hash, live sold/revoke, mobile overflow, failed-upload recovery, cross-tab conflict recovery, missing-owner-session explanation. [Full browser log](../output/e2e.log), [maintained scenarios](../app/e2e/public-smoke.spec.ts). |
| PASS | CLI browser checks additionally exercised upload, publication immediately after editing, refresh recovery, and a populated 390px preview with document width 390px. [Flow log](../output/playwright/fill-and-publish.log), [mobile preview](../output/playwright/editor-mobile.png). |
| PASS | Independent buyer browser: contact link, server metadata, decoded preview, denial of original-file access, ZIP download, seller-reported posting, live sold/unshare and revoked-media 404. [Buyer log](../output/playwright/buyer-export.log), [buyer mobile screenshot](../output/playwright/buyer-mobile.png). ZIP bytes were also compared with the source using Python SHA-256. |
| PASS | Existing Python validation remains 3 valid ads / 0 errors. [Log](../output/python-check.log). Pillow was unavailable; this was a read-only metadata check. |
| PASS | Independent static review found and led to fixes for save retries, conflict recovery, partially completed upload batches, missing link revocation and seller-reported marketplace controls. Focused follow-up confirmed those fixes; runtime regression tests cover the consequential paths. |
| NOT RUN | Physical iPhone/Android capture, HEIC conversion, native OS share chooser and messaging-app rich-preview fetching. Browser viewport emulation is not device evidence. |
| NOT RUN | Live AI image recognition, R2/Cloudflare Images integration, internet deployment, real marketplace publication, seller/host pilot, payment or commercial-demand validation. |

The browser fixture is the existing JPEG marked `TESZT01` under the bicycle example, not a photograph proving visual recognition. Browser decoding and byte preservation were exercised; image understanding was not. No private ad records were migrated or publicly deployed. Browser test records belong to separate anonymous local sessions; published automated-test links are revoked by the successful lifecycle test. Local logs, test exports, browser state and the database are ignored by source control.

## Deliberate limits and next slice

- No AI provider is connected. Listing text is deterministic composition of seller-confirmed facts; the UI does not claim photo recognition. The configured model/provider path remains future work.
- Draft ownership is tied to the anonymous browser session. Saved items survive server restarts; unsaved edits use per-tab `sessionStorage` for refresh recovery, avoiding one tab erasing another's draft. Clearing browser credentials loses access without a future account/recovery feature; export important records first.
- Exports contain `manifest.json`, `listing.md`, Jófogás/Facebook text and unchanged original files. This is a versioned prototype package, not the existing Python `ad.md` contract; re-import and migration are not implemented.
- The app is local only. Vite binds to loopback; the Convex CLI binds its API/HTTP ports on all interfaces and offers no supported bind flag in the inspected CLI. Keep this development backend on a trusted development machine; it is not a public hosting configuration.
- Browser tests reuse one real anonymous seller session across sequential cases, while buyer contexts explicitly have no session. This avoids hitting signup rate limits without disabling them.
- JPEG/PNG/WebP are supported. The original remains unchanged; a separate canvas JPEG is sanitized again on the backend. HEIC conversion, advanced photo guidance and full offline photo sync remain unimplemented.
- Community collections, helper delegation, dealer batch tools, public hosting/account recovery and a live AI adapter are subsequent slices. The first user study should observe five people attempting the existing loop before adding those surfaces.

The first buyer-route check exposed a development-only duplicate-React/SSR dependency optimization failure. The app now imports the public TanStack server entry and prebundles React plus the public Convex HTTP client in the SSR environment. The final browser tests exercise the resulting server-rendered page. The upstream [TanStack issue](https://github.com/TanStack/router/issues/7119) documents the same class of failure; this prototype's passing checks are the evidence for its local fix.

## Project-scoped Codex MCP — 2026-09-18

The general operational Cloudflare MCP is configured in `app/.codex/config.toml`
instead of the global Codex config. The global read-only `cloudflare-docs` MCP
remains available. No application code, deployment configuration, credentials,
or live Cloudflare resources changed. `codex mcp list --json` from `app/`
resolved enabled `cloudflare` and `cloudflare-docs`; no server tool was called.
