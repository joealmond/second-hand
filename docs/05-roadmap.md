# Roadmap & the build decision

## Real seller trial decision — 2026-09-24

Pause new product surfaces and test the existing one-item flow with repeat sellers, starting with dealers who list unique used stock. This is a customer hypothesis, not a proven pivot. Invited Google sign-in is live for the two current accounts; next observe five dealers preparing and posting real items. Record minutes by step, factual errors or omitted defects, whether each listing was posted, and whether the seller returns with another item. Offer a paid assisted trial to test willingness to pay; 10,000 Ft/month is a price hypothesis, not a commitment. Do not build API/MCP or marketplace automation for this trial. Reconsider the audience and product direction from observed repeat use and payment, rather than marking earlier strategies superseded now.

Before inviting sellers, verify an authenticated item lifecycle and a physical-phone capture and sharing run. Before people outside the current invited pair upload stock photos, provide a Hungarian trial privacy notice naming the controller/contact, cloud and AI processors, retention, and deletion route. Jófogás shop XML remains a partner-cost and eligibility question, not a trial prerequisite. Keep automatic external publishing outside this trial.

## After the tested redesign — deferred canvas decisions

The user chose to finish and verify the existing redesign first. Plan these as separate changes after the seller trial evidence, rather than adding them to this release:

- **Buyer-link QR:** generate only for a currently active published link; ensure the code resolves to the same revocable URL and disappears when the link is switched off. Decide whether print/download is needed before choosing a library.
- **Sold price:** decide whether the amount is optional and owner-private; then add one validated HUF field to the item record, sale action and portable export. Keep asking price and final price distinct, and do not expose the final amount on the buyer page.
- **Defect states:** define separate seller choices for known faults, explicitly checked with none found, and not checked. Migrate older `unknown` records conservatively; keep every known fault in listings, exports and public pages.

## Project-scoped Codex MCP — 2026-09-18

- [x] Scope the operational Cloudflare MCP to `app/` and verify it without changing application behavior ([evidence](11-prototype.md#project-scoped-codex-mcp--2026-09-18)).

## Current core plan — 2026-09-08

### First working prototype

Implementation scope, acceptance cases and current evidence: [prototype note](11-prototype.md). Local development is authorized; external deployment and real marketplace posting are separate actions.

- [x] Scaffold the selected web stack and verify a persistent local backend/session.
- [x] Implement item facts, private originals, explicit sharing, sold state and portable export.
- [x] Complete the Hungarian mobile capture, confirmation, preview and sharing interface.
- [x] Pass domain/backend checks, app typecheck/build and browser flow verification.
- [x] Record limitations, startup instructions and an independent final review.

### Installable phone trial

Scope, acceptance and evidence: [PWA trial](12-pwa-trial.md).

- [x] Reuse the existing app and add install metadata, icons, safe service worker and offline guidance.
- [x] Prepare an isolated hosted backend and HTTPS app without migrating local/private examples.
- [x] Pass PWA/browser checks and verify the deployed phone-trial link.
- [x] Document installation steps and remaining physical-device limitations.

### AI-assisted capture — 2026-09-19

- [x] Add automatic category/title/description suggestions from private photo previews.
- [x] Add post-shot quality guidance and missing-angle recommendations.
- [x] Fill coarse location from network data without collecting precise GPS.
- [x] Preserve seller authority, unknown condition/defects and originals.
- [x] Deploy backend/UI and pass local plus hosted regression checks.
- [x] Verify in-app photo capture on iPhone Chrome and Safari after browser camera permission.
- [x] Verify coarse automatic location on the phone.
- [x] Activate live Gemini with a dedicated `second-hand` Google Cloud project, restricted key and backend-only secret.
- [ ] Calibrate the viewfinder crop/aspect mapping so captured photos match the visible frame.
- [ ] Offer AI spelling and grammar corrections for seller-entered text as an explicit suggestion; preserve the seller's original text and never apply silently.
- [ ] Accept arbitrary photos containing several objects; detect object candidates, let the seller confirm/split them, then create a separate item workflow and public page for each object while retaining the original photo.

### Product pilot (after implementation)

The [core plan](10-core-plan.md) is the current recommendation; the dated stages below are historical. Pilot procedures and acceptance gates are in [the core plan](10-core-plan.md#6-what-to-prove-before-expanding); review evidence and limits are in [the research update](07-competitive-research-2026-09.md#synthesis-update--2026-09-08). All implementation/pilot items below are NOT RUN.

- [ ] Deliver the one-item selling loop with actionable contact/export, then a host-curated collection experiment.
- [ ] Let an owner share selected items with a trusted helper who agrees to handle buyer calls and sell them.
- [ ] Pass the seller pilot's time, factual accuracy and second-item reuse gates.
- [ ] Verify independent host reuse, forwarded-link contact and actual paid demand.
- [ ] Prove export/import recovery and host handover before community expansion.

### Product exploration backlog — 2026-09-20

- [ ] Let buyers contact the seller either on our listing page or through Messenger, Viber or WhatsApp, according to the seller's chosen contact route.
- [x] Assess an AI-first open listing platform, MCP/API path and international precedent
  ([research](15-ai-first-open-listing-platform-market.md)): seller infrastructure is worth a
  bounded test; a new marketplace is not justified.
- [ ] Validate the platform thesis with one Hungarian repeat-seller vertical, three API/MCP design
  partners and written connector discussions with Jófogás/Vatera before building public writes.
- [ ] Let an owner share a listing with a professional seller and explicitly delegate agreed selling actions while keeping ownership and permissions visible.

## Historical roadmap

Status: draft v0.1 — 2026-07-30

---

## The question you asked: skill, or full local web app?

**Build the skill first. Then grow it into the web app. Do not choose between them —
they are the same system at two different ages.**

Here is the reasoning, because the reasoning is what lets you re-decide later.

### They solve different halves of the problem

|                     | Skill                                                                             | Web app                                                            |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Good at             | **creating** an ad — looking at photos, asking questions, writing Hungarian prose | **managing** ads — browsing, editing, cropping, tracking status    |
| Interaction         | conversation, once per item                                                       | direct manipulation, continuous                                    |
| Needed at           | ad #1                                                                             | ad #15                                                             |
| Cost to build       | hours                                                                             | weeks                                                              |
| Risk of being wrong | low — a prompt is cheap to rewrite                                                | high — you'd be designing a UI for a workflow you haven't done yet |

The creation problem is the one you have _today_, and it's the one that's genuinely hard —
turning six photos and a vague memory into a good Hungarian ad. The management problem is
the one you'll have in two months, and it's mostly conventional software.

### The decisive argument

You do not yet know what your ad workflow is. You have never made an ad this way.

If you build the web app first, you will spend three weeks designing forms for fields you
turn out not to need, and discover at ad #4 that the thing you actually needed was a way to
record which Facebook group you posted to. Every UI decision would be a guess.

The skill costs a few hours, produces ad #1 today, and — this is the point — **the ads it
produces are exactly the data the web app will later read.** Nothing is thrown away. The
`ad.md` files you create this week are the seed database of the app you build in October,
and by then you'll have designed it against ten real examples instead of zero.

### What makes this safe

The architecture is chosen so the two never conflict:

- The skill writes `ad.md`. The web app will read and write `ad.md`. Same contract.
- `build.py` renders `ad.md` → HTML, and the web app will call the same `build.py`.
- The generated `index.html` is already the ancestor of the app's ad view — same markup,
  same CSS. The app adds controls; it doesn't replace the page.

So "skill first" isn't a lesser version. It's the bottom two layers of the final system,
built in the order that lets each one be validated before the next depends on it.

### The one thing that would change my mind

If your real bottleneck turns out to be _photo editing_ — cropping, straightening, removing
backgrounds — then a browser UI is required early, because that cannot be done in a
conversation. Watch for this. If after five ads you're constantly opening Preview or GIMP,
jump to v1 sooner.

---

## Stages

Each stage is independently useful. If the project stops at any of them, it was worth
building.

### v0 — Make one ad _(this week)_

**Goal:** photos in → finished Hungarian ad out, in under five minutes.

- [x] `docs/` — vision, architecture, schema, research
- [x] Folder structure, `inbox/`, `ads/`
- [x] `uj-hirdetes` skill — reads photos, asks questions, writes `ad.md`
- [x] `scripts/build.py` — `ad.md` → `index.html` + `export/*.txt` + resized photos
- [x] `templates/ad.css` — the design
- [ ] **Make a real ad and actually post it.** This is the acceptance test.

**Done when:** you posted something to Jófogás using text this tool generated, and it felt
faster than typing.

### v0.5 — Don't lose track _(weeks 2–4)_

**Goal:** never again leave a sold item live somewhere.

- `scripts/serve.py` gallery: all ads, filter by status, sorted by age
- Mark sold → generates a take-down checklist from `platforms[]`
- Expiry warnings: Vatera at its verified 21-day maximum; Jófogás from seller-entered or newly
  verified expiry information rather than an unsupported universal 90-day assumption
- `sale:` record filled on close
- 5–10 real ads through the system

**Done when:** you can answer "what am I currently selling and where?" in one glance.

### v1 — Edit in the browser _(months 2–3)_

**Goal:** stop opening a text editor.

- The ad page becomes editable; writes back to `ad.md`
- Photo reorder, rotate, crop — producing crop _recipes_, not new files
- Copy-to-clipboard per platform, photos revealed in Finder
- Per-platform AI rewrite on demand, saved into `ad.md` as variants
- Category templates (clothes / tech / furniture / bike) with saved question sets

**Done when:** the terminal is optional.

### v1.5 — Publish _(month 4)_

**Goal:** every ad has a URL.

- `site/` static build — gallery + one page per ad
- Deploy to Netlify / GitHub Pages / your own domain
- Open Graph + schema.org already present; verify rich previews in Messenger and Viber
- QR code per ad — put it on the object, or on a flyer
- "Sold" pages stay live with a _Elkelt_ banner (they're social proof and SEO)

**Done when:** pasting an ad link into Messenger shows photo, title and price.

### v2 — Close the loop _(month 6+)_

Pick based on what actually hurts by then. Candidates, roughly ordered:

- Price suggestion from Vatera _sold_ comps — the highest-value, most legally delicate idea
- Photo assistant: background removal, straightening, "this photo is too dark"
- Relist/bump reminders with text pre-loaded
- Message templates for buyer replies (haggling, "is it still available", pickup arrangements)
- Analytics over the archive: what sells, what lingers, what your discount rate really is
- English/German variants of the same facts for cross-border sales

### v3 — Only if v2 proved it _(no date)_

Multi-user, accounts, database, a real product. Files become the import/export format
rather than the storage. **Do not start this before ~30 real ads.** See
[market research §5](04-market-research.md) for why the business case is genuinely hard —
and why that's fine.

---

## What to do right now

1. Read [the vision](01-vision.md) and tell me where you disagree. It's a draft on purpose.
2. Put photos of one real object into `inbox/<valami>/` — one folder per item.
3. Say **"csináljunk egy hirdetést"** + the folder name (or just "make an ad").
4. Post the result. Note what was annoying.
5. That annoyance is v0.5's real spec — not this document.
