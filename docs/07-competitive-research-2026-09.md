# Competitive research: a mobile selling assistant

Research date: 2026-09-04. Scope: the proposed experience of guided item photography, AI listing text in a chosen style, multiple selling destinations, and a seller-owned item record.

**Platform-policy update — 2026-09-20:** A new primary-source review covers Jófogás,
Vatera, Facebook Marketplace/groups, HardverApró and Vinted for Hungarian private sellers.
Use the [current capability matrix](13-platform-capabilities-hungary-2026-09.md) and
[platform playbook](06-platform-playbook.md) for implementation. The safe MVP boundary is
seller-controlled handoff and seller-confirmed status. Professional feeds/partner tooling exist,
but public evidence does not establish authority for this consumer app to publish or read status.

**The broad concept is not unique. A narrower opportunity may exist in excellent Hungarian capture-to-sale workflows, but that is a product hypothesis, not a verified market gap.**

This is desk research using official product sites, developer-authored app-store descriptions, help documentation and marketplace rules. Features below are documented or advertised, not independently tested. A published app or landing page establishes competitive overlap; it does not establish quality, active users, revenue or product-market fit. Missing documentation means unknown, not absent. Prices are advertised snapshots, not verified Hungarian checkout prices. No accounts were created, apps purchased or listings posted.

**Corrections to the July research**

- The claim that no Hungarian-language listing tool serves Jófogás is contradicted by Listed AI's Hungarian Google Play description. It explicitly advertises Hungarian output and Jófogás-compatible copy. That is not proof of an official integration or of good local output.
- Public item pages are not unique: Market Buddy includes them in its documented workflow.
- Selectable writing tone, manual posting assistance and cross-platform status tracking already appear in competing products.
- Portable data should not be described as universally absent from competitors: Vendoo advertises downloadable inventory spreadsheets. Full export of originals, facts, text variants and editing history is a narrower requirement to test.
- Neither competitors' prices nor their claims of listing speed, sales uplift or market-optimal pricing establish what Hungarian users will pay or achieve.
- The earlier assertions that every competitor depends on prohibited automation and that assisted posting has zero platform exposure are too broad. Integration methods differ, and exported content must still satisfy destination rules.

**The most relevant competitors**

| Product | Documented overlap | Competitive implication and remaining uncertainty |
|---|---|---|
| Listed AI | Photo-to-title/description/price, bulk generation, saved listings, copy/open-marketplace flow. Hungarian store description explicitly names Hungarian, Jófogás and Facebook Marketplace. | First product to benchmark for local listing preparation. Native Hungarian quality, factual accuracy and depth of Jófogás adaptation remain untested. [Hungarian Google Play listing](https://play.google.com/store/apps/details?hl=hu&id=com.wil7.listedai), [official site](https://listedai.app/en/). |
| Market Buddy | Photos or barcode, follow-up questions, regional price guidance, editable copy, styled ad image, public listing website, saved drafts and optional buyer queue. Generation uses purchased credits. | Very close to the broad product and public-page vision. Store description provides evidence of availability; Hungarian quality and capture coaching remain unverified. [Google Play listing](https://play.google.com/store/apps/details?id=app.marketbuddy). |
| List My Closet / Closet Resale App | Clothing photo enhancement, listing generation, named tone choices, web/mobile sync and listed/sold/shipped tracking. Website advertises $7.99/month or $49.99/year. | The photo-plus-your-voice combination already exists. Website advertises automatic crossposting, while an older app release note mentions a waitlist: verify current behavior before scoring integration. [Official site](https://www.listmycloset.com/), [App Store description and release notes](https://apps.apple.com/us/app/closet-resale-app-ai-listings/id6758005659). |
| SnapSell, by FancyLab | Photos, focused questions, pricing guidance, editable tone, optional voice input, draft/posted/sold tracking and human copy/paste posting. Limited free use and optional subscriptions. | Particularly close to the proposed assistant workflow and human-controlled publishing philosophy. [Google Play listing](https://play.google.com/store/apps/details?id=com.resellsnap). |
| ShotReady | Vehicle-specific shot guides, AI feedback per photograph, downloadable photo pack and generated listing text. Advertises $9 per vehicle or $29/month for up to 25 listings. | Guided capture itself is not unique. Strong reference for category-specific coaching; a website alone does not verify delivery quality. [Official site](https://www.shotreadyapp.com/). |
| Crosslist | Photo-based listing creation, grouping a batch of photos into items, multiple marketplace formats, tone, length and custom prompts. | Writing customization and bulk preparation are competitive baseline features. Claimed pricing accuracy is not independently verified. [Feature documentation](https://crosslist.com/features/create-listings-with-ai). |
| Nifty | AI listing creation, cloud automation, unified inventory and analytics; pricing documents sale detection/delisting. | Added 2026-09-05: a major benchmark for an independent seller organizer. See the Nifty assessment below. [Official product](https://www.nifty.ai/), [pricing](https://www.nifty.ai/pricing). |
| Vendoo | Cross-platform inventory, listing assistance, photo editing, sale detection/delisting and analytics; also advertises downloadable inventory spreadsheets. | Benchmark for the long-term management promise. Current pricing page includes conflicting legacy/new sections, so exact plan comparisons need checkout verification. [Product](https://www.vendoo.co/cross-listing-app), [pricing and feature matrix](https://www.vendoo.co/pricing). |
| Photoroom | Background editing and product-photo enhancement. Its Product Beautifier can replace backgrounds, adjust angles and enhance lighting/sharpness. | Strong adjacent competitor for visual polish and a possible component provider. Generative transformations require particular care for used-item accuracy and destination rules. [Product page](https://www.photoroom.com/tools/product-beautifier), [help documentation](https://help.photoroom.com/en/articles/12918772-make-pro-product-photos-with-product-beautifier-web-app). |
| eBay and Depop | Marketplace-native photo-based listing assistance. eBay's April 2025 announcement describes a simplified mobile flow; Depop announced image-to-description and item attributes in September 2024 for English-speaking markets. | Built-in assistance competes on convenience: sellers may not want a separate app. These announcements do not establish current Hungarian availability. [eBay announcement](https://innovation.ebayinc.com/stories/ebay-reduces-the-time-to-list-on-mobile-with-new-simplified-selling-tool-now-featuring-magical-listing-ai-technology/), [Depop announcement](https://news.depop.com/company-news/depop-launches-ai-powered-listing-from-one-photo/). |

Additional watchlist: [Reclaim](https://www.reclaimstuff.com/) advertises casual-seller photo-to-listing and sold-comparable pricing; its integration reliability was not tested. [Hawker](https://hawker-app.com/) advertises platform-specific copy, tone/language controls and inventory but labels itself in active development. [VaultLedger](https://vaultledger.app/) advertises a local-first reseller ledger; this shows that ownership language also exists in adjacent products, without establishing comparable listing creation.

**What can and cannot support differentiation**

| Proposed differentiator | Finding | Product decision |
|---|---|---|
| Turn a photo into an ad | Widely documented | Required convenience, not a uniqueness claim |
| Catchy/friendly/professional writing | Explicit in competing products | Include it, but demonstrate better factual and linguistic quality |
| Create once, share anywhere | Common promise, including manual export | Preserve it as architecture and convenience |
| Hungarian language / Jófogás | Explicitly advertised by Listed AI | Test depth; do not claim exclusivity |
| A public URL for each item | Documented by Market Buddy | Optional utility rather than the principal selling point |
| Guided photography | Documented for vehicles by ShotReady | Explore category coverage and feedback quality, not invention of the concept |
| Track listings and sales | Several direct competitors | Make local tracking unusually effortless |
| Complete portable item record | Full proposed combination not established in reviewed documentation | Validate export contents in hands-on tests; CSV export alone is not equivalent |
| Trustworthy, category-specific Hungarian workflow from capture to sale | The complete experience was not established by this search | Promising hypothesis; absence of evidence does not prove an empty market |

**A finding that should shape the photo product**

An official Jófogás rules PDF returned through search says: “A hirdetésben generatív AI
által előállított kép használata tilos.” The accessible PDF name indicates a 2025 validity
boundary, while the live effective rules could not be verified. Treat this as a conservative
originals-first warning and recheck the current rule before shipping an image-export feature.
[Retrieved official rules PDF](https://docs.jofogas.hu/wp-content/uploads/2025/12/Felhasznalasi_feltetelek_2025-12-05-ig.pdf).

This supports prioritizing guidance for taking actual photographs and conventional crop, rotation and exposure tools. It does not establish that every AI-assisted edit is allowed or that every platform applies the same rule. Generated backgrounds, changed viewing angles, removed wear and synthetic models should not become the default Jófogás output. Preserve originals and identify exactly what each editing tool changes.

An attractive photograph and evidence of condition serve different buyer needs. A useful photo set could include a clear cover image, alternate view, model/size label, accessories and visible defects. Feedback such as 'the label is unreadable' or 'the scratch is hidden by glare' is a concrete product capability to evaluate. Claims that it increases sales require testing.

**Recommended position to test**

The earlier line, 'Turn the things you no longer use into listings you’re proud to share,' is an emotional promise, not an established competitive distinction. Test it alongside a more concrete proposition:

> Better real photos. A listing in your voice. Ready for the places you sell.

For the Hungarian pilot:

> Fotózd le jól. Hirdesd meg a saját hangodon. Kövesd egy helyen.

The proposed first audience is Hungarian occasional-to-repeat sellers listing household objects through Jófogás and Facebook Marketplace/groups. Start with two or three categories where the team has access to real items and sellers: bicycles, small household goods and consumer electronics are candidates. Clothing is an obvious later category, but the closest clothing-focused competitor already combines photo editing, tone choices and tracking. Higher-value categories may support higher willingness to pay; that remains an inference.

Implement four connected benefits: category-specific capture guidance, confirmed facts with visible uncertainty, locally appropriate export formats, and a portable item history. Photo-to-copy generation and tone selection remain necessary parts of this workflow. The advantage must be demonstrated through fewer retakes, fewer factual corrections and a smoother real posting process.

Platform independence reduces reliance on a single distribution channel. It does not eliminate marketplace dependencies or create demand. 'Works with Jófogás' must distinguish text preparation from an official API integration. A share-sheet handoff is not evidence of successful publication. Keep per-platform posting/removal confirmation honest.

**The experiment before building a full mobile app**

Recruit 12 Hungarian sellers with three real items each, giving a directional pilot of 36 items. This is a usability and preference study, not a statistically definitive market estimate.

First benchmark Listed AI, Market Buddy and SnapSell, plus a general-purpose AI writing workflow and manual listing. Include List My Closet on clothing examples and ShotReady if vehicle capture becomes relevant. Use free access where available; record paid or unavailable flows as untested. Do not purchase subscriptions or post on participants' accounts without their authorization.

Run two separate comparisons:

1. **Writing and preparation:** give each tool the same photos and confirmed facts. Ask Hungarian reviewers, without tool names, to score accuracy, naturalness, required details and usefulness of the chosen style. Count omitted defects and invented specifications separately. Test an unreadable model label, unknown working condition and a price change.
2. **Capture and actual workflow:** compare unassisted photos with coached capture using matched items and counterbalanced order. Measure time including retakes, photo completeness, app switching and correction work through a ready-to-post result. Have sellers complete any actual marketplace posting themselves.

Record median task time, completion without help, material factual errors, seller preference, real second-item reuse, and willingness to pay after use. Record AI/image cost per completed listing to test whether a viable price leaves margin. Sale speed and price achieved need a longer follow-up and controls for item demand; avoid attributing them to wording alone.

Suggested decision gates, chosen in advance as product targets rather than research findings:

- Zero material invented specifications or hidden known defects in approved benchmark outputs.
- At least 30% less median preparation time than participants' current workflow, including the handoff.
- At least 8 of 12 participants prefer the complete prototype workflow over the strongest accessible alternative.
- At least 6 participants independently use it for another item during the follow-up period.
- Some participants actually buy a small listing pack at a price that covers service costs; stated interest alone is insufficient.

If competitors already meet these needs, integrate or specialize rather than duplicate them. If only capture coaching wins, ship that narrow product first. If users enjoy the results but never return or pay, keep it a personal tool or reconsider the target segment.

**Unresolved questions**

Actual Hungarian language quality; depth of Jófogás/Vatera/HardverApró support; real integration behavior; complete export coverage; user counts and revenue; acceptable AI acquisition/processing costs; seller willingness to pay; current enforcement of image rules; and whether the combined experience is useful enough to justify a separate app. Desk research cannot settle these.


**Follow-up — Nifty and product direction, 2026-09-05**

Nifty was missing from the initial September comparison. Its inclusion strengthens the finding that an independent organizer with AI listing creation is an established product category. This follow-up is desk research, not a hands-on product evaluation.

Nifty's homepage lists Poshmark, eBay, Mercari, Depop, Etsy and Whatnot as its supported marketplaces. Jófogás, Vatera and HardverApró were not listed in the reviewed material; this is not evidence of exclusive access to those local markets. [Official product](https://www.nifty.ai/).

Its UK/Australia expansion announcement describes Facebook Marketplace CSV exports as well as marketplace pricing rules and shipping presets. This should be distinguished from verified full Marketplace integration, and availability for particular accounts remains untested. The expansion also means geography alone is a temporary opportunity, not a durable barrier. [Expansion announcement](https://nifty.ai/post/nifty-uk-australia).

The monthly Crosslisting Plus plan is advertised at $39.99, with up to 1,500 active items and 500 smart credits. It includes AI listing generation, reporting and sale detection/delisting. The site also displays annual equivalents and other tiers; these figures are not Hungarian checkout quotes. [Pricing](https://www.nifty.ai/pricing).

Indexed help documentation describes photo-based generation with customizable writing settings, image editing/background removal, and exportable inventory reports. Some full help pages returned unsupported Markdown content to the research browser. This evidence is sufficient to reject claims that photo-to-copy, writing preferences or basic exports are absent; precise capabilities still need hands-on testing. [AI generation](https://docs.nifty.ai/crosslisting/ai-listing-generator), [photo tools](https://docs.nifty.ai/crosslisting/photo-editing-and-management), [reports](https://docs.nifty.ai/analytics/insights-and-reports).

**Recommendation: an independent seller application, with public pages as optional outputs.** A hosted account, sync and mobile app are compatible with this choice. A buyer marketplace would add the need to create buyer demand and seller supply together, plus moderation, transaction trust and dispute workflows. The seller assistant can deliver value for one seller using existing destinations. A component/API business could follow if the capture workflow proves useful to other businesses; building a developer platform first would postpone learning from sellers.

The proposed first differentiated workflow is category-aware capture and condition documentation for Hungarian sellers of durable goods. Begin with one accessible category, such as bicycles, tools or small appliances. Help capture the views and labels buyers need, ask about tested functions, distinguish unknown condition from confirmed working condition, and connect visible wear to explicit disclosure. Use the same confirmed record for different writing styles and destinations. This is a strategic hypothesis, not a claim of global novelty or certified inspection.

Hungarian advantages to test: natural local phrasing, category completeness, marketplace-specific fields, posting/removal tracking across local groups, and pickup/shipping information that is useful without implying a carrier integration. Local access to sellers and prospective partners could make iteration and distribution easier than for a broad international competitor. Language alone is insufficient: Listed AI already advertises it.

International expansion should follow the category workflow into another language/market while retaining the same evidence and fact model. Translation alone does not establish local demand, correct price comparisons or shipping economics. Partnerships with repair shops, specialist used-goods shops, reuse organizations or professional organizers are possible distribution experiments, not existing partnerships or proven demand. A repair shop could, with authorization, contribute a dated service record and help a customer prepare a listing; that history should not be presented as independent authentication.

The potential durable advantage is a tested library of category capture instructions, reliable fact/uncertainty handling, low-friction local exports and distribution relationships. With permission, aggregate correction patterns and outcomes can improve the workflow. Stored private listings, a generic AI prompt, cheaper pricing and a tone selector are not defensible advantages by themselves.

Keep the MVP boundary concrete: capture/import, quality guidance, fact confirmation, writing style, editable draft, destination handoff, posting links, sold/removal flow and a full archive export. Use permitted integrations where they materially improve the experience; independence should not require manual work forever. Avoid building buyer search, checkout, escrow or a general social feed until evidence supports changing the business.

Add Nifty to the benchmark for inventory management and full item lifecycle. Compare 20 real items within one category against an accessible direct alternative and manual preparation. Measure capture/preparation time, missing buyer-relevant details, factual corrections, actual reuse and paid demand. Count reduced follow-up questions only from real conversations, without automated access or sending messages on users' behalf. Test listing packs for occasional sellers and subscriptions for repeat sellers, ensuring generation costs fit either model.

## Synthesis update — 2026-09-08

Purpose: distil the repository and discussion into [a small core plan](10-core-plan.md) serving busy individuals, local/niche communities and frequent small dealers. This is desk research plus scoped source inspection, not a hands-on competitor benchmark or user study.

### What the newer evidence changes

| Evidence checked | Planning consequence (inference) |
|---|---|
| Meta's official 24 July announcement confirms Seller: photo-based listing creation, bulk listing, inventory, an item-based inbox and insights. The announcement specifies US adults on iOS, a web experience for iOS adopters, and Android testing. This is launch scope, not a verified September availability matrix. [Meta announcement](https://about.fb.com/news/2026/07/introducing-seller-app-facebook-marketplace/) | Generic AI listing creation faces direct platform competition. Hungarian rollout is unknown; the prior “question of time” prediction is not evidence. |
| Nifty's current homepage lists Poshmark, eBay, Mercari, Depop, Etsy and Whatnot and advertises crosslisting, automation and analytics. Account-level operation was not tested. [Nifty](https://www.nifty.ai/) | Use it as the frequent-seller benchmark. The gap must be demonstrated in local workflows and community use, not asserted from its platform list. |
| Indexed text from Jófogás's official transfer terms confirms a Marketplace partner arrangement. Full-page retrieval failed twice; eligibility, exclusions, fees, message routing and propagation of sold/deleted state were not fully reverified. [Transfer terms](https://docs.jofogas.hu/meta-hirdetesattoltes/) | This weakens the generic “reach Jófogás and Facebook” pitch, but does not justify “every seller automatically reaches both for free.” Treat it as an account-dependent option. |
| Jófogás's business terms also document an automatic listing-import service. Entitlement, feed requirements and account suitability were not tested. [Business terms](https://docs.jofogas.hu/jofogas-bolt-uzleti-altalanos-szerzodesi-feltetelek/) | The earlier claim that eBay is the only possible integration is too broad, particularly now that dealers are in scope. Investigate sanctioned imports when a pilot dealer needs them. |
| Freecycle documents local volunteer moderators and mixed funding from donations, grants, sponsorship and advertising. [About Freecycle](https://www.freecycle.org/pages/about) | Local stewardship and operator succession matter. Its free-goods model does not establish the economics of paid resale or remove support costs. |
| Buy Nothing's guidelines prohibit sales, barter, business accounts and advertising. [Guidelines](https://buynothingproject.org/guidelines) | Borrow clear community norms; do not assume gifting groups welcome dealer inventory or commercial promotion. |
| Open Food Network describes open-source software for local producers/community hubs and locally operated instances. [Project](https://openfoodnetwork.org/), [local networks](https://openfoodnetwork.org/find-your-local-open-food-network/) | A shared software core with local operators is a useful longevity precedent. It does not prove resale demand or make federation inexpensive. |

No relevant service called “UseThem” was identified in the repository or bounded web search. The user's phrase remains unresolved; the plan provisionally reads it as using existing services, without attributing features to an invented competitor.

### Reconciliation of the repository

Retain seller ownership, immutable originals, explicit uncertainty and editable previews. The discussion specifically rejects making people fill Nifty-like forms before receiving useful help. The latest request broadens the September 6 occasional-seller focus: dealer tools should be optional, and community hosts should control commercial participation.

The channel waterfall becomes an available strategy, not a forced sequence: someone needing a quick clearance may use a bundle or helper; a specialist dealer may go directly to a relevant destination. A community catalogue is a limited discovery surface and carries moderation duties even without checkout. “Not a marketplace” must not be used to ignore those duties.

The festival, organizer interest, 2027 date, future Meta rollout, estimates of avoided messages, local price-dataset value and the claim that a new URL will spread naturally remain hypotheses or historical claims. None is a prerequisite or promised outcome in the core plan. An event conversation or outreach plan is not authorization to contact organizers; no outreach occurred.

### Repository coverage and implementation evidence

Reviewed all nine numbered documents, the 370-line conversation export, README/AGENTS, the hidden ad-creation workflow, inbox guidance and the schema example. Scoped implementation inspection covered build validation/exports, gallery serving, public publishing and the Pages workflow; item metadata established the three existing records. Generated pages, photo contents and every implementation line were not audited. This was a product review, not a security or visual audit.

The prototype contains a deterministic Python builder and read-only gallery, not the proposed phone app. Public publishing currently rebuilds one page, contains roof-tile-specific text, and tells buyers to return to the original marketplace/group. That is insufficient for arbitrary forwarded-link contact or multiple community listings. Preserve the item contract and useful build behavior; the public UI requires generalization.

`docs/03-ad-schema.md` and the renderer treat empty defects as “Hibátlan, sérülésmentes.” The future fact model must separate “none confirmed” from “not checked.” The current schema also requires a positive price, so a future giveaway option would need explicit schema/validation work. Documentation describes some guarantees beyond what `--check` exercises; do not treat that command as privacy, rendering or integration validation.

- **PASS:** `python3 -B scripts/build.py --check`, 2026-09-08 in this local repository snapshot: exit 0, 3 records valid, 0 errors. Pillow unavailable; no image transformation was exercised.
- **PASS:** official-source confirmation of Meta/Nifty's documented competitive overlap; community precedents reviewed as above.
- **PASS:** local link check across the seven edited planning/guidance files: 27 relative file targets checked, 0 missing; independent scope review incorporated by sequencing the individual loop before community and dealer expansion.
- **BLOCKED:** full retrieval of Jófogás transfer terms; indexed official evidence supports existence only, with operational details unresolved.
- **NOT RUN:** competitor app use, seller/host pilot, paid-demand experiment, camera/sharing tests, build/deployment of the proposed stack, or export/import of that future app.

The working directory has no Git metadata, so no commit identity or Git diff was available. Only planning documents were changed; no application code, item records or deployment state were changed. The stack remains the September 5 recommendation, not a newly validated integration. Official docs still describe [TanStack Start on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) and [separate frontend hosting with Convex](https://docs.convex.dev/production/hosting/).
