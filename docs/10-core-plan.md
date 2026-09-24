# Core plan: your things, ready for their next owner

2026-09-08 · Product foundation; business and community hypotheses remain unvalidated. The [first local prototype](11-prototype.md) now implements the individual-item loop.

**Help someone move an item on with as little work as possible, while keeping control of its record and where it appears.**

Hungarian promise: **„Fotózd le. Segítünk továbbadni.”**

This is the current planning recommendation. It keeps the ownership philosophy in [01](01-vision.md) and the stack baseline in [08](08-product-stack.md), while widening [09](09-direction-2026-09.md) beyond occasional sellers and one annual event. The [research update](07-competitive-research-2026-09.md#synthesis-update--2026-09-08) records evidence and limitations. Earlier calendars are historical; follow the [current checklist](05-roadmap.md#current-core-plan--2026-09-08).

## 1. The product's centre

**One item record; a useful page; many places to share it.** A seller can use it alone. A household, club or neighbourhood can collect selected pages into its own small catalogue. Existing marketplaces continue to bring buyers.

Meta Seller already offers AI listing creation and an item-based inbox; Nifty covers crosslisting and inventory. Our proposed middle ground is **personal selling assistance plus community-run catalogues**, with portable records underneath. This combination must earn its place through easier real sales; it is not a proven empty market. [Meta](https://about.fb.com/news/2026/07/introducing-seller-app-facebook-marketplace/), [Nifty](https://www.nifty.ai/).

“Decentralized” means sellers control their items, communities control their membership and catalogue rules, and both can leave with useful data. Start with one hosted service. Independent hosting and interoperable public feeds follow only when another community wants to operate them. The first service is centrally hosted; export alone does not make it a decentralized network.

## 2. One simple flow, with room to grow

**Photograph → confirm the missing facts → preview → share → finish.**

The phone home screen shows **„Új tárgy”**, unfinished drafts and the next useful action. Use large photos, short Hungarian labels, readable contrast, labelled buttons, visible saving and undo. Keep detailed fields and batch controls behind an explicit action.

Capture or import before a profile questionnaire. Save the draft locally; explain cloud processing and establish a session when AI/upload is needed. Suggest the object, title and missing photographs. Ask only what cannot be established: working condition and defects, price, pickup/shipping. Reuse visibly editable seller defaults. “Nem tudom” is a valid answer; an empty defects list must never automatically mean flawless.

The preview is the editing surface: tap a fact or sentence to correct it, with optional tone changes. Preserve known defects in every version. Offer a price only with usable evidence and uncertainty; otherwise let the seller enter one or save an unfinished draft. Do not invent a bargain price to remove a question.

| Need | Extra help using the same item |
|---|---|
| Occasional seller | One item, a clear price and collection arrangement, a ready share package |
| Person with no time | Bundle items, choose a collection window, or invite a known helper; later request an offer from a participating dealer |
| Community or niche | A shared catalogue, relevant filters, local rules and category-specific photo/question templates |
| Frequent dealer | Repeat an item template, capture a batch, use a desktop stock view, export records and manage collaborators |

Avoid making sellers choose a persona during onboarding. The default path serves the busy individual; dealer batch/team tools follow only after the one-item loop passes. A bicycle template asks about size and brakes; furniture asks dimensions and collection access. Templates change questions and filters, not the whole application.

A helper receives revocable access to selected items, with clear authority to edit, share or arrange pickup. Keep the owner and acting helper visible. Test this with someone the seller already knows. Finding strangers to sell on commission is a separate operational business. Dealer buyouts, which trade price for convenience, are a later experiment outside the first slice.

## 3. Make sharing useful to the recipient

A buyer opens a link without installing or registering. The page shows photos, condition, price, approximate location, collection terms, current availability and one working contact route chosen by the seller. A forwarded link must still let someone contact the seller. Do not publish a home address or phone number by default.

**The natural sharing unit is often a collection:** “everything from our move”, “this weekend's street sale”, “bikes available at our club”. Someone forwards it because several relevant items are easy to browse. Each page can lead to the seller's other available items and a quiet “Create your own” action.

Offer a rich link, QR code and plain text/photo package. Test previews in real messaging apps. Where group rules or marketplace formats discourage links, supply a complete native post; the product must remain useful even when nobody clicks back. Marking an item sold updates our page and collections, then shows outstanding external removals. External posts and cached previews may remain stale.

Launch through **one active local group and one recurring niche**, ideally overlapping: for example, a local cycling club with a repair shop. With host agreement, help prepare their first collection and a short photo-to-share demonstration. An event can introduce the product, but ordinary year-round sharing must sustain it. Biatorbágy is a candidate, not an agreed partnership or fixed launch date.

The growth hypothesis is: host invites sellers → sellers share useful collections → recipients find something or forward it → some make their own. Measure each step. Do not assume virality. Defer broad paid advertising until people use a second item and hosts request another collection.

## 4. Community longevity needs ownership and paid work

Let hosts choose membership, niche fields, posting frequency and whether commercial sellers are welcome. Begin with an invited group, host approval/removal and a visible reporting route. Before opening membership, add blocking, removal reasons, expiry prompts and moderator handover. Label dealers and allow a separate dealer view so stock changes do not overwhelm neighbours. Even a small catalogue creates moderation work.

The lesson from [Freecycle](https://www.freecycle.org/pages/about) is local stewardship; from [Open Food Network](https://openfoodnetwork.org/) it is shared software with local operators. These are precedents, not proof of demand for this product.

Start with a documented export format, backups and migration. Hosts need ownership transfer and community exports that exclude members' private records. Keep seller exports free, complete and usable without our service. For independent community operation, propose an openly licensed core/template library, documented hosting, a public roadmap and at least two maintainers. Settle licensing and prove another operator can run it before claiming community continuity.

Test modest free use, occasional AI packs, dealer subscriptions for batch/team tools, and community hosting paid by a host or named sponsor. Revenue pays for media, AI, support, moderation and maintenance. Cap costly processing; do not depend on unlimited free AI or unpaid volunteers. Avoid selling personal data or selling better placement in community results. Community control must include a credible exit, not just a feedback forum.

## 5. The smallest coherent application

**Mobile web first, desktop from the same app.** Start from the [existing proposed stack](08-product-stack.md): React/TanStack Start for seller and public pages, Cloudflare for web/media, Convex for business records and jobs, and Better Auth for sessions. Keep business authorization in one backend. The repo's Python workflow remains usable during migration.

Model items, original/derived assets, confirmed facts and AI suggestions, collections/memberships, per-destination postings and saved jobs. Separate sale state from visibility: private draft, link-shareable, or listed in selected collections. A private group requires access checks; an unlisted link can be forwarded. Public pages receive an explicit allowlist of fields and approved images with location metadata removed.

Cache public pages; run AI only on demand and save results. Use item revisions and bounded retries so delayed generation cannot overwrite seller edits. Export/import a versioned item package with originals, facts, variants and history; provide a separate public-only static catalogue export. Backend export is not the same as a tested migration—prove a round trip.

Use manual copy/share handoffs initially. Integrations need documented access, account eligibility and verified success. Retain native marketplace contact/transaction options. Add Expo only if real iPhone/Android testing shows capture or sharing friction that justifies a second UI. Federation, global search, payments, automatic negotiation and a unified external inbox stay outside the first slice.

## 6. What to prove before expanding

First prove **phone photos → confirmed item → shareable page → actionable contact → sold update → portable export**, with one niche template and a Jófogás/Facebook posting package. Then add one host-curated collection as the smallest community experiment. Each must be useful independently.

Use the existing 12-seller/36-item pilot as a directional study, including busy households, repeat sellers and a participating host. Target at least 30% less preparation/handoff time than their current method, zero material invented facts or omitted known defects, and second-item reuse by at least six participants. Measure interruptions and pickup coordination separately: faster copy alone does not prove less selling work.

Before community expansion, require two non-developer hosts to publish a second collection without assistance and test contact from a forwarded link without an app account. Observe real purchases covering measured per-user service costs, then budget maintenance and moderation separately. These are proposed gates, all **NOT RUN**. If exports help but collections do not spread, keep the facilitator useful and postpone network expansion. If assisted selling wins, deepen the helper flow before adding marketplaces.
