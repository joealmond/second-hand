# PWA phone trial

2026-09-08 · COMPLETE — hosted trial verified. [Checklist](05-roadmap.md#installable-phone-trial).

Reuse the implemented ConvexKit/TanStack/Convex/Better Auth/Cloudflare app. Add a manifest, install icons and platform-appropriate install help. Use a small service worker for static offline guidance only; do not cache private pages, authentication, media or stale listings. The working selling flow still needs internet connectivity.

Phone testing needs an HTTPS URL with a reachable backend. Prepare a separate Tovább trial deployment using the existing account connections. Keep local configuration/data intact and start the hosted database empty. Do not copy the existing watch/bicycle examples or modify the starter's deployed app. User requests a PWA they can try; no marketplace publishing, messaging, purchases or existing-project data migration are authorized.

Acceptance: manifest/icons served correctly over HTTPS; production service worker registers and provides offline navigation guidance without caching private/API data; online anonymous session/upload/edit/share/sold/export flow passes; install instructions work for supported iOS/Android browsers; hosted URL contains no localhost backend references. Tests and runtime/deploy identities will be recorded here. Actual device installation remains NOT RUN until observed.

## Install

Open [Tovább](https://tovabb-prototype-preview.jozsef-mandula.workers.dev) on the phone. iPhone: Safari → Share → Add to Home Screen. Android: Chrome → Install / Add to Home screen. Launch the installed icon before adding your items; browser and installed-app sessions may be separate. Export important records before clearing site data.

## Evidence — 2026-09-08

Reused the existing app, starter, backend components, deployment CLI, installed dependencies and test runner. One bounded implementation agent added PWA assets/install help; root handled hosting, integration and verification. No new application framework or PWA package was installed.

- **PASS:** 10 unit/backend test files, **41 tests**. [Log](../output/pwa-tests.log).
- **PASS:** lint with zero warnings, application TypeScript check, separate backend TypeScript/bundle/deploy validation. [Lint](../output/pwa-lint.log), [app types](../output/pwa-typecheck.log), [backend types](../output/pwa-backend-typecheck.log), [backend deployment](../output/pwa-backend-deploy.log).
- **PASS:** client/Worker build and dry-run checks; published client assets contain hosted backend URLs and no local/backend secret values. [Build](../output/pwa-build.log), [Worker dry run](../output/pwa-worker-dry-run.log).
- **PASS:** **7 deployed browser scenarios, 0 skipped**: selling/export/privacy lifecycle, mobile layout, upload failure recovery, conflicting tabs, private-session handling, Chrome installability and actual offline fallback with cache inspection. [Final log](../output/pwa-e2e.log), [PWA tests](../app/e2e/pwa.spec.ts).
- **PASS:** manifest points to real 192×192 and 512×512 PNGs; service worker controls the HTTPS app; Chrome reports no installability errors. Cache contains exactly offline page, manifest, favicon and install icons; no user pages/API/media/listing responses.
- **PASS:** targeted fixes for Cloudflare's redirected offline HTML and Convex production errors passed before the complete regression batch. Cached fallback responses are reconstructed to avoid redirect flags; intentional application error data is used for draft-conflict recovery. [Focused hosted log](../output/pwa-e2e-fixes.log), [focused unit log](../output/pwa-fixes-tests.log).
- **FAIL, superseded:** the user later confirmed the first forced-capture control opened a black camera in iPhone Chrome. Installation and the native share chooser remain NOT RUN.

Hosted Worker: `tovabb-prototype-preview`, version `02ef99a4-f7be-4c00-acec-4b2d7747dbf1`. [Deployment log](../output/pwa-worker-deploy.log), [source/build identity](../output/pwa-build-identity.json). Backend: dedicated project `tovabb-pwa`, production-runtime trial `polished-alligator-663`, region `aws-eu-west-1` (Ireland). The database started empty; only synthetic browser-test records were created for verification. No existing private item records/photos were migrated; successful test publications were revoked. Original local configuration and starter deployments remain intact.

## Capture assistant update — 2026-09-19

Deployed backend and PWA code for automatic post-capture enrichment. Private metadata-free previews are prepared for Gemini 3.8 Flash; the model suggests category, Hungarian title/description, visible details and photo quality/angles. Seller edits are authoritative, possible defects stay unconfirmed, originals are not sent, and delayed analysis cannot overwrite a seller edit. Coarse city/region comes from Cloudflare network data; precise GPS is not collected.

- **PASS:** lint, app/backend TypeScript, 45 unit/backend tests and production build.
- **PASS:** 7/7 deployed HTTPS browser/PWA scenarios, including capture recovery, mobile layout, private-session isolation, publishing/export, installability and offline cache boundaries.
- **PASS:** manual headed-browser capture on a 390 × 844 viewport; the network location populated without a permission prompt and the saved-photo flow survived an unavailable provider.
- **PASS:** created dedicated Google Cloud project `second-hand` (`second-hand-509119`), enabled Gemini API, created `tovabb-gemini` service account with no broad IAM role, and stored its Gemini-restricted key only in the isolated Convex backend. A text-only provider smoke returned model `gemini-3.8-flash` with finish reason `STOP`; the key is absent from the app bundle and Worker. Deployed photo analysis after activation remains NOT RUN until the next consented capture.
- **PASS:** Gemini-enabled backend and PWA redeployed; 2/2 hosted installability and offline-cache checks passed.

Hosted Worker version: `62561fe6-ee6b-43d6-bac3-39e4c90a741d`.

## Camera and item management update — 2026-09-19

Two system-camera approaches failed on the user's iPhone: forced `capture` opened a black Chrome camera, while the normal picker still opened a black Chrome camera and offered no Camera option in Safari. The final design keeps one app selector only: “Kamera” opens an in-app `getUserMedia` preview with shutter and camera switching; “Galériából” is the only system picker and remains multi-select. HEIC/HEIF originals are preserved and accepted, while a separate JPEG preview is generated with a decoder fallback.

Saved-item cards now have explicit Edit and buyer-link actions. The editor can delete an item after confirmation; deletion revokes its buyer page and removes originals, previews and upload intents. Buyer preview has Back, returning to the same editor step.

- **PASS:** 46 unit/backend tests; lint, app/backend TypeScript and production/PWA builds.
- **PASS:** 8/8 deployed HTTPS/PWA browser scenarios, including a fake-device live camera preview, JPEG shutter capture/upload, edit, publish, preview/back, export, privacy, mobile layout, installability and offline boundaries.
- **PASS:** no system camera input remains; Gallery is the only file input. Camera permission denial has actionable guidance and retry.
- **PASS:** deployed disposable-item delete returned to an empty item list; backend test verifies publication, photos and upload-intent cleanup.
- **PASS:** user confirmed photo capture works in iPhone Chrome and Safari after granting each browser camera permission.
- **PASS:** user confirmed automatic location works on the phone.
- **TODO:** calibrate the live viewfinder crop/aspect mapping so the saved frame matches the visible composition exactly.
- **FAIL, superseded:** user confirmed the AI action showed an error before backend key activation; the dedicated key is now configured.

Hosted Worker version: `14254f0f-73d4-4f47-93e7-0e134f4f9423`.

## Limits

This is still a trial: anonymous ownership is tied to the current browser/install, online access is required for the working selling flow, HEIC/HEIF originals are accepted when the phone browser can decode them for a JPEG preview; account recovery/community/dealer features remain later work. Live AI recognition is configured with the dedicated backend-only key; image analysis after activation awaits the next consented capture. The installed PWA offers a clear offline screen rather than full offline editing. Install/update help appears on the home screen and does not cover editor or buyer controls. Updates wait for the user's action; they do not automatically reload unfinished edits.

Install behavior follows [MDN's PWA installability guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable); device instructions remain subject to the phone/browser's own menu wording.

## Single-page AI editor deployment — 2026-09-19

Deployed the single-page capture/editor, separate private preview, real AI progress, manufacturer/model fields, reviewable text correction, grounded manufacturer/price research and all-photo preview to the existing trial. Gemini uses the existing backend-only key. Original photos and existing records are retained; automatic selection of the best/relevant photos remains a roadmap TODO.

- **PASS:** hosted-config build, verified Worker target and absence of local Convex URLs in built assets. Build log: `output/ui-hosted-build.log`.
- **PASS:** Convex deployment to `polished-alligator-663`, TypeScript and existing-data schema validation; no indexes deleted.
- **PASS:** installed Google Chrome hosted mobile editor/private-preview layout and offline cache-boundary tests.
- **PASS:** normal temporary Chrome profile reports zero installability errors. The automated incognito version returned only `in-incognito`; this was a test-context limitation, not an application failure.
- Worker version: `c79d1779-62b2-4e4d-9c86-822a0c987816`.
- Full live application AI-action verification after deployment remains **NOT RUN**; standalone same-model/key search and extraction were verified in the preceding implementation work.
- Deployment CLI reported the Convex account above free-plan limits; deployment itself succeeded.

## Progressive photo-analysis repair — 2026-09-20

Hosted logs proved later mouse photos were saved but never analyzed: the shared five-per-hour AI allowance was exhausted. Upload also cleared the prior photo guidance, and analysis selected only four photos. Dedicated user-approved limits now allow 12 photo analyses, 4 research operations (two provider calls each), and 10 text corrections per hour per user. Every saved photo up to the existing eight-photo limit is considered. Uploads use a coalesced analysis queue; newer identities queue follow-up price research. Clear labels can correct earlier AI identity; seller fields remain protected. Guidance survives failed requests and rate-limit messages give retry timing.

- **PASS:** 53 tests, lint, frontend/backend types, local production and hosted-config builds.
- **PASS:** live replay of all three user's mouse previews and deployed authenticated reanalysis recognized Logitech MX Master 2S from the readable third-photo label.
- **PASS:** deployed research saved an editable 14,000 HUF AI suggestion with 10 sources. It remains an AI recommendation, not a verified sale valuation.
- **PASS:** recovery checks verified seller-confirmed fields, private/contact fields, condition/defects and publication state unchanged; three photos retained.
- **PASS:** two deployed installed-Chrome checks for mobile editor/private-preview layout and offline cache boundaries.
- Worker version: `bc27ee86-0727-4b7c-9e21-cf08b32359b4`; backend: `polished-alligator-663`.
- Logs: `output/photo-fix-build.log`, `output/photo-fix-deploy.log`.

## Google authentication update — 2026-09-20

- **PASS:** seller routes now require Google sign-in; the Convex backend allowlists two invited accounts and applies the same check to private media.
- **PASS:** an existing anonymous browser session transfers its item, photo and pending-upload ownership on first invited Google sign-in.
- **BLOCKED:** the hosted Convex deployment currently has empty `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values. The preview therefore shows the sign-in screen with its button disabled until a Google OAuth web client is created and the two values are set.
- **NOT RUN:** completed Google consent and sign-in for either invited account.

## Google sign-in recheck — 2026-09-24

- **PASS:** the hosted Convex deployment now has nonempty Google client ID and secret in valid Google credential formats; the deployed public app bundle enables Google sign-in. No credential value was copied into this document.
- **PASS:** the hosted sign-in endpoint generates a Google authorization URL with the expected Tovább callback URI; a non-authenticated Google request did not report a redirect mismatch.
- **PASS:** an allowed verified Google account has a live hosted session refreshed on 2026-09-24 after signing in. The 2026-09-20 empty-credential note above is historical and no longer describes the current configuration.
- **PASS:** both allowlisted, verified Google accounts have active hosted sessions.
- **NOT RUN:** authenticated item lifecycle, uninvited-account denial, and physical-phone trial.
- **PASS:** local lint, 58 unit/backend tests, frontend and backend type checks, production build, and hosted preview build. A full-frame seller photo thumbnail replaced the misleading square crop; Worker `0882fd83-afaf-41a1-a3f2-359e0360a2ff` was deployed. Live HTTP checks confirmed the new CSS and the Google sign-in redirect after deployment.
- **NOT RUN:** physical-camera comparison of the saved photo against the viewfinder. The original camera frame is still saved in full by `takePhoto`; the editor now also displays it in full. Do not close the camera calibration TODO until a real device comparison passes.
- **PASS:** an existing active buyer page returned HTTP 200 without seller sign-in after deployment; the latest 100 hosted backend function events contained no failures. These checks do not replace a full authenticated item lifecycle.
- **PASS:** after deployment, the manifest, service worker, both install icons, and redirected offline page returned successfully over HTTPS. A fresh hosted data check found no new item since 2026-09-20; the phone capture/item check remains pending.

## Dealer invite preparation — 2026-09-24

- **PASS:** the backend accepts exact additional invited Google emails from a backend-only `ADDITIONAL_SELLER_EMAILS` setting while preserving the original two-account allowlist. A focused regression test passed; 59 tests, lint, frontend/backend type checks and the local build passed. The updated backend was deployed to `polished-alligator-663` without schema/index deletion.
- **NOT RUN:** no extra seller address has been added; actual external-account sign-in and one-item completion remain pending.
- **RISK:** Convex reported that the team is above Free plan limits during deployment. This trial deployment itself showed 11,138 function calls and 0.081 GB egress for the current month, no configured deployment usage limit, and no resource-limit error in the last 72-hour insights. The warning may reflect other projects because Convex meters Free resources per team. [Convex pricing FAQ](https://www.convex.dev/pricing/faq) says extended Free-plan overage may cause function HTTP errors. Check team billing capacity before a multi-seller trial; no plan change was made.

## Olo redesign — 2026-09-24

- **CHANGED:** every seller and buyer screen follows the approved "Tovább app redesign" canvas: olo (`#00FFCC`) accent, frosted-glass cards over soft glows, violet only for AI suggestions, amber only for known defects and warnings, Bricolage Grotesque and Figtree. Home, editor, "Hol hirdeted?", buyer page, sign-in, camera, 404/error, install card, offline page and icons each have phone, tablet and desktop layouts. The Hungarian copy was rewritten; marketplace texts now use the seller's own voice ("Működés: kipróbáltam, működik", "Ismert hibák: …").
- **CHANGED:** the camera stays open for several shots and queues uploads; the home screen hands picked or dropped photos, or "open the camera", to the new item; to-dos are derived from existing item data. Marketplace switches remain the seller's own report ("Csak a saját jelzésed"); nothing claims a verified external listing.
- **CHANGED (backend, needs `convex:push`/deploy):** `items.confirmFacts` marks AI- or location-suggested facts as seller-confirmed without changing the revision, and item records now report `publicationOutdated`. Until the hosted backend is updated, the share screen shows a neutral "Hirdetésoldal frissítése" button and confirming a suggested field shows an error.
- **RISK:** the two fonts load from Google Fonts; the CSP now allows `fonts.googleapis.com` and `fonts.gstatic.com`. That sends visitors' IP addresses to Google. Self-host them (for example `@fontsource-variable/bricolage-grotesque` and `@fontsource-variable/figtree`) and drop both CSP hosts before a public trial.
- **PASS:** frontend and backend type checks, ESLint with zero warnings and Prettier on the changed files. The 10 pure domain tests (`item-display`, `itemValidators`) passed under a Node shim. Every screen rendered at 390, 834 and 1440 px with stubbed data in headless Chromium without horizontal overflow; publish, sold and delete sheets, the overflow menu and the multi-shot camera (fake device) were exercised.
- **NOT RUN:** the Vitest suite (this machine's `node_modules` only has the macOS Rolldown binding), the Convex tests including the two new ones, the production build, the updated Playwright specs, a hosted deploy and a physical-phone pass.
- **NOT DONE:** QR code, sold-price capture and separating "known fault" from "not tested" defects need schema or product decisions.

## Olo redesign completion check — 2026-09-24

- **PASS:** macOS `npm run check` (lint, 66 Vitest cases, frontend types, production build), backend types, and seven local browser scenarios, including denied camera permission. The two HTTPS-only PWA scenarios remain skipped locally. Browser selectors were updated for the new controls; photo upload has a 30-second assertion window.
- **PASS (local source/build):** Bricolage Grotesque and Figtree now ship from Fontsource; the Google Fonts links and both CSP exceptions are removed. The camera displays the full frame it saves, and camera errors offer a gallery picker. Marketplace chips say when a post is only the seller's report.
- **PASS:** after explicit user approval, Convex functions deployed to `polished-alligator-663` with no index deletion, and Cloudflare preview Worker `6646ec2b-0a70-4e65-a80e-dbd9e1fec8fd` deployed. The `deploy:preview` script now targets `.env.pwa.local` instead of the anonymous local backend.
- **PASS (hosted HTTPS):** both PWA browser checks passed. The manifest/icons load, the worker uses `tovabb-shell-v7`, offline navigation stays honest, and private/API content is absent from the shell cache. Loaded font faces are local Fontsource Bricolage Grotesque and Figtree; HTML and CSP contain no Google Fonts host.
- **NOT RUN:** an authenticated hosted seller interaction with `confirmFacts` and an edited published item to verify the freshness warning. The backend functions are deployed, but this check needs an invited signed-in account.
- **NOT RUN:** physical iPhone capture, photo saving, safe areas and install-card positioning. Signed-in Chrome visual inspection could not start because the UI automation runtime rejects this checkout's symlinked workspace root; local Playwright flows passed. The source checkout now has Git metadata. Public GitHub source omits seller records, original photos and invited-account addresses.
- **OPEN:** QR, sold price and defect-state changes are explicitly deferred to a separate plan by the user, in line with the roadmap pause on new surfaces. A Hungarian privacy notice needs the controller/contact and retention details before the trial expands beyond the existing invited accounts.

## Public source repository — 2026-09-24

- **PASS:** the public source branch preserves the original GitHub repository history while removing the obsolete roof-tile Pages listing. Seller records, original photos and invited-account addresses are omitted from the source commit; local records remain available in the private checkout.
- **PASS:** `SELLER_EMAILS` was set and checked as a backend-only setting on the existing hosted Convex trial before publishing env-driven allowlist code. The env-driven backend and Worker were deployed to the existing preview; Worker version `165e2ffb-ed8c-4d69-8a57-23d67e098c49`.
- **PASS:** 67 unit/backend tests, frontend/backend types, production build and seven local browser scenarios passed with a bundled test image. Both hosted HTTPS/PWA checks passed after deployment. Actual Google sign-in by each invited account remains NOT RUN. Static publishing now requires an explicit `PUBLIC_BASE_URL`; the former Pages URL is not used as a default.
