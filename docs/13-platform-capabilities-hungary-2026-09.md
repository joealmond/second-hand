# Hungarian selling-platform capabilities

Research date: 2026-09-20. Scope: Hungarian private sellers and the current Tovább
seller-assistant product. International platforms are included only where they are available to
Hungarian sellers. This is a primary-source desk review; no accounts were created, no listings
were posted and no partner access was requested.

For create/update/delete APIs, feeds, browser automation and the Jófogás→Facebook Marketplace
route, see the [publishing connector matrix](14-platform-publishing-connectors-hungary.md).

`Verified` means an official platform source states the fact. `Unknown` means the reviewed
official material does not establish it; it does not prove that a feature is unavailable.
Product recommendations are labelled as inferences.

## Decision

**For the Hungarian MVP, every destination remains a seller-controlled handoff.** Prepare an
editable platform-specific package, let the seller publish it, then store a seller-confirmed
status and optional listing URL. Do not call that status independently verified.

Only use `integration-verified` after an authorized integration can actually read the remote
state. Do not promise automatic posting, moderation acceptance, shipping availability, inbox
access, status synchronization or automatic delisting.

| Destination | Verified platform position | Safe product support now |
|---|---|---|
| Jófogás | Consumer posting is moderated. Category, region, price, contact and delivery details matter. Real-estate XML import and historical commercial bulk import exist, but ordinary multi-seller/API eligibility is unknown. | Jófogás-specific text, real photos, category/region/price/contact, pickup and carrier-specific parcel data; seller submits and confirms status. |
| Vatera | Fixed-price and auction listings; maximum 21-day duration; shipping and payment selections are required. Professional SOAP/Partnerközpont tooling exists, but public third-party onboarding was not located. | Factual listing, condition, parameters and per-service delivery/payment preparation; omit external contact/link text; seller submits. |
| Facebook Marketplace | Available in Hungary. Meta documents first-party and selected partner inventory tools, but no public third-party listing/status API or supported prefilled composer was found. Hungarian shipping features are account/location dependent and unverified. | Editable Marketplace text and original photos; open the ordinary destination; seller posts and reports status. |
| Facebook buy/sell groups | Facebook supports selling in buy/sell groups. Group rules, fields, moderation and programmatic posting/status access are group-specific or unknown. | Short editable group post and photos; seller chooses the group, checks its rules and confirms acceptance. |
| HardverApró | A private account has 8 free ads, 12 with Premium. The same item cannot be advertised again within 25 days unless the repeat ad is paid. No public integration programme was found. | Tech-spec, warranty, defect, pickup and seller-arranged shipping template; reminders only, no automatic relisting. |
| Vinted Hungary | Private selling is free across permitted clothing, home, hobby and selected electronics categories. Photos must be the seller's own and unedited. External tools require authorization; commercial private-account activity is prohibited. | Original-only photo package, condition/defect and private-sale checks, no external links; seller uses Vinted checkout and shipping. |

## Jófogás

### Verified

- Posting asks for a title, detailed description, images, region, category, price and contact
  details. After review, Jófogás says an accepted ad normally appears within 30 minutes after
  the notification email; a rejected ad receives an explanation. This does not support the old
  `48 hours` claim. [Posting flow](https://ugyfelszolgalat.jofogas.hu/eladas/hirdetesfeladas/hogyan-tudsz-hirdetest-feladni/)
- Charges vary by category and sometimes by active-ad count. They are not limited to jobs,
  property and vehicles. Prices are volatile; the product should link to the current schedule
  instead of embedding it. [Listing charges](https://ugyfelszolgalat.jofogas.hu/eladas/hirdetesfeladas/ingyenesen-lehet-hirdetest-feladni/)
- Current support describes Foxpost, GLS and MPL. Required parcel measurements and limits differ
  by carrier/service. Store the chosen service with weight and dimensions rather than one generic
  `package` promise. [GLS](https://ugyfelszolgalat.jofogas.hu/szallitas/szallitas-mukodese-eladokent/szallitasi-modok-es-partnereink/gls/),
  [Foxpost](https://ugyfelszolgalat.jofogas.hu/szallitas/szallitas-mukodese-vevokent/szallitasi-modok-es-partnereink/foxpost/),
  [packing guidance](https://ugyfelszolgalat.jofogas.hu/eladas/haztol-hazig/csomagolasi-tudnivalok/)
- The seller has time-bound actions in the platform delivery flow, including accepting/rejecting
  and handing over a parcel. The assistant may remind the seller, but cannot observe completion
  without authorized access. [Seller shipping flow](https://ugyfelszolgalat.jofogas.hu/szallitas/szallitas-mukodese-eladokent/igy-zajlik-a-szallitasi-folyamat-eladokent/)
- An official rules PDF returned by search says listing images must concern the advertised item
  and prohibits watermarked, rotated and generative-AI-produced images. The accessible PDF name
  indicates a 2025 validity boundary, while the live rules page could not be verified. Treat this
  as a conservative originals-first rule and recheck the effective policy before release.
  [Retrieved official rules PDF](https://docs.jofogas.hu/wp-content/uploads/2025/12/Felhasznalasi_feltetelek_2025-12-05-ig.pdf)

### Authorized integration evidence and unknowns

Jófogás documents a real-estate XML feed: the supplier hosts a URL, Jófogás issues a partner
ID, activation is confirmed by email and the feed is fetched at least daily. Feed contents can
override account-side edits. This is a category-specific partner workflow, not a public consumer
API. [Real-estate XML import](https://ugyfelszolgalat.jofogas.hu/eladas/hirdetesfeladas/hogyan-tudok-automatikusan-ingatlan-hirdetest-feltolteni-a-jofogasra/)

Historical Jófogás Bolt material also establishes that commercial XML import existed. Current
non-property eligibility, schema, price, multi-seller authority and status/webhook access remain
unknown. Obtain written terms before designing a professional-feed pilot.
[Historical Bolt notice](https://docs.jofogas.hu/bolt_valtozas_osszefoglalo/)

No current official source was found for a universal 90-day lifetime. Store user-entered expiry
and reminders; do not schedule an automatic Jófogás relist date.

## Vatera

### Verified

- A seller needs full user status. Listings may be fixed-price or auction and run for at most
  21 days. Parameters and condition must be accurate.
  [Terms](https://img-ssl.vatera.hu/license/vatera_main_content_en.html?v1272965737561=)
- Product text and images may not steer buyers to direct contact details or an external contact
  site unless a separate agreement/category rule allows it. Do not put Tovább contact links into
  the Vatera export. [Terms](https://img-ssl.vatera.hu/license/vatera_main_content_en.html?v1272965737561=)
- Shipping and payment choices are required posting data. Capture pickup and each offered service
  separately. [Posting guide](https://blog.vatera.hu/2021/02/26/hirdetesfeladas-kisokos-kezdo-vaterasoknak/)
- The fixed 49 Ft successful-sale charge ended for sales closed on or after 2026-09-01. Other
  fees and temporary discounts still require the current schedule; the old universal
  `listing fee + commission` statement is not reliable.
  [Fee announcement](https://blog.vatera.hu/2026/08/19/kevesebb-dij-tobb-ok-hogy-ujra-vaterazz/)

Official help refers to SOAP-uploaded and Partnerközpont listings, and an official Power Seller
Tool licence exists. Public onboarding, schema, authentication, pricing and authority to act for
private sellers were not located. Treat these as evidence of professional tooling, not an open
API. [SOAP/Partnerközpont reference](https://www.vatera.hu/segitseg/az-aukcio-kozben/mi-az-az-akcio-es-hogyan-tudom-akciossa-tenni-a-hirdeteseimet/32/357),
[Power Seller Tool licence](https://img-ssl.vatera.hu/upload/pst/pst_licence_v3.pdf)

## Facebook Marketplace and buy/sell groups

### Verified

- Marketplace launched in Hungary, and Facebook describes Marketplace and buy/sell groups as
  selling surfaces. Shipping depends on location.
  [Hungary launch](https://about.fb.com/news/2017/08/marketplace-is-expanding-to-europe/),
  [ways to sell](https://www.facebook.com/help/550954179351183/)
- Meta integrates selected partner inventory and offers a first-party Seller app, but the Seller
  launch was US/iOS-specific. Neither establishes a public API, Hungarian partner access or a
  third-party right to act for sellers.
  [Partner inventory](https://about.fb.com/news/2025/11/facebook-marketplace-gets-a-glow-up/),
  [Seller app](https://about.fb.com/news/2026/07/introducing-seller-app-facebook-marketplace/)
- Meta documents detection and enforcement against unauthorized automated scraping. That source
  does not prove that every possible posting automation violates the same clause. The product
  conclusion is still conservative: do not automate or scrape Marketplace UI without written
  Meta authorization. [Scraping guidance](https://www.facebook.com/help/463983701520800)

No reviewed official documentation defined a public listing/status API, a supported prefilled
composer URL, Hungarian checkout/shipping coverage, group-rule access or group-post moderation
status. Use copy/export plus seller submission. Keep `seller-confirmed` distinct from any future
`integration-verified` state.

## HardverApró

### Verified

- The service is generally free; a private account has 8 active free ads, or 12 with Premium.
  Business tiers also exist but are not the private-seller default.
  [Terms](https://prohardver.hu/allando/aszf.html),
  [account comparison](https://hardverapro.hu/fiok/premium.php?mode=business)
- Ads must use Hungarian except where justified. Only fixed-price listings are permitted. The same
  item cannot be duplicated or advertised again within 25 days unless the repeat ad is paid.
  [Advertising rules](https://prohardver.hu/allando/aszf.html)
- Public listings expose detailed configuration, condition, price, pickup and seller-arranged
  shipping information. No public API, feed, defined ad lifetime, integrated carrier/payment flow
  or automated-delisting programme was found.

Use a specification-heavy template with exact model/configuration, warranty, accessories, known
faults, pickup and shipping responsibility. Warn about the verified 25-day rule; do not describe
it as a 30-day expiry or automate relisting.

## Vinted Hungary

### Verified

- Private listing and selling are free. Permitted categories include clothing, home, hobby and
  selected consumer electronics; Vinted Hungary is not clothes-only.
  [Selling fees](https://www.vinted.hu/help/4/373-onko-vintedissa-myyminen-ilmaista),
  [catalogue rules](https://www.vinted.hu/catalog-rules)
- One listing must represent one available item in the correct category. Condition and every
  fault, modification and missing part must be disclosed. External website/platform links are
  prohibited in listing text. [Catalogue rules](https://www.vinted.hu/catalog-rules)
- Photos must show the real item and condition, be the seller's own Vinted-purpose photos and
  remain unedited, non-stock and non-watermarked. The first photo shows the whole item; the limit
  is 20 photos. Export preserved originals only—no crop, cleanup, background removal, text or AI
  derivative. [Catalogue rules](https://www.vinted.hu/catalog-rules)
- Private accounts may not be used commercially. Vinted's terms prohibit external bots,
  scrapers, crawlers and similar tools unless authorized/offered/allowed, and prohibit repeated
  or bulk delete-and-relist behavior. [Catalogue rules](https://www.vinted.hu/catalog-rules),
  [terms](https://www.vinted.com/terms-and-conditions)
- The seller uses Vinted's purchased shipping label and should dispatch within five working days.
  [Shipping-label guidance](https://www.vinted.hu/help/154)

Vinted publishes a complete Pro Integrations API, but it is limited to allowlisted Pro businesses.
Current Hungarian help does not list Hungary among countries eligible for Pro registration, and
the API documentation does not authorize a service to operate unrelated private accounts. No
ordinary Hungarian seller connector, universal listing lifetime, Hungarian promotion price list
or carrier-price matrix was found. Keep Vinted as a constrained manual destination for this scope.
[Vinted Pro API](https://pro-docs.svc.vinted.com/),
[Hungarian Pro eligibility](https://www.vinted.hu/help/1120)

## Product consequences

The current prototype supports only `jofogas` and a single combined `facebook` destination. A
future platform slice should first deepen the fact model rather than add posting automation:

1. Add destination-specific states: `facebook-marketplace` and `facebook-group` are different
   handoffs; add Vatera, HardverApró and Vinted only with their own preflight rules.
2. Keep `seller-confirmed` posting/removal separate from `integration-verified`. Store the listing
   URL, confirmation time and optional expiry/reminder independently.
3. Add platform category mapping and category-specific facts. Never silently guess the remote
   category.
4. Model pickup and shipping per service, including parcel weight/dimensions where required.
5. Attach photo eligibility to each destination. Preserve immutable originals; exclude derivatives
   where a destination requires unedited images.
6. Run prohibited-item, private/commercial-use, missing-defect and external-link checks before
   export. These checks assist the seller; they do not certify compliance or publication.
7. Recheck volatile fees, limits and policy URLs before release. Keep them out of generated copy
   unless the user has just confirmed them.

The legacy Python formatter still contains historical Jófogás/HardverApró expiry and platform
limit constants. This review does not silently change runtime behavior; remove or reverify those
constants in a separate implementation slice before relying on its expiry output.

## Evidence status

- **PASS:** primary-source capability and policy review for six Hungarian selling destinations.
- **PASS:** clear separation of verified facts, product inferences and unknown integration scope.
- **NOT RUN:** authenticated UI inspection, listing submission, moderation, payment/shipping,
  partner onboarding, API/feed access or remote-status verification.
- **BLOCKED:** authoritative integration design until each platform supplies written current terms
  covering this product, access method and Hungarian/account scope.
