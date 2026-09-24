# Vision & Philosophy

*Project: **second-hand** — an ad workshop for people who sell used things.*
Status: draft v0.1 — 2026-07-30

---

## 1. The problem, stated plainly

Selling a used object in Hungary today means doing the same work three or four times.

You photograph the thing. You think of a title. You write a description. You guess a price.
Then you type all of it into Jófogás. Then you type it again into a Facebook Marketplace
form that has a different shape. Then into two Facebook groups, where the format is a
free-text post, not a form. Then maybe Vatera, which wants categories and shipping
dimensions. Each platform truncates your title differently, wants different photo
aspect ratios, and has its own category tree.

Three weeks later the item sells on Jófogás — and it stays live on Facebook for six more
months, because you forgot. You get messages about a bicycle you no longer own.

And when you want to sell the next bicycle, none of that work is available to you. You
don't remember what you asked for the last one, or what it actually sold for, or how long
it took.

**The work is repeated, the work is lost, and the state is inconsistent.**

## 2. The thesis

> An advertisement is not a form submission. It is a **document about an object**.

Everything follows from that sentence.

If an ad is a document, it has a life independent of any platform. It can be written once,
kept, revised, versioned, and *projected* onto whatever surface you need — a Jófogás form,
a Facebook post, a printed A5 flyer, a public web page, a QR code on the object itself.
The platforms become **rendering targets**, not the place where your data lives.

That inversion is the whole product. Everything else is implementation.

## 3. Principles

### 3.1 Files are the database
Every ad is a folder. Inside it: one Markdown file, the original photos, and generated
outputs. You can read it without our software. You can back it up with Dropbox, version it
with git, grep it, or open it in a text editor in twenty years.

No lock-in is not a feature we advertise — it is a constraint we accept so that the project
survives its own abandonment. If I stop building this next year, the ads still exist and
still make sense.

### 3.2 One source of truth, many projections
`ad.md` is canonical. The HTML page, the Jófogás text block, the Facebook post, the
JSON-LD, the resized photos — all of them are **build artifacts**. Deleting them and
rebuilding must produce the same result. Never edit an artifact; edit the source.

This is why the format is Markdown-with-frontmatter and not a database row: it is
simultaneously human-writable and machine-parseable, and it diffs cleanly.

### 3.3 Structured facts first, prose second
The common mistake is to write one description and paste it everywhere. That's why
cross-posted ads read badly — a Vinted listing and a Hardverapró listing want different
voices, different lengths, different emphases.

So we separate:

- **Facts** (frontmatter): brand, model, year, condition, dimensions, defects, price,
  location, shipping options. These are objective and platform-independent.
- **Prose** (body): the description, written *from* the facts.
- **Projections** (exports): per-platform text generated from facts + prose, respecting
  each platform's length limits, tone and category taxonomy.

Change a fact once, regenerate every projection. This is the difference between a
cross-poster and a content system.

### 3.4 Originals are immutable
Photos you drop in are never modified in place. Crops, rotations, resizes, watermarks and
background removals are stored as *recipes* in the ad's metadata and applied at build time
into `export/`. You can always go back to the original, and you can change your mind about
a crop three months later.

### 3.5 Assist, don't automate
No public third-party Marketplace listing/status API suitable for this Hungarian product was
found in the current official-source review. Meta documents enforcement against unauthorized
automated scraping, while Vinted explicitly restricts external tools unless authorized. Selected
partner/professional integrations exist on some platforms, but their eligibility and scope are
not public permission for this app.

So the product's current job is to make the human's five minutes into thirty seconds: useful text
in the clipboard, photos pre-resized in a folder, a checklist of what to click. Not to
pretend to be you. Where a platform *does* offer a legitimate API, we use it. Where it
doesn't, or our authority is unknown, we prepare the package and you submit it.

This is a strategic choice, not a limitation we regret. It is the difference between a tool
that still works in three years and one that dies with a policy update.

### 3.6 The ad is a place, not a message
Long term, each ad should be a real URL with a real page — proper Open Graph tags and
schema.org Product data so that pasting the link into Messenger, Viber, WhatsApp or a
Facebook comment produces a rich preview with the photo, title and price.

This is the "decentralized classifieds" idea: the ad lives at *your* address, and the
platforms become distribution channels pointing back at it. Even in v1 — where nothing is
published yet — the generated HTML already carries the correct metadata, so publishing
later is a copy operation, not a rewrite.

### 3.7 Local first, private by default
The photos of the inside of your flat are on your machine. Nothing uploads unless you say
so. AI is called for text generation, not as a place your data must live.

### 3.8 Memory is the compounding asset
Every sold item records: asking price, final price, days to sale, which platform produced
the buyer, how many messages it took. After thirty items you know things no marketplace
will tell you — what your stuff is actually worth, where your buyers come from, whether
haggling costs you more than it earns.

That archive is the reason to keep using it. Feature #1 gets you the first ad; this is what
gets you the hundredth.

## 4. What this is not

- **Not an inventory system for professional resellers.** Vendoo and List Perfectly own
  that market and do it well. This is for a person with a garage, not a warehouse.
- **Not a marketplace.** We do not want buyers, escrow, ratings or payments. We want to be
  the writing desk, not the shop.
- **Not a bot.** See 3.5.
- **Not a SaaS, yet.** It is a personal tool that is being built well enough that it *could*
  become one. That order matters — tools built for one real user tend to be good; tools
  built for an imagined market tend to be features without a spine.

## 5. Who it is for, in order

1. **Me.** A person who periodically clears out a flat and hates retyping.
2. **The Hungarian occasional seller.** 3–30 items a year, sells on Jófogás + Marketplace,
   currently does everything by hand. No international tool supports Hungarian platforms.
3. **The semi-pro.** A person who sells 10–50 items a month — vintage clothes, retro tech,
   furniture flipping. They feel the pain daily and have no Hungarian tool at all.
4. **Small used-goods shops** who need a public catalogue *and* marketplace presence and
   currently have neither, or maintain both by hand.

Group 2 is the largest and hardest to monetise. Group 3 is where a product could exist.
Group 1 is who we build for first, because that's the only way to find out what's real.

## 6. Success criteria

**v0 (this month).** I can drop photos in a folder, answer a few questions, and get a
finished Hungarian ad — text, photos, a preview page — in under five minutes, and post it
to Jófogás and Facebook by pasting.

**v1 (3 months).** Twenty real ads created this way. A gallery page showing all of them
with status. Never once posted a stale ad or forgot to remove a sold one.

**v2.** The archive tells me something I didn't know about how I sell.

If v0 doesn't beat doing it by hand, nothing after it matters.

## 7. Open questions

- **Price discovery.** Should the tool scrape comparable listings to suggest a price? It's
  the highest-value feature and the most legally awkward. Deferred, not dismissed.
- **Photo quality.** Bad photos lose more sales than bad text. A "shoot this object" guide
  or an AI critique of uploaded photos may matter more than any publishing feature.
- **Where does the public page live?** A GitHub Pages / Netlify static site is nearly free
  and fits the file-based model. But an ad page on `janos-cuccai.hu` may look less
  trustworthy to a Hungarian buyer than a Jófogás link. Needs testing with real buyers.
- **Multi-language.** Hungarian first. But a Hungarian selling to an Austrian buyer 60 km
  away is a real scenario, and "same facts, different language" is nearly free in this
  architecture.

---

*See also: [Architecture](02-architecture.md) · [Ad schema](03-ad-schema.md) ·
[Market research](04-market-research.md) · [Roadmap](05-roadmap.md) ·
[Platform playbook](06-platform-playbook.md)*
