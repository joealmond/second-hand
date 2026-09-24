# second-hand — working guidance

A Hungarian-first selling assistant: help people photograph, describe, share and track used items with few decisions.
Adapted from Thin Workflow's `template/AGENTS.md` on 2026-09-05.
Read `README.md`, `docs/10-core-plan.md`, `docs/01-vision.md` and `docs/08-product-stack.md` for product context.
The current planning checklist is in `docs/05-roadmap.md`; acceptance and evidence are linked there.
The working web prototype is TypeScript in `app/`; the original Python workflow in `scripts/` and `ads/` remains intact.
The original local prototype evidence is in `docs/11-prototype.md`; the hosted PWA trial and current checks are in `docs/12-pwa-trial.md`. No native app exists.
Keep local `.env.local` separate from hosted `.env.pwa.local`; never deploy the local backend configuration.

## Domain constraints

- Preserve original photos. Store edits separately and retain an exportable item record.
- Distinguish AI suggestions, seller-confirmed facts and unknowns. Preserve known defects in every variant.
- Keep private fields and unpublished photos out of public output; publish only within the user's authorized scope.
- For the current file-based implementation, edit `ad.md`, not generated HTML or exports.
- Prefer capture, short questions and editable previews over exposing the entire schema as a form.
- Marketplace status must distinguish user confirmation from independently verified integration state.

## Commands

Run from this repository root. Python 3 is required; Pillow is optional for photo processing.
- Read-only validation: `python3 -B scripts/build.py --check`.
- Generate previews: `python3 scripts/build.py` (writes generated HTML and exports).
- Local gallery: `python3 scripts/serve.py` (localhost:8765).
- Web app (from `app/`, Node 24 tested): `npm ci`, then `npm run dev` → http://127.0.0.1:3000.
- App checks (from `app/`): `npm run check`, `npm run typecheck:backend`, `npm run test:e2e`.
- `app/.env.local`, `app/.convex/` and verification output contain local/private state; keep them untracked.
- `scripts/publish.py` clears and rebuilds `site/`; inspect that directory before using it.

## Working loop

- Inspect relevant work and preserve unrelated changes. Handle ordinary reversible choices directly.
- Deliver a complete observable slice. Use one short note only when complexity or handoff needs it.
- Verify affected behavior with existing tools; add tests for consequential behavior and regressions.
- Inspect the result. Use browser/device checks for actual visual, capture and sharing flows.
- Report actual checks and limitations; do not equate scaffolding, mocks or static inspection with a working integration.
- Keep durable decisions in existing docs. Add no workflow runtime, task database or mandatory ceremony.
