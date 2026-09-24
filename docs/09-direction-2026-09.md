# Direction: the channel waterfall

**2026-09-08 planning update:** [10-core-plan.md](10-core-plan.md) widens the audience to busy individuals, communities and frequent sellers. The waterfall below remains an optional strategy; a festival-first launch and its calendar are historical proposals, not commitments or verified future event dates. See the [research update](07-competitive-research-2026-09.md#synthesis-update--2026-09-08) for claim qualifications.

Decision date: 2026-09-06. This document adjusts the recommendation in [07-competitive-research-2026-09.md](07-competitive-research-2026-09.md) and narrows the scope in [08-product-stack.md](08-product-stack.md). It does not replace them: the competitor findings stand, the stack decision stands.

**One item record, many channels, ordered by effort. The garage sale is the first channel and the onboarding; the marketplaces are the after-life; eBay is the long tail.**

---

## What changed since the 2026-09-04 research

Three findings and one local fact move the design. None of them was in the earlier documents.

**Meta shipped a standalone Seller app on 24 July 2026.** One photo produces title, description, suggested price and category; it adds bulk listing, an item-based inbox and a performance dashboard. Currently US, iOS, 18+, with Android in test. This is the previously proposed steps 1–4, free, inside the destination. Assume Hungarian availability is a question of time. Consequence: **listing-text generation is not a product.** It is table stakes, and the platform is absorbing it.

**Jófogás has pushed ads to Facebook Marketplace since June 2025**, activated by a checkbox in the Jófogás account, retroactive to existing ads, with category exclusions and Jófogás-side messaging. Consequence: in Hungary, the two destinations that matter most for a private seller are already cross-posted for free. A large part of the "create once, post everywhere" value proposition does not exist in this market. It also means **we only have to make one form painless to reach both.**

**No public third-party Marketplace listing/status API suitable for this Hungarian product was
found in the current official-source review.** Meta documents selected partner integrations and
enforcement against unauthorized scraping, but public evidence does not grant this app posting,
conversation or status access. Consequence: the current product boundary is a seller-controlled
handoff. **We build a co-pilot; any future automation needs written, scoped authorization.**

**The Garázsvásár Fesztivál in Biatorbágy runs on Sunday 13 September 2026, 9:00–18:00**, with over 100 registered locations, nine volunteer organizers working through the Juhász Ferenc Művelődési Központ, and 47 local sponsors. Registration is a Google Form; the venue list becomes public on 10 September; the map is a Google Map filterable by category per house. It is described as Hungary's largest garage sale festival. Consequence: **a recurring, institutionally supported, under-tooled event with 100 motivated sellers exists eight kilometres from the developer.**

---

## The target user, restated

The ordinary seller who clears out a few things a year. Not the reseller, not the power seller, not the tax-reporting threshold seller.

That choice was made deliberately and costs us something: this user will not buy a subscription. The monetisation answer is per-item packs or a paid flow at the moment of value, never a monthly fee. It is a real risk and it stays open until the pilot tests it.

Their two stated pain points, in their own words: **posting** and **dealing with buyers**. Everything below serves those two.

---

## The model: a channel waterfall

An item is photographed once and its facts confirmed once. After that the item moves through channels ordered by the effort they demand of the seller.

| Order | Channel | Effort | Reach | Money |
|---|---|---|---|---|
| 1 | The vásár — my own gate, one day | Lowest: cash, face to face, no account, no shipping, no scam exposure | One town, one day | Immediate |
| 2 | Jófogás (+ Facebook Marketplace free, via the checkbox) | Medium: one form, then buyer messages | National | Cash on collection, or Foxpost with cash on delivery |
| 3 | eBay | Highest: shipping, returns, fees — but a real API, so we can automate it | International | Platform-handled |

This matches how the target user actually feels: *I would rather just be rid of it locally; only if that fails do I want the hassle.* No competitor sells this ordering.

The waterfall also resolves the two halves of the product. The vásár has no retention on its own — one day a year. The assistant has no distribution on its own — cold start. Joined, the vásár is the acquisition event and the onboarding, and 18:00 on festival day is the conversion moment, when a hundred households are standing over what did not sell, at the most motivated hour of their year.

---

## Three surfaces, one app

**Tárgy** — photograph once, confirm the facts once. Largely exists as the `uj-hirdetes` skill and the `ad.md` schema. Needs to move inside the app.

**Vásár** — seasonal. A map of participating houses, an item-level feed and search, a reserve button. This layer must stay thin: no inbox, no ratings, no payments, no reputation system. Cash and face-to-face is a feature, not a gap. **If the Vásár layer grows its own product surface, it eats the year and we ship neither half.**

**Hirdetés** — year-round. Jófogás fill assistance, the eBay Sell API, the reply assistant, and a per-item timeline (érdeklődő → megbeszélve → feladva → eladva) with nudges.

### Inside Hirdetés: how the two pain points are actually addressed

*Posting.* One form — Jófogás — filled fast: photos already sized and ordered, category, price, title and description prefilled, one tap per field. Marketplace comes free from the checkbox. Realistically ten minutes becomes about one. Not zero; the claim must stay honest. eBay is the only channel we can genuinely automate, through its official Sell API with seller OAuth.

*Answering.* Decomposed, because it is not one problem:

1. **Prevent.** Roughly half the messages exist because the ad did not answer them. A structured pre-answer block — *Elvihető: Biatorbágy • Foxpost: igen, utánvéttel • Ár: fix • Működik: tesztelve* — removes the "Még megvan?" flood. No integration, largest single win, buildable first.
2. **Draft.** A share target or keyboard: the buyer's message goes in, a reply in the seller's voice with the item's confirmed facts comes out, one tap to paste. Works inside Messenger, Jófogás, Vinted and SMS without touching any API and without risking the account.
3. **Warn.** The Foxpost/MPL phishing pattern is endemic among Hungarian Marketplace sellers: the "buyer" insists on shipping, collects the seller's details, then a counterfeit Foxpost mail from a look-alike domain leads to a fake bank login and a drained account, with recovery difficult under Hungarian banking rules. Flagging that pattern in a pasted message is a feature Meta will not build well and a once-a-year seller will tell their friends about.
4. **Choreograph, do not integrate.** Foxpost locker-to-locker with cash on delivery is cheap and native to private senders here. The app writes the message proposing it, captures the tracking number, and nudges the timeline. This answers "get the money" and "avoid the scam" with the same feature and no carrier integration.

**Guardrail:** the warning may only ever flag danger. It must never certify that a message or a buyer is safe. A false "looks fine" on a message that later drains an account is a liability we will not carry.

*Calls.* Not automated. Reduced: hide the phone number, steer to messages. Automating call handling in the EU raises recording-consent questions that are not worth it for this user.

---

## What the mix unlocks that neither half could

**Local price truth.** A hundred households, roughly a thousand items, real sold and unsold outcomes, one town, one day. That is a price dataset no competitor has: what a used children's bicycle actually fetches in Biatorbágy. Every competitor advertises price suggestions; none can ground them locally. Collect it only with explicit consent, and aggregate.

**The reverse side.** Buyers post what they are looking for. On the day it points them at a house; after the day it points them at a Jófogás ad. Same item, same data, two channels.

**The missing layer in the existing festival.** The organisers' Google Map answers *which house*. It does not answer *what is in it* — today a visitor looking for a children's bicycle walks a hundred gates to find out. Item-level search is the whole contribution, and it is small.

---

## What we are not building

- A buyer marketplace. It would require creating demand and supply together, plus moderation, trust and disputes.
- Payments, escrow or wallets. Vinted solved shipping-and-money by *being* the marketplace; that cannot be reproduced from outside.
- Any scraping or automation of Facebook Marketplace or Messenger.
- Generated or AI-altered product images. Jófogás's rules prohibit generative-AI images in ads; verify the current wording before shipping any image feature. Straighten, crop and exposure only, with originals preserved.
- An inventory dashboard as the first screen.
- A tone selector as a differentiator. It is table stakes.
- A tax or DAC7 feature. The reporting thresholds are real, but this user is below them, and calculating anyone's tax is not a liability we take on. Records and export only, if ever.
- A separate app for the festival. One product, three surfaces.

---

## Twelve-month calendar

The event is annual, which supplies the deadline this project has been missing.

**Now → 13 September 2026 — research, no code.**
Register and sell own items using the current prototype. Write to the organisers (info@jfmk.hu, or the Facebook group) as a local developer: ask what breaks every year, offer help for 2027. On the day, walk twenty houses and ask three questions — how did you set the price, what did not sell, what happens to it tomorrow. This is the seller study the research documents keep calling for, at roughly twenty times the planned scale, free, in the developer's own town.

**October 2026 → March 2027 — Tárgy + Hirdetés.**
The real engineering. Capture and fact confirmation in the app; the pre-answer block; Jófogás fill assistance; the reply assistant and warning; the item timeline. eBay Sell API integration when a pilot user actually needs it, not before.

**April → August 2027 — the thin Vásár layer.**
Map, item feed and search, reserve. Built with the organisers, not around them.

**13 September 2027 — launch at the festival**, with a hundred households already present and a year of the assistant behind it.

---

## Position

> Fotózd le egyszer. Add el a legkönnyebb helyen — a kapud előtt, a Jófogáson, vagy a világ másik felén.

The relationship with the organisers is the one asset here that a competitor cannot buy. Serve them; do not compete with them. The community trust is theirs.

---

## To verify before building

- The current wording of the Jófogás rule on generative-AI images, from the live page.
- The exact eligibility and category restrictions of the Jófogás → Marketplace transfer, and whether the seller-side message flow is workable for us.
- Whether the eBay Sell API's listing flow is practical for an individual, occasional seller, and what the account requirements are in Hungary.
- Web Share Target is Chrome/Android only; iOS Safari does not support it. If the reply assistant is core — and this document assumes it is — the native path (Expo) arrives sooner than [08-product-stack.md](08-product-stack.md) assumed. Decide before building the web shell.
- Whether the festival organisers want any of this at all. Everything above is contingent on that conversation.

---

## Sources

- Meta Seller app launch: https://thenextweb.com/news/meta-seller-app-facebook-marketplace-ai-listing
- Jófogás–Facebook Marketplace cooperation (June 2025): https://kreativ.hu/cikk/facebook-jofogas-egyuttmukodes
- Jófogás Meta ad transfer conditions: https://docs.jofogas.hu/meta-hirdetesattoltes/
- Jófogás rules (generative-AI image prohibition): https://docs.jofogas.hu/szabalyzat/
- No official Marketplace/Messenger API: https://sociavault.com/blog/facebook-marketplace-api-alternative
- Foxpost scam mechanics: https://atidesign.hu/a-facebook-marketplace-n-terjedo-foxpostos-csalas/
- Marketplace bank phishing (HVG): https://hvg.hu/tudomany/20240522_facebook-marketplace-csalas-atveres-hamis-banki-oldalak
- Foxpost private sender pricing: https://foxpost.hu/araink
- Garázsvásár Fesztivál Biatorbágy: https://garazsvasarfesztival.hu/
- JFMK event page and organiser contact: https://juhaszferencmk.hu/program/garazsvasar-fesztival-biatorbagy/
- Festival Facebook group: https://www.facebook.com/groups/garazsvasarfesztivalbiatorbagy
- Prior art, garage sale maps: https://gsalr.com/
