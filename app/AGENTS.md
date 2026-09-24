# Tovább prototype

Follow [the repository guidance](../AGENTS.md). Scope and evidence live in
[the prototype note](../docs/11-prototype.md); checklist in [the roadmap](../docs/05-roadmap.md).

- Run app commands here; see `README.md` for verified commands.
- `npm run dev` runs an anonymous local Convex backend and Vite; no cloud account is required.
- Keep portable domain code in `src/lib/item-contract.ts` independent of framework transports.
- Keep originals private; publish only allowlisted facts and separate preview images.
- Never describe deterministic text composition as image recognition or live AI.
- Photo feedback must analyze every saved preview (up to `MAX_PHOTOS`), coalesce overlapping uploads into a latest-batch retry, keep prior guidance until replacement succeeds, and use its dedicated rate budget so price/text calls cannot exhaust capture.
- The hosted PWA trial is documented in `../docs/12-pwa-trial.md`; a local public route is still not an internet deployment.
- Neither local nor hosted sharing confirms marketplace publication. The service worker must not cache owner, API, auth or listing/media responses.
- Keep `.env.local`, `.convex/`, browser state and private exports out of source control.
