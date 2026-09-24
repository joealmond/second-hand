---
name: uj-hirdetes
description: Create a new second-hand advertisement in Hungarian from photos. Use when the user drops photos into inbox/, says "make an ad", "új hirdetés", "csináljunk egy hirdetést", "list this item", or asks to sell something. Reads the photos, asks the few questions photos can't answer, writes ad.md, and builds the preview page plus ready-to-paste text for Jófogás, Facebook Marketplace, Facebook groups, Vatera and HardverApró.
---

# Új hirdetés — ad creation workflow

You are writing an advertisement for a **Hungarian** second-hand marketplace.
Talk to the user in whatever language they use. **Everything the buyer will read
is Hungarian.**

Project root: the `second-hand` folder. Read `docs/03-ad-schema.md` if you need
the full field reference; the essentials are below.

---

## Step 1 — Look at the photos

Photos are in `inbox/` (or wherever the user points you). **Actually read them
with the Read tool** — do not guess from filenames.

From the images, extract everything you legitimately can:

- what the object is; brand and model if any text, logo or label is visible
- colour, material, approximate size, obvious accessories in frame
- **visible wear**: scratches, dents, fading, missing parts, stains, rust
- context clues about age and generation (connector types, styling, labels)

Then tell the user what you see, plainly, in two or three sentences. Something like:

> "Ez egy Csepel női városi kerékpár, kb. 28 colos kerekekkel, sötétzöld,
>  első kosárral. A hátsó sárvédőn látok egy horpadást, a gumik használtnak
>  tűnnek. Jól látom?"

**State your uncertainty.** If you can't read the model number, say so and ask.
A confidently wrong brand in an ad is worse than an honest gap.

If the user gave a text file or a prompt describing the item, use it as the
primary source and the photos as confirmation.

## Step 2 — Ask what the photos can't tell you

Use **AskUserQuestion**, and ask **at most 4–5 questions in one round.** This is
the whole difference between a fast tool and an annoying one. Never interrogate.

Priority order — only ask what you actually still need:

1. **Ár** — how much? Offer a bracket if you can reason about it, but don't
   invent a market price you don't have evidence for. Also ask whether it's
   negotiable, and (optionally) their walk-away floor — that goes in
   `price.floor` and is **never** published.
2. **Állapot / hibák** — anything wrong that isn't visible in the photos? Ask
   directly. Push gently if they say "semmi" — buyers find things.
3. **Kor / használat** — when bought, how much used, is there a receipt,
   warranty, original box?
4. **Átvétel** — city and district, personal pickup only or postable? If
   postable, you need approximate weight and box dimensions (Jófogás requires
   them to offer shipping).
5. **Miért adja el** — one sentence. This is optional but it lands well in
   Hungarian ads: "költözés miatt", "nagyobbra váltottunk". It signals a normal
   private seller rather than a reseller.

Skip anything already obvious. If the user says "just write it, use your
judgement", write it and clearly mark the assumptions you made.

## Step 3 — Create the ad folder

```
ads/YYYY-MM-DD-slug/
├── ad.md
└── photos/          ← move the images here, renamed 01.jpg, 02.jpg, ...
```

- Slug: ASCII-folded lowercase Hungarian, e.g. `noi-kerekpar-csepel`.
- **Move** the photos out of `inbox/` (don't copy — the inbox should end empty).
- Renumber so the **cover photo is 01** — the best full view of the object,
  well-lit, whole thing in frame. This photo does most of the selling.
- Put the defect close-ups last.

## Step 4 — Write `ad.md`

Frontmatter fields are English, all values Hungarian. Minimum viable set:

```yaml
---
schema: 1
id: 2026-07-30-noi-kerekpar-csepel
created: 2026-07-30
updated: 2026-07-30
status: draft

title: "Csepel női városi kerékpár, 28 colos"
category: sport-szabadido/kerekpar
condition: used-good          # new | like-new | used-good | used-fair | for-parts

price:
  amount: 35000
  currency: HUF
  negotiable: true

attributes:
  brand: Csepel
  model: "Budapest B"
  year: 2019
  color: "sötétzöld"

defects:
  - "a hátsó sárvédőn kis horpadás"
accessories:
  - "első kosár"

location: { city: Budapest, district: XIII }
shipping: [personal]

photos:
  - { file: 01.jpg, cover: true, alt: "A kerékpár oldalról, teljes egészében" }
  - { file: 02.jpg, alt: "A hátsó sárvédőn lévő horpadás" }

keywords: [kerékpár, bicikli, női bicikli, Csepel, 28 colos]

platforms:
  - { name: jofogas, status: pending }
  - { name: marketplace, status: pending }
---

## Leírás
...

## Állapot
...

## Átvétel
...
```

`defects` must always be present — write `defects: []` if there genuinely are
none. Omitting it means you didn't think about it.

Include `package: { weight_kg: N, size_cm: [a, b, c] }` if `shipping` has
anything other than `personal`.

## Step 5 — Write the Hungarian text

This is the actual craft. Rules:

**Title (≤ 60 characters)**
Front-load the noun and the distinguishing feature. Buyers scan the first three
words in a list view.

- ✅ `Csepel női városi kerékpár, 28 colos, jó állapotban`
- ❌ `Eladó egy szép kis bicikli amit alig használtam` — the noun arrives fourth

**Description — four short paragraphs, in this order:**

1. **Mi ez** — what it is and its main virtue, 2–3 sentences. Concrete, not
   promotional.
2. **Állapot** — honest condition. Every item from `defects` appears here in
   plain words. No hedging, no "apró szépséghibától eltekintve hibátlan".
3. **Paraméterek** — usually generated from `attributes` by build.py, so don't
   duplicate it in prose unless the category needs it.
4. **Átvétel** — where, when, how.

**Voice**

- Természetes, tegező-semleges magyar. Write "Eladó a képeken látható…", not
  marketing copy.
- Short sentences. Marketplace buyers scan.
- **No superlatives, no exclamation marks, no ALL CAPS, no emoji** in the base
  text. `build.py` adds emoji-friendly variants where a platform wants them.
- No fake urgency ("Sürgősen!", "Utolsó darab!"). It reads as a scam signal in
  Hungarian C2C.
- Never claim something you can't see in the photos or that the user didn't say.
  If you're inferring, mark it and let the user confirm.
- Include the honest reason for selling if given.

**Keywords** — the words Hungarians actually type, including colloquialisms and
English variants: `bicikli`, `bringa`, `bike`. These go in the `keywords` field,
not stuffed into the prose.

## Step 6 — Build

```bash
python3 scripts/build.py ads/YYYY-MM-DD-slug
```

Read the output. It prints validation warnings — **fix them, don't ignore them.**
Common ones: title too long, missing alt text, photo on disk not listed in
`ad.md`, shipping declared without package dimensions.

If Pillow isn't installed the build still works, photos are just not resized.
Mention `pip3 install pillow` once, don't nag.

## Step 7 — Hand it over

Present the result with `mcp__cowork__present_files`:

- `ads/<id>/index.html` — the preview page
- optionally `ads/<id>/ad.md` — if they want to edit the source

Then, briefly:

- Show the **title and price** so they can sanity-check the two things that
  matter most.
- Note anything you **assumed or guessed**, so they can correct it.
- Tell them the exports are ready: `ads/<id>/export/jofogas.txt` etc., and that
  the preview page has copy buttons.
- Remind them to set `status: draft` → `active` and update `platforms[].status`
  to `posted` once they've actually posted. **This is what prevents stale ads
  later**, and it takes ten seconds.

Don't write a long summary. They can see the page.

---

## Other jobs this skill covers

**Price change** — edit `price.amount` in `ad.md`, rebuild. Mention that the
price should be changed on every platform the same day.

**Item sold** — set `status: sold`, fill the `sale:` block (date, final price,
which platform produced the buyer, days listed, number of inquiries), then list
every platform still marked `posted` as a take-down checklist. Push on this: a
sold item left live is the single most common failure in this whole workflow.

**Adding a platform later** — add an entry to `platforms[]` and rebuild; the
export for it appears.

**Second, similar item** — copy an existing `ad.md` as the starting point, change
what differs. Much faster than starting from zero, and the phrasing stays
consistent across the user's ads, which reads as a trustworthy seller.

---

## Hard rules

1. **Never invent facts.** Not a brand, not a model year, not a spec. If you
   inferred something from a photo, say that you inferred it.
2. **Never hide a defect.** Not in the base text, not in a platform variant.
3. **`price.floor` never leaves `ad.md`.** Not in exports, not in HTML, not in
   your chat summary. `build.py` enforces this and will fail the build.
4. **Never post anything anywhere.** This tool prepares text; the human posts
   it. Facebook Marketplace and Vinted forbid automated posting and ban accounts
   for it. Do not offer to drive a browser to post ads.
5. **`ad.md` is the source of truth.** Never edit `index.html` or `export/*` —
   they are regenerated and your changes will vanish. Edit `ad.md`, rebuild.
6. **Ask few questions, once.** Two rounds maximum.
