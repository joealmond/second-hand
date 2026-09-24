# Product stack and first implementation slice

**2026-09-08 implementation update:** A working local prototype now exists in `app/`; see [11-prototype.md](11-prototype.md) for verified commands, results and deliberate local-storage/AI limitations. The recommendations and inspection below are historical context.

**Earlier scope update:** [10-core-plan.md](10-core-plan.md) retains this stack baseline and adds a shareable item/collection, actionable buyer contact and portable export to the proposed first complete loop. Native development remains gated on real device evidence. The implementation is now exercised locally; the seller/community pilot remains NOT RUN.

Date: 2026-09-05. Status: recommended implementation direction following local template inspection and current documentation checks. The application has not been scaffolded or deployed here.

**Use a lean ConvexKit web app, with Thin Workflow guidance. Build the phone experience around capture, short confirmations and a preview.** The stack enables the experience; replacing forms with a long chat would not necessarily reduce effort.

## Selected direction

| Layer | Recommendation | Purpose |
|---|---|---|
| Web | TypeScript, React, TanStack Start, Vite | Responsive seller app and server-rendered public listing pages |
| UI | Starter's Tailwind v4 and Radix primitives | Touch-friendly controls, editable facts and photo-led screens |
| Web hosting | Cloudflare Workers | Deploy the TanStack application using the existing Vite integration |
| Backend | Convex Cloud | Item records, ownership, status, saved variants and live job progress |
| Authentication | Better Auth with the Convex integration | Reuse the starter integration; configure a simple sign-in path for the pilot |
| Photo storage | Private Cloudflare R2 through the Convex R2 component | Immutable original bytes and stored derivatives; expiring authorized upload/download links |
| Photo transformations | Cloudflare Images behind an authorized server path | HEIC conversion, orientation, resizing and conventional edits; preserve originals in R2 |
| AI | OpenAI Responses API through the official TypeScript SDK, called from Convex actions | Image analysis and schema-shaped results; replace the starter's text-only streaming example |
| AI jobs | Convex job records and bounded action scheduling/retries | Generation survives navigation; stale results cannot overwrite newer seller edits |
| Draft recovery | IndexedDB for local capture/draft recovery, explicit sync state | Refresh/interruption resilience; not a promise of offline AI or complete offline sync |
| Checks | Vitest, convex-test and Playwright from the starter | Domain, authorization and browser behavior; real phones for camera/sharing |
| Later native app | Expo / React Native with the same Convex backend and Better Auth integration | Dedicated guided-camera experience; share domain code rather than forcing DOM screens into native |
| Agent guidance | Adapted Thin Workflow `AGENTS.md` | Brief project constraints, verified commands and one note when handoff is useful |

Cloudflare documents the TanStack Start integration directly. [Deployment guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).

Convex stores business data; it does not run inside the Cloudflare Worker. Cloudflare hosts the web application and handles image transformations. Avoid implementing a second business backend in Workers, or adding D1 alongside Convex. Client database calls use Convex's existing authenticated interface.

## Why adapt this starter

Inspected local source: `/Users/jozsefmandula/dev/source/convex-tanstack-better-auth-cloudflare-terraform`, also registered as a Codex project. The package calls itself ConvexKit.

Useful implemented foundations include Better Auth, owner-scoped functions, upload authorization and quotas, saved AI job progress, rate limiting, unit/browser checks, and preview/production deployment configuration. Its CLI supports selecting examples and excluding Terraform.

Recommended initial composition: Better Auth + Cloudflare + `files,ai`, without Terraform or the chat, billing, email, admin, todos and form-example screens. Reuse backend patterns, replace the demo UI. The upload example uses Convex Storage today; switching bytes to R2 is actual implementation work, not a configuration toggle. Keep billing out of the first learning slice and add it when testing paid usage.

The current snapshot declares React 19, TanStack Start 1.168, Convex 1.42, Better Auth 1.6 and Vite 7 ranges. These are inspected versions, not claims that they are the latest. Keep the known baseline initially, generate an application lockfile and check compatibility before upgrading as a separate change.

## Gaps that matter for this product

- `convex/ai.ts` currently sends text prompts and streams text. Build image input, structured observations, missing-question selection and saved text variants. Use a small provider boundary; do not introduce an agent orchestration framework for this linear workflow.
- `convex/lib/filePolicy.ts` imposes 10 MB/file, 100 MB/user and 100 files/user, and excludes HEIC. These are template policies, not storage-provider limits. Replace them with a measured photo policy and server-verified metadata/quotas.
- Native mobile support is a guide in `docs/MOBILE.md`; Capacitor dependencies, native projects and camera capture are not installed in the inspected package. Its native auth/camera recipes are not verified for this product. Do not copy the custom session-cookie redirect bridge as a default auth design.
- PWA installation, local capture recovery, photo coaching and marketplace handoff are not implemented by the starter.
- The schema is primarily examples. Introduce items, assets, observations, confirmed facts, variants, postings and generation jobs using a versioned item contract. Keep public visibility separate from sale status.

Convex's ordinary storage download URLs are bearer URLs whose access cannot be revoked independently of deleting the file. That differs from private originals with expiring access, which motivates R2 here. Enforce item ownership before issuing URLs; expiration is not one-time use or instant revocation. [Convex storage security model](https://docs.convex.dev/file-storage/overview), [Convex R2 component](https://github.com/get-convex/r2), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

Cloudflare Images documents HEIC ingestion and conversion. Test actual iPhone files, dimensions and colour/orientation handling; do not assume all encodings are accepted. Keep private transformations behind authorization, and expose only explicitly published derivatives. [HEIC support](https://developers.cloudflare.com/changelog/post/heic-support/).

The Responses API accepts image inputs and supports schema-constrained outputs with compatible models. Schema conformity does not guarantee true facts. Treat unreadable labels and inferred condition as uncertain; require seller confirmation for functional claims. Keep the model configurable and select the production model using actual Hungarian photo/listing examples, latency and cost measurements. The starter's model default is not a benchmark result. [Vision](https://developers.openai.com/api/docs/guides/images-vision), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Fewer decisions in the interface

Target flow: **photos → only missing answers → editable preview → ready-to-post package**.

1. Begin capture or import without a profile questionnaire. Save locally; make cloud upload explicit and establish an authenticated or properly bounded guest session before paid AI work.
2. Suggest object/category, visible details and useful next photographs. Allow correcting suggestions without restarting.
3. Ask only missing essentials: working condition/defects, price and handoff. Use short cards and quick choices, with optional voice input later. Reuse seller defaults with a visible way to change them.
4. Generate title and prose. Put tone choices on the preview. Keep confirmed facts unchanged when rewriting tone; allow direct editing.
5. Show destination-specific copy/share/download actions. Require confirmation or integration evidence to mark a listing posted.

Three screens are a design target, not a reason to omit essential information. A few necessary questions are better than a silently invented spec. Uncertain fields should remain unknown until confirmed.

Persist a source revision with each generation job and variant. A delayed job must not replace newer seller edits. Retrying an upload or generation must not create duplicate items or accidentally multiply billed work. AI results are saved; rendering and exporting do not regenerate prose.

## Mobile and alternatives

Deliver and test a mobile-browser app first, including Safari on an actual iPhone and Chrome on Android. Browser emulation does not verify capture quality, permission recovery or native sharing. Test the camera/upload/auth path early, before building the entire organizer.

For the later native product, Expo is the preferred direction if custom guided capture remains central. Convex + Better Auth has an Expo integration using secure device storage. React Native requires its own screens; share types, validation, generation contracts and backend functions. [Expo integration](https://labs.convex.dev/better-auth/framework-guides/expo), [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/).

Capacitor remains a lower-rewrite option if basic capture plus post-shot feedback satisfies users. Validate it on devices before choosing solely for code reuse. Do not build both native approaches.

Supabase/Postgres is a reasonable alternative if SQL and relational reporting become the dominant requirements. An all-Cloudflare backend could consolidate providers but would replace already-available Convex application services. Neither currently offers enough task-specific benefit to justify discarding the user's starter. Keep business rules in ordinary TypeScript and support complete import/export to preserve data portability; Convex application code still creates backend coupling.

For the hosted product, the database becomes authoritative and `ad.md` plus originals remains a full import/export contract. Keep the existing Python prototype usable during migration; never silently change its source-of-truth rules.

## Thin Workflow

The supplied name was interpreted as `/Users/jozsefmandula/dev/source/thin-workflow`, whose README and adoption guide match the requested small helper harness. It is a Markdown guidance distribution, not an application runtime. Adapted its short template into this repository's `AGENTS.md` using current Python commands. Replace/add commands when web code actually exists. No predecessor orchestration, background loop or task database was adopted. The harness describes itself as a draft with real-use validation still pending; this use is not proof of improved productivity.

## Evidence and next slice

Completed: inspected source, auth/files/AI implementation, mobile guide, CLI and harness; checked official integration documentation; ran the starter's CLI tests (3 passed); separately generated the exact `files,ai` composition in a temporary directory and verified retained/omitted features. No dependency installation, production build, OAuth session, AI request, R2 upload or deployed integration was tested. Current ads also passed `python3 -B scripts/build.py --check` (3/3); Pillow is absent in that interpreter.

Next implementation slice: one bicycle from phone photos to a saved, fact-checked Hungarian draft and Jófogás/Marketplace export, with recovery after refresh. Start with authenticated private upload and device capture checks, then analysis/questions and preview. Verify ownership isolation, missing/uncertain facts, stale-job rejection, preserved defects and original-photo export. Broader organization, billing and native distribution follow after this complete slice works.
