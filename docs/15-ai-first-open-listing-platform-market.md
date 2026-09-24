# AI-first open listing platform: market assessment

Research date: 2026-09-20. Scope: Hungary first, international expansion second. The proposed
product combines seller-owned item records, public listing pages, portable exports, a documented
API, MCP tools and authorized marketplace connectors.

Four independent specialist lanes assessed the idea:

1. Hungarian seller demand and distribution;
2. international listing APIs and evidence of real operation;
3. open API/MCP architecture, authorization and safety;
4. skeptical business economics, marketplace cold start and kill criteria.

This is primary-source desk research. No seller interviews, payments, partner applications, API
credentials or live listings were performed.

## Verdict

**Test an AI-assisted, seller-owned listing workspace and infrastructure layer. Do not launch a
new buyer marketplace. Do not lead with MCP.**

The credible product is:

> One trustworthy item record, prepared once; Hungarian-first seller workflow; portable public
> and private outputs; authorized destination connectors; safe access for the seller's chosen AI.

Public pages, APIs and MCP make the record reusable. They do not create buyer liquidity, platform
permission, trust, payments, moderation or shipping. Start with repeat sellers in one Hungarian
vertical, prove retention and payment, then add sanctioned connectors and a narrow developer
surface.

**Confidence: medium.** International API feasibility is strongly verified. Hungarian paid
retention, platform partnership access and API/MCP customer demand remain untested.

## Four business models

| Model | Opportunity | Main constraint | Decision |
|---|---|---|---|
| **Seller SaaS** | Trusted item capture, platform-ready variants, exports, status/removal tracking and later connectors | Occasional sellers have low frequency; generic AI copy is commoditized | **Start here**, narrowly: repeat sellers in one category |
| **B2B listing infrastructure/API** | Canonical item model, connector SDK, audit/status lifecycle for shops and seller tools | Each connector needs commercial permission, support and maintained mappings | **Second phase**, after 2–3 sanctioned connectors and paid design partners |
| **Open-source core + hosted service** | Open schema/CLI/SDK; paid hosting for credential custody, sync, audit and support | Open source cannot grant access to closed marketplaces; maintenance burden is real | Open export/import and test fixtures first; open-source more only if contributors/partners appear |
| **New buyer marketplace** | Own discovery, messaging and transaction revenue | Two-sided cold start, fraud, moderation, product safety, tax/reporting and buyer acquisition | **Reject now** |

## Are international API-first listing systems real and used?

**Yes, as seller-operation infrastructure inside already-liquid marketplaces.** Exact API-created
listing share was not found, so do not claim that casual sellers commonly use APIs directly.

| Platform/pattern | Verified machine path | Multi-seller access model | Adoption evidence | Lesson for Tovább |
|---|---|---|---|---|
| **eBay** | Inventory/Offer APIs create inventory, publish offers, update and withdraw listings; OAuth seller authorization | Yes, via seller-granted OAuth | eBay reported 134M active buyers and 2.3B live listings at 2024 year-end; API usage share unknown | Closest international reference for broad used goods; viable authorized connector |
| **Etsy** | Open API v3 manages listings, inventory, shops, orders and shipping | Own-shop, personal or reviewed Commercial Access; sellers grant OAuth | Etsy reported 5.6M active sellers, 86.5M buyers and 100M+ items for 2025; API usage share unknown | Strong proof of controlled third-party seller software; category fit is narrower |
| **Vinted Pro** | Allowlisted REST API with create/update/delete, item status, orders, sandbox and signed webhooks | Limited allowlisted Pro businesses | Real documented lifecycle system; Hungarian Pro registration currently unavailable | Technically excellent but not a Hungarian private-seller route today |
| **Shopify Marketplace Connect** | Synchronizes Shopify catalogue, listings, inventory and orders with Amazon, eBay, Walmart and Target Plus | Merchant-installed apps and marketplace accounts | Official operating product; no casual C2C adoption metric | Cross-listing is established, but merchant-shaped |
| **Nostr NIP-15** | Open signed stall/product/order events | Permissionless protocol | Specification calls itself draft, optional and unrecommended; no buyer-liquidity evidence | Interesting export experiment, not a launch channel |

Sources: [eBay Inventory API](https://developer.ebay.com/api-docs/sell/inventory/static/overview.html),
[eBay OAuth](https://developer.ebay.com/develop/guides/sell/authorization),
[eBay 2024 10-K](https://investors.ebayinc.com/files/doc_financials/2024/q4/eBay-10-K-2024.pdf),
[Etsy API access](https://developer.etsy.com/),
[Etsy listing lifecycle](https://developers.etsy.com/documentation/tutorials/listings/),
[Etsy 2025 10-K](https://investors.etsy.com/sec-filings/all-sec-filings/content/0001370637-26-000019/etsy-20251231.htm),
[Vinted Pro Integrations](https://pro-docs.svc.vinted.com/),
[Shopify Marketplace Connect](https://help.shopify.com/en/manual/online-sales-channels/marketplaces/marketplace-connect),
[Nostr NIP-15](https://github.com/nostr-protocol/nips/blob/master/15.md).

### What “used” means here

Verified: major marketplaces deliberately maintain authenticated production listing interfaces;
Shopify operates a catalogue-syndication product; eBay/Etsy have large active marketplace supply.

Unknown: percentage of listings created through third-party APIs, number of active integrations,
MCP transaction volume, use by occasional sellers and Hungarian willingness to pay. These require
partner data or a real pilot.

## Why Hungary can be a useful wedge

Hungary has meaningful online selling behavior. Eurostat reported that 41.7% of people in
Budapest sold goods or services online in 2023, while 79% of Hungarian internet users purchased
online in 2024. These figures establish digital participation, not demand for this product.
[Eurostat regional yearbook](https://ec.europa.eu/eurostat/documents/15234730/20025493/KS-HA-24-001-EN-N.pdf/3e624347-af98-3f3e-3a34-d24ae81cb753?download=true&t=1727772526684&version=3.0),
[Eurostat e-shopping](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250220-3)

The local wedge is not “AI writes Hungarian ads.” Existing products already advertise Hungarian
and Jófogás-ready output. The potentially differentiated job is:

- category-aware photo/fact capture;
- explicit known defects and unknown condition;
- one seller-owned history across destinations;
- natural Hungarian destination variants;
- authorized local connectors when available;
- complete export and a trustworthy public-safe projection.

### Best first customers

| Segment | Value | Revenue likelihood (inference) | Priority |
|---|---|---|---|
| Occasional household seller | Faster capture/export, fewer decisions | Low; free allowance or per-item pack | Pilot usability, not revenue core |
| Repeat private seller | Reusable records, fewer mistakes, cross-channel state | Medium if time saving is measurable | **Best initial paid segment** |
| Vertical specialist | Exact condition/specification/provenance workflow | Medium-high if disputes and omissions fall | **Best differentiation** |
| Small reseller/shop | Imports, roles, inventory reconciliation, API | Higher, but expects reliability/support/connectors | Design-partner lane |
| AI-native developer/agency | API/MCP access to catalog and draft tools | Unknown and early | Validate later, not launch market |

Suitable first verticals include bicycles, electronics/tools, camera gear or small appliances—one
where exact condition and configuration matter and the team can recruit real repeat sellers.

## What MCP adds

MCP is useful as an **AI control surface** over the same domain services as the HTTP API:

- `inspect_item`
- `suggest_missing_facts`
- `create_destination_preview`
- `export_item`
- `request_publish`
- `get_publish_job`

It reduces custom prompt-to-API glue for agent clients. It does **not** provide marketplace
authorization, OAuth consent, buyer distribution or a reason to trust an autonomous action.
Etsy's official MCP server is documentation/API guidance; it does not execute Etsy writes.
[Etsy developer MCP](https://developer.etsy.com/documentation/mcp_server/devmcpserver/)

Architecture decision:

1. versioned HTTP/OpenAPI API is canonical;
2. webhooks/jobs handle asynchronous work;
3. MCP wraps the same policy/audit services;
4. read/draft/preview/export tools ship before write actions;
5. publish/delete/price/contact changes require narrow scopes and explicit confirmation.

OpenAPI already supplies a language-neutral HTTP contract and webhooks. MCP is a second adapter,
not the backend. [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0)

## Minimum credible product

Model three separate concepts:

- **Item:** seller-owned facts, provenance and immutable original media;
- **Offer:** price, availability, delivery/pickup and public visibility;
- **Publication:** one destination variant, remote ID/URL, evidence source and lifecycle state.

The first release should include:

1. one Hungarian vertical and 10–20 repeat sellers;
2. confirmed/AI-suggested/unknown fact provenance;
3. destination preflight plus manual handoff for unsupported platforms;
4. opt-in public-safe page using `schema.org/Product` + `Offer`;
5. documented JSON export/import with originals and checksums;
6. read/preview/export API and a minimal MCP beta over seller-owned data;
7. one authorized international connector only when a design partner qualifies;
8. Hungarian write connectors only after written platform approval.

The platform connector matrix remains authoritative for current local access.
[Hungarian connector review](14-platform-publishing-connectors-hungary.md)

## Openness and moat

“All open tools” is **not** a moat. Tool count increases prompt-injection, data-exfiltration,
permission and reliability risks.

Potential moat:

- written marketplace partnerships and seller-authorized credentials;
- maintained category/field/policy mappings with visible loss/diffs;
- trustworthy condition, defect and provenance history;
- reliable cross-channel state/audit ledger;
- excellent narrow Hungarian vertical workflows;
- enough consented lifecycle data to improve channel/pricing decisions.

Open now:

- JSON import/export schema;
- OpenAPI documentation;
- read-oriented API and sandbox fixtures;
- public-safe schema.org projection;
- connector interfaces and conformance tests.

Constrained:

- marketplace credentials;
- publish/update/delete/status actions;
- personal/private fields and original media;
- third-party connectors until security/policy review.

Avoid ActivityPub/federation until real independent clients commit to consuming a bounded listing
profile. It adds delivery, abuse and moderation work without solving category semantics or buyer
liquidity. [ActivityPub](https://www.w3.org/TR/activitypub/)

## Business model

Recommended sequence:

1. free limited assisted listings for acquisition;
2. paid per-item packs or active-seller subscription after measured repeat value;
3. vertical reseller/consignment plan for bulk workflows;
4. B2B connector/onboarding/support fees after sanctioned integrations;
5. hosted credential vault, synchronization and audit as paid infrastructure.

Do not depend on transaction take-rate unless the product intentionally becomes a marketplace.
Keeping the first product to listing/advertising and redirection also differs materially from
facilitating transactions under EU marketplace/reporting obligations; obtain legal advice before
crossing that boundary. [EU DAC7 definition](https://taxation-customs.ec.europa.eu/system/files/2020-07/2020_tax_package_dac7_annex_en.pdf),
[EU DSA overview](https://commission.europa.eu/news-and-media/news/new-rules-protect-your-rights-and-activity-online-eu-2024-02-16_en)

## Validation and kill criteria

| Question | Evidence gate | Kill or pivot signal |
|---|---|---|
| Is the seller workspace useful? | 8/12 pilot sellers prefer it; 6/12 return with another item; median preparation-to-handoff time falls at least 30% | One-time generated-copy use; no saved/exported record or repeat |
| Will repeat sellers pay? | 20 recruited sellers; at least 8 weekly active after four weeks and 5 willing to pay after real use | Below both thresholds or support cost exceeds plausible revenue |
| Does category capture differentiate? | Fewer material omissions/invented specs than comparator; users cite capture/provenance unprompted | Generic AI copy performs equivalently; prompts add friction |
| Do public pages matter? | Measurable opt-in sharing/revisit/contact without privacy/fraud incident | Used only as previews or users refuse public exposure |
| Is API/MCP a separate product? | At least 3 design partners repeatedly use stable read/preview endpoints and request specific capabilities | Curiosity demos; ordinary UI/export is sufficient |
| Is infrastructure real? | Two paid design partners and two sanctioned adapters with reliable create/update/end semantics | No written authority/OAuth/lifecycle contract; Playwright does not count |
| Is a marketplace justified? | Demonstrated vertical supply density plus a funded buyer-acquisition and moderation plan | Draft/sign-up counts used as a liquidity proxy |

## Specialist disagreements and consensus

Consensus:

- international APIs are real;
- Hungarian connector permission is the gating dependency;
- a new general marketplace is premature;
- generic AI copy, MCP and browser automation are not moats;
- authorized seller infrastructure is worth a bounded test.

Difference in emphasis:

- the Hungarian-market specialist sees a promising seller-workspace wedge;
- the skeptical specialist assigns it a high proof burden because repeat use/payment are unknown;
- the architecture specialist considers the platform feasible but multi-quarter once credentials,
  public APIs, moderation and partner connectors become real;
- the international specialist sees strong precedent, but mostly for merchants rather than casual
  one-item sellers.

The staged pilot and precommitted kill criteria preserve all four views.

## Recommended next action

Run two tests in parallel:

1. **Demand:** recruit 10–20 repeat sellers in one Hungarian vertical; process real items and test
   reuse/payment using the thresholds above.
2. **Access:** send the multi-seller API/feed questionnaire to Jófogás and Vatera, and interview
   2–3 eligible eBay/Etsy sellers about an OAuth-authorized workflow.

Do not build public write APIs, credential custody, buyer discovery, payments, federation or a
Hungarian remote-write connector until those tests return evidence.

## Evidence status

- **PASS:** four independent specialist reports completed and synthesized.
- **PASS:** international API, OAuth, lifecycle and MCP distinctions verified from primary sources.
- **PASS:** a staged Hungary-first product and explicit kill criteria defined.
- **NOT RUN:** seller interviews, paid demand, partner outreach, API credentials, live connector or
  public-page traffic test.
- **BLOCKED:** production multi-seller publishing until platforms provide written authorization.
