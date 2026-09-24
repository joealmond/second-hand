# second-hand

**Installable phone trial:** [Open Tovább](https://tovabb-prototype-preview.jozsef-mandula.workers.dev) · [installation and evidence](docs/12-pwa-trial.md).

**First web prototype:** [run Tovább locally](app/README.md) — phone-friendly capture, confirmed facts, buyer pages, sold status and ZIP export. [Verification and limits](docs/11-prototype.md).

The Python workflow below remains available.

An ad workshop for people who sell used things.

Write an advertisement once — as a document you own — and project it onto every
place you want to sell: Jófogás, Facebook Marketplace, a local buy/sell group,
Vatera, HardverApró. Later, onto a public web page with its own URL.

**Hungarian first.** All buyer-facing text is Hungarian.

---

## Make your first ad

1. Make a folder per object under `inbox/` — `inbox/bicikli/`, `inbox/mosogatogep/` —
   and put that object's photos in it.
2. Ask Claude: **"csináljunk egy hirdetést bicikli"** (or `/uj-hirdetes bicikli`,
   or "make an ad"). Name the folder to pick the item; leave it out and Claude
   lists what's in the inbox and asks.
3. Answer four or five questions.
4. Open `ads/<id>/index.html`, check it, copy the text, post it.

Several folders in `inbox/` at once is fine — Claude does them one after another,
one ad per folder.

```bash
python3 scripts/build.py          # rebuild everything
python3 scripts/serve.py          # gallery at http://localhost:8765
PUBLIC_BASE_URL=https://your-host.example/ python3 scripts/publish.py  # latest ad -> site/
pip3 install pillow               # optional — enables photo resizing
```

## How it works

```
inbox/<item>/   photos land here, one folder per object
   ↓            the uj-hirdetes skill: reads photos, asks questions
ads/<id>/ad.md  ← SOURCE OF TRUTH (facts in frontmatter, prose in Markdown)
   ↓            scripts/build.py — pure, deterministic, no AI, no network
ads/<id>/index.html      preview + copy buttons
ads/<id>/export/*.txt    ready to paste, one per platform
ads/<id>/export/photos/  resized
```

Edit `ad.md`, rebuild. Never edit the generated files — they get overwritten.

## Layout

| Path | What |
|---|---|
| `docs/` | Vision, architecture, schema, market research, roadmap, platform playbook |
| `inbox/<item>/` | Drop zone for photos — one folder per object |
| `ads/` | One folder per item — this *is* the database |
| `scripts/build.py` | `ad.md` → HTML + exports + photos |
| `scripts/publish.py` | Latest `ad.md` → buyer-facing `site/index.html` |
| `scripts/serve.py` | Local gallery, status tracking, expiry warnings |
| `templates/ad.css` | All styling. Edit freely. |
| `.claude/skills/uj-hirdetes/` | The ad-creation workflow |

## Read the docs

- **[Core product plan](docs/10-core-plan.md)** — current proposed foundation: simple selling, community catalogues, sharing, sustainability and the first app slice
- **[Vision & philosophy](docs/01-vision.md)** — why an ad is a document, not a form submission
- [Architecture](docs/02-architecture.md) — how the pieces fit and why
- [`ad.md` schema](docs/03-ad-schema.md) — every field
- [Market research](docs/04-market-research.md) — who else builds this, and an honest verdict on value
- [Roadmap](docs/05-roadmap.md) — what's next, and why "skill before web app"
- [Platform playbook](docs/06-platform-playbook.md) — what each marketplace wants
- [Hungarian platform capabilities](docs/13-platform-capabilities-hungary-2026-09.md) — current official-source integration and policy evidence
- [Publishing connector matrix](docs/14-platform-publishing-connectors-hungary.md) — APIs, feeds, Playwright alternatives and partner gaps
- [AI-first open listing platform assessment](docs/15-ai-first-open-listing-platform-market.md) — Hungarian and international market, MCP/API architecture, business models and kill criteria
- [Competitive research](docs/07-competitive-research-2026-09.md) — current competitors and positioning hypotheses
- [Product stack](docs/08-product-stack.md) — inspected starter, recommended web/mobile stack, and first implementation slice

## Two decisions worth knowing up front

**Files, not a database.** Every ad is a folder with a Markdown file. Readable
without this software, backed up by Dropbox, versioned by git, still meaningful
in twenty years.

**We prepare, you post.** No reviewed platform currently provides a verified public
listing-and-status API suitable for ordinary Hungarian sellers through this app. Vinted
explicitly restricts unauthorized external tools; Meta documents enforcement against
unauthorized scraping. Professional/partner tooling exists on some platforms, but needs
written eligibility and scope. The current product therefore prepares the package and
records seller-confirmed status without pretending it verified publication.

Status: **v0** — working, minimal, in use.
