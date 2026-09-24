# `ad.md` schema — v1

Status: draft v0.1 — 2026-07-30

The frontmatter contract. Everything that reads an ad reads only these fields.
Field names are English (stable, greppable); **all values the buyer sees are Hungarian.**

---

## Complete example

```markdown
---
schema: 1
id: example-city-bike
created: 2026-07-30
updated: 2026-07-30
status: draft

title: "Csepel női városi kerékpár, 28 colos, jó állapotban"
subtitle: "Városi közlekedésre, kosárral"
category: sport-szabadido/kerekpar
condition: used-good

price:
  amount: 35000
  currency: HUF
  negotiable: true
  original: 55000        # optional — what it cost new, for context
  floor: 20000           # PRIVATE. never exported, never rendered publicly

attributes:
  brand: Csepel
  model: "Budapest B"
  year: 2019
  color: "sötétzöld"
  wheel_size: "28\""
  frame_size: "19\""
  gears: "3 sebességes agyváltó"
  weight_kg: 16

defects:
  - "a hátsó sárvédőn kis horpadás"
  - "az első fék állítást igényel"
accessories:
  - "első kosár"
  - "pumpa"

location:
  city: Budapest
  district: XIII
  county: Budapest
  postal: "1134"

shipping:
  - personal          # személyes átvétel
  - foxpost
package:              # required by Jófogás/Vatera to offer shipping
  weight_kg: 16
  size_cm: [180, 60, 100]

photos:
  - file: 01.jpg
    cover: true
    alt: "A kerékpár oldalról, teljes egészében"
  - file: 02.jpg
    alt: "A váz és a váltó közelről"
    crop: { x: 0.1, y: 0.05, w: 0.8, h: 0.9 }
  - file: 03.jpg
    alt: "A hátsó sárvédőn lévő horpadás"
    rotate: 90

keywords: [kerékpár, bicikli, női bicikli, városi kerékpár, Csepel, 28 colos]

platforms:
  - name: jofogas
    status: pending          # pending | posted | expired | removed
  - name: facebook-marketplace
    status: pending
  - name: facebook-group
    status: pending
    note: "Bicikli Adok-Veszek Budapest"

contact:
  method: platform           # platform | phone | email
  note: "Hétköznap 17 óra után tudok válaszolni"

# --- filled in when it sells; this is the archive that compounds ---
sale: {}
# sale:
#   date: 2026-08-14
#   final_price: 32000
#   platform: jofogas
#   days_listed: 15
#   inquiries: 6
#   note: "alkudott 3000-et, elvitte helyben"
---

## Leírás

Eladó a képeken látható Csepel Budapest B női városi kerékpár...

## Állapot

...

## Átvétel

...
```

---

## Field reference

### Identity & lifecycle

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `schema` | int | ● | Always `1` for now. Lets future tools migrate safely. |
| `id` | string | ● | Equals the folder name, `YYYY-MM-DD-slug`. Immutable after publishing — it becomes the public URL. |
| `created` / `updated` | date | ● | ISO `YYYY-MM-DD`. |
| `status` | enum | ● | `draft` · `active` · `reserved` · `sold` · `archived` |

`status` drives everything downstream: `draft` isn't exported, `sold` triggers the
take-down checklist, `archived` drops out of the gallery but keeps the data.

### Content

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `title` | string | ● | Hungarian. Aim ≤ 60 chars so it survives every platform's truncation. Front-load the noun: buyers scan the first three words. |
| `subtitle` | string | | One line of context. Used on the web page, not on marketplaces. |
| `category` | path | ● | Our own taxonomy, `top/sub`. Mapped per platform via a lookup table, never guessed. |
| `condition` | enum | ● | `new` · `like-new` · `used-good` · `used-fair` · `for-parts` |
| `keywords` | list | | Hungarian search terms buyers actually type, including misspellings and English variants (`bicikli`, `bringa`, `bike`). Appended to platform descriptions where it helps ranking. |

**`condition` values in Hungarian** (rendered, not stored):
`new` → *Új* · `like-new` → *Újszerű* · `used-good` → *Használt, jó állapotú* ·
`used-fair` → *Használt, kopott* · `for-parts` → *Hibás / alkatrésznek*

### Price

| Field | Type | Req | Notes |
|---|---|:--:|---|
| `price.amount` | int | ● | Integer HUF. No decimals, no separators. |
| `price.currency` | string | ● | `HUF`. Present so EUR is a config change, not a refactor. |
| `price.negotiable` | bool | ● | Renders as *"Ár alku képezhető"* / *"Fix ár"*. |
| `price.original` | int | | New price, for anchoring. Optional and honest — don't inflate it. |
| `price.floor` | int | | **Private.** Your walk-away number. Never exported, never in HTML. Exists so you don't improvise under pressure in a chat. |

> `price.floor` is deliberately in the file rather than in your head. The build script has
> an explicit test that it never appears in any output.

### Attributes & honesty fields

`attributes` is an open key–value map — different objects need different facts. Common keys
per category should converge over time into `docs/06-platform-playbook.md`.

`defects` is the field that earns trust. Every entry is one short Hungarian phrase. The
generated description always includes them, in their own paragraph, unhedged.

> **Why this is mandatory rather than optional:** in C2C the expensive failure isn't a slow
> sale, it's a buyer who travels across town, finds a scratch you didn't mention, and
> either walks or grinds the price down. Listing defects up-front costs a few percent of
> asking price and saves the wasted meeting. It also makes every other claim in the ad
> credible. If there are genuinely none, write `defects: []` — the renderer prints
> *"Hibátlan, sérülésmentes."*

### Location & shipping

`shipping` values: `personal` · `foxpost` · `mpl` · `gls` · `post` · `courier`.

Jófogás and Vatera use service-specific delivery data. Carrier availability, thresholds and
parcel limits change, so store the chosen service with `package.weight_kg` and
`package.size_cm` and verify the current platform UI. These fields are **required if any
non-`personal` shipping method is listed**; the build script warns if they're missing.

### Photos

| Key | Notes |
|---|---|
| `file` | Filename inside `photos/`. |
| `cover` | Exactly one photo must have `cover: true`. It becomes the OG image and the first photo on every platform. |
| `alt` | Hungarian. Accessibility, SEO, and it forces you to look at what the photo actually shows. |
| `crop` | `{x, y, w, h}` as fractions of the image, 0–1. Resolution-independent. |
| `rotate` | `0` · `90` · `180` · `270`. Applied **before** crop. |

Order in the list is the display order. The cover photo does most of the selling work —
worth more attention than the description.

### Platforms

Tracks where this ad currently exists. `status` per entry:
`pending` → not posted yet · `posted` → seller-confirmed live · `expired` → the
seller/platform reports expiry · `removed` → taken down by the seller. Vatera's reviewed
maximum is 21 days; no current universal Jófogás lifetime was verified. Store external URLs and
reminders separately from remote-state verification.

When `status` at the ad level becomes `sold`, every platform entry still `posted` becomes a
to-do item. **This is the single most valuable small feature in the project** — it is the
failure everyone actually experiences.

### Sale record

Empty (`{}`) until sold. Then it is never edited again. This is the archive: asking vs.
final price, which platform produced the buyer, days on market, how many inquiries. Thirty
of these and you can answer questions no marketplace will answer for you.

---

## Body structure

Markdown after the frontmatter. Conventional headings, all Hungarian:

```markdown
## Leírás        ← what it is, why someone wants it (2–4 sentences)
## Állapot       ← honest condition, including everything in `defects`
## Paraméterek   ← optional; usually generated from `attributes` instead
## Átvétel       ← where, when, how it can be collected or shipped
```

The build script renders these into HTML and assembles platform exports from them.
Keep sentences short. Hungarian marketplace buyers scan; they don't read.

---

## Validation rules

The build script checks and warns (never silently fixes):

1. `id` matches the folder name.
2. Exactly one photo has `cover: true`.
3. Every `photos[].file` exists on disk; every file in `photos/` is listed.
4. `price.amount` is a positive integer.
5. `title` ≤ 60 characters (warn only).
6. `defects` is present — even if empty. Missing means you didn't consider it.
7. `package` present if shipping includes anything other than `personal`.
8. `status: active` requires at least one `platforms[]` entry.
9. **`price.floor` never appears in any generated file.** Hard failure.
