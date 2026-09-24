# Architecture

Status: draft v0.1 — 2026-07-30

---

## 1. Shape of the system

```
photos + a few answers  ──►  ad.md  ──►  build  ──►  index.html
                             (truth)              ├─► export/jofogas.txt
                                                  ├─► export/facebook.txt
                                                  ├─► export/vatera.txt
                                                  └─► export/photos/*.jpg (resized)
```

Three stages, deliberately separate:

| Stage | Who does it | Input | Output |
|---|---|---|---|
| **Capture** | you + AI (the skill) | photos, prompt, answers | `ad.md` |
| **Build** | `scripts/build.py` — pure, deterministic | `ad.md` | `index.html`, `export/` |
| **Publish** | you, assisted | `export/` | live listings |

The middle stage has no AI and no network. It is a pure function. That means you can
rebuild every ad you ever made, offline, in one second, and get byte-identical output.
Anything non-deterministic (AI writing, price suggestions) happens in *capture* and is
frozen into `ad.md`.

> **Why this matters:** it's the difference between a tool you can trust and one you have
> to re-check. If the build were an AI call, no two builds would agree and you could never
> safely regenerate.

## 2. Directory layout

```
second-hand/
├── README.md
├── docs/                        ← you are here
├── inbox/                       ← one folder per item; the skill empties it
│   ├── README.md
│   ├── bicikli/                 ← photos of item 1
│   │   ├── IMG_4821.jpg
│   │   └── IMG_4822.jpg
│   └── mosogatogep/             ← photos of item 2
├── ads/                         ← one folder per item; this is the database
│   └── 2026-07-30-noi-kerekpar-csepel/
│       ├── ad.md                ← SOURCE OF TRUTH
│       ├── index.html           ← generated preview / admin page
│       ├── photos/              ← originals, never modified
│       │   ├── 01.jpg
│       │   ├── 02.jpg
│       │   └── 03.jpg
│       └── export/              ← generated, safe to delete
│           ├── jofogas.txt
│           ├── facebook.txt
│           ├── vatera.txt
│           ├── marketplace-group.txt
│           └── photos/          ← resized/cropped derivatives
├── scripts/
│   ├── build.py                 ← ad.md → index.html + export/
│   └── serve.py                 ← local server + gallery of all ads
├── templates/
│   └── ad.css                   ← all styling lives here, editable without touching Python
├── site/                        ← generated: the whole gallery, publishable as-is
└── .claude/skills/uj-hirdetes/  ← the ad-creation workflow
```

### Naming
Ad folders are `YYYY-MM-DD-slug`. Date-prefixed so `ls` sorts chronologically; slug is
lowercase ASCII-folded Hungarian (`női kerékpár` → `noi-kerekpar`). The slug becomes the
public URL segment later, so it must be stable — **never rename an ad folder after
publishing.**

### Why one folder per ad
The alternative — `input/` and `output/` as sibling top-level folders, as in the original
sketch — separates things that belong together. The moment you have twelve ads, you can't
tell which photo belongs to which listing. Keeping the object's whole life in one
directory means you can move it, archive it, zip it and mail it, or delete it, in one
operation. It also means the ad folder is self-contained enough to be its own git repo, or
its own published page directory, with no path rewriting.

## 3. Data model

`ad.md` = YAML frontmatter (facts) + Markdown body (prose). Full field reference in
[03-ad-schema.md](03-ad-schema.md). Summary:

```markdown
---
id: 2026-07-30-noi-kerekpar-csepel
status: draft            # draft | active | reserved | sold | archived
title: "Csepel női városi kerékpár, 28 colos"
price: { amount: 35000, currency: HUF, negotiable: true }
condition: used-good
category: sport-szabadido/kerekpar
attributes: { brand: Csepel, wheel_size: "28\"", frame: "19\"" }
defects: ["a hátsó sárvédőn horpadás", "a fék állítást igényel"]
location: { city: Budapest, district: XIII, county: Budapest }
shipping: [personal, foxpost]
photos: [ { file: 01.jpg, cover: true, alt: "..." } ]
platforms: [ { name: jofogas, status: pending } ]
---

## Leírás
Hungarian prose here.
```

**Frontmatter is the contract.** The build script and every future component — a web UI, a
database importer, a mobile app — read only these fields. Adding a field is cheap; changing
the meaning of one is expensive. Version the schema (`schema: 1`) from day one.

### Why Markdown and not JSON or SQLite
- Hand-editable in any editor, on any device, including a phone.
- Diffs are readable, so git history is meaningful ("lowered price 40k → 35k").
- The prose and facts live in one file, so an ad can't get half-copied.
- Migrating *to* SQLite later is a 40-line script. Migrating *from* SQLite to something
  human-readable is a project.

The trade-off is no queries and no referential integrity. At 500 ads that's fine — you
parse everything in under a second. At 50,000 it isn't, and that's the signal to add a
generated index (`site/index.json`) as a **cache**, still derived from the files.

## 4. Photo pipeline

```
photos/01.jpg  ──(recipe in ad.md)──►  export/photos/01-jofogas.jpg   1200×1200
originals                             export/photos/01-og.jpg        1200×630
never touched                         export/photos/01-thumb.jpg      400×400
```

Edits are declarative, stored per photo:

```yaml
photos:
  - file: 01.jpg
    cover: true
    crop: { x: 0.1, y: 0.0, w: 0.8, h: 1.0 }   # fractions, resolution-independent
    rotate: 90
    alt: "A kerékpár oldalról, teljes egészében"
```

Fractional crop coordinates survive re-scanning at a different resolution. Rotation is
applied before crop. Order is fixed and documented so results are reproducible.

Requires Pillow (`pip install pillow`). If Pillow isn't present, build.py still produces
HTML and text exports, and simply copies photos through unresized — the tool degrades, it
doesn't fail.

## 5. Per-platform projection

Each platform is a small config: title length limit, description length limit, whether
Markdown/emoji are allowed, photo count and aspect ratio, category mapping, tone.

```python
JOFOGAS = Platform(
    title_max=60, body_max=4000, allows_markdown=False,
    photo_max=10, photo_size=(1200,1200),
    tone="factual, complete, keyword-rich",
)
FACEBOOK_GROUP = Platform(
    title_max=100, body_max=1500, allows_emoji=True,
    photo_max=10, photo_size=(1200,1200),
    tone="short, friendly, first line must hook — feed truncates at ~3 lines",
)
```

v0 keeps this deliberately dumb: truncation, template assembly, and a per-platform
`export/*.txt` you copy. v1 lets the AI *rewrite* per platform rather than truncate — but
only on demand, written back into `ad.md` as `variants.facebook.body`, so the build stays
pure.

**Rule: the AI's output is always committed to the source file.** No hidden generation at
build time.

## 6. The viewer / admin page

`index.html` per ad is self-contained (inlined CSS, relative image paths) and opens with a
double-click — no server needed. It shows the photo gallery, the facts as a table, the
prose, and one copy-button per platform export.

`scripts/serve.py` adds what a file can't do: a gallery across all ads, filtering by
status, and eventually write-back (editing `ad.md` from the browser). It's a stdlib
`http.server` — no npm, no build step, no dependencies to rot.

**Design intent:** this page is the ancestor of the future public ad page. Same HTML, same
CSS, same JSON-LD — the admin version just has extra controls that are hidden when
published. That way we never build the public page twice.

Every generated page already includes:

```html
<meta property="og:title" content="Csepel női városi kerékpár, 28 colos">
<meta property="og:image" content="export/photos/01-og.jpg">
<meta property="product:price:amount" content="35000">
<script type="application/ld+json">{"@type":"Product", ...}</script>
```

None of it is used today. All of it is required the day you publish, and adding it
retroactively to 200 ads is worse than carrying it from the start.

## 7. Where AI sits

| Task | AI? | Why |
|---|---|---|
| Reading photos → guessing what the object is | yes | this is the magic |
| Asking the 3–5 questions that photos can't answer | yes | condition, price, defects |
| Writing Hungarian prose from facts | yes | the actual labour |
| Per-platform rewriting | yes, on demand | tone differs genuinely |
| Rendering HTML | **no** | must be deterministic |
| Resizing photos | **no** | must be deterministic |
| Category mapping | no, table lookup | must be correct, not plausible |
| Price suggestion | later, with real comps | a confident wrong price costs money |

## 8. Evolution path

Each step is additive; nothing above is thrown away.

1. **v0 — skill + build script.** Files, Markdown, static HTML. *You are here.*
2. **v0.5 — gallery + status tracking.** `serve.py` lists all ads; mark sold; the sold item
   generates a "remove from these 3 places" checklist.
3. **v1 — editing in the browser.** The page writes back to `ad.md`. Crop UI produces crop
   recipes. Still local, still files.
4. **v1.5 — publishing.** `site/` renders to a static host. Real URLs, rich link previews.
   Nothing about the data model changes.
5. **v2 — API integrations** where legitimately available; assisted flows elsewhere.
6. **v3 — multi-user.** *Only* here does a database appear, and files become the
   import/export format rather than the storage.

The reason to go in this order is that steps 1–4 are each independently useful. If the
project stops at 2, it was still worth building.

## 9. Deliberate non-choices

- **No framework.** Python stdlib + Pillow. The build script must run in five years on a
  machine with no internet and whatever Python ships with macOS.
- **No database in v0/v1.** See §3.
- **No login, no cloud, no sync in v0.** Dropbox or git already solve sync for a folder.
- **No headless-browser posting.** See [Vision §3.5](01-vision.md).
- **No mobile app until the desktop flow is proven.** Photos arrive from a phone, so a
  phone-side capture step is obviously right eventually — but "obviously right eventually"
  is how projects die before v0.

---

*Next: [Ad schema](03-ad-schema.md)*
