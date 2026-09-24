# Publishing connectors for Hungarian selling platforms

Research date: 2026-09-20. Scope: can Tovább create, update, remove and verify listings on
behalf of Hungarian sellers? AI-image policy is deliberately out of scope.

This review separates three questions:

1. Does a machine interface exist?
2. May this product use it for multiple independent Hungarian sellers?
3. If not, can browser automation safely replace it?

`Verified` means an official source states the fact. `Unknown` means public evidence does not
answer it; it is not permission. No partner account, API credential or listing was created.

## Short answer

**There is no verified self-service OAuth/API connector for ordinary Hungarian sellers on any of
the six reviewed destinations.** Production auto-publishing needs a platform agreement.

The strongest leads are:

1. **Jófogás:** commercial/category XML imports exist, and eligible Jófogás listings can be
   syndicated by Jófogás to Facebook Marketplace.
2. **Vatera:** professional SOAP/API/Partnerközpont tooling exists, but current onboarding and
   multi-seller authority are not public.
3. **Vinted:** a complete modern Pro API exists, but it is allowlisted and current Hungarian
   documentation does not make Vinted Pro registration available to Hungarian businesses.

Playwright can technically fill web forms. It does not create platform permission, stable field
contracts or verified remote status. Do not use unattended browser automation as the production
fallback.

## Capability table

| Destination | Official machine publishing | Create / update / delete | Remote status | Can Tovább use it for ordinary Hungarian sellers now? | Playwright / extension | Best route |
|---|---|---|---|---|---|---|
| **Jófogás** | **Conditional.** Verified real-estate XML; commercial Bolt/shop XML evidence. No public general seller API/OAuth. | Feed is source of truth in the documented real-estate flow; general item contract unknown. | At-least-daily import is verified; no general webhook/status API found. | **No verified authority.** Requires partner ID/activation or commercial agreement. | Technically feasible; permission unknown and UI/moderation make it fragile. Do not ship without written approval. | Ask for a multi-seller general-goods XML/API agreement. Meanwhile use seller handoff. Enable Jófogás→Facebook syndication when the seller is eligible. |
| **Vatera** | **Conditional.** Official sources refer to SOAP, API, item upload, PST and Partnerközpont. | Machine upload/update exists professionally; current public schema/auth/delete terms unknown. | No public webhook/status contract located. | **Unknown; not usable yet.** Obtain current partner terms and credentials. | Technically feasible; no permission or stable UI contract verified. | First partner enquiry alongside Jófogás. Build only after written multi-seller authority. |
| **Facebook Marketplace** | **No public ordinary-seller connector found.** Selected inventory partners exist. | No verified public create/update/delete API or OAuth scope. | No public listing-status/webhook contract found. | **No.** Partner-only unless Meta approves this exact use case. | Technically possible but **very high risk/maintenance**; do not build a Marketplace bot. | Use Jófogás→Marketplace syndication where eligible; otherwise manual handoff. |
| **Facebook buy/sell groups** | No verified buy/sell-listing connector. Generic group-post permission does not prove access for this app/group/workflow. | Unknown and group/app-review dependent. | Moderation and sale state are not a verified API contract. | **No universal route.** | Technically possible but high policy, spam and group-rule risk. | Prepare the group post; seller selects the group and submits. Seek both Meta and group approval for any pilot. |
| **HardverApró** | No public API, OAuth, feed or bulk programme found. | None verified. | None verified. | **No.** | Technically feasible; permission unknown, selectors unstable, account restrictions possible. | Ask the operator about a partner API. Otherwise manual handoff. |
| **Vinted Hungary** | **Yes, but not for this scope today.** Vinted Pro Integrations has REST, OpenAPI, sandbox and signed webhooks; access is limited to allowlisted Pro businesses. | Verified batch create, update and delete. | Verified item status, sold/order data and signed lifecycle webhooks. | **No for ordinary Hungarian sellers.** Current Hungarian help lists Pro eligibility countries and excludes Hungary; API docs do not grant agency access to unrelated private accounts. | Do not automate private accounts. External tools require Vinted authorization. | Revisit if Vinted launches Hungarian Pro and approves Tovább's account model. Manual handoff now. |

## The useful shortcut: Jófogás to Facebook Marketplace

Jófogás officially offers free Marketplace syndication for eligible private listings. The
seller opts in during Jófogás posting/editing and accepts both platforms' terms. No personal
Facebook profile is required; buyer contact remains through Jófogás.

Current published behavior:

- at least one photo, a price and description are required;
- eligible ordinary marketplace categories are supported, with stated exclusions;
- the overall free limit is 20 transfers per calendar month; the newly added property, vehicle
  and parts categories use up to 5 of that total;
- initial Marketplace appearance may take up to 24 hours;
- edits normally propagate in about 15 minutes and at most 24 hours;
- deletion from Jófogás normally removes the Marketplace copy in about 15 minutes.

[Official Jófogás syndication guide](https://blog.jofogas.hu/facebook-marketplace-hirdetes-attoltes/)

This does not give Tovább a Jófogás API. It does mean that one authorized Jófogás connector
could eventually cover two destinations without Tovább automating Facebook. Even before an API,
the handoff should instruct eligible sellers to leave the syndication checkbox enabled.

## Official connector evidence

### Jófogás

The real-estate workflow uses a supplier-hosted XML URL, a Jófogás-issued partner ID and email
activation. Jófogás fetches it at least daily, and later imports can overwrite account-side edits.
[Real-estate XML instructions](https://ugyfelszolgalat.jofogas.hu/eladas/hirdetesfeladas/hogyan-tudok-automatikusan-ingatlan-hirdetest-feltolteni-a-jofogasra/)

Current Jófogás shop offers advertise XML upload, while older Bolt terms document automatic
imports at commercial volumes. Public material does not answer whether a third-party service may
represent many private sellers or whether status/errors are returned.
[Current shop offers](https://ajanlataink.jofogas.hu/shop.html),
[Bolt import evidence](https://docs.jofogas.hu/bolt_valtozas_osszefoglalo/)

### Vatera

Vatera's own material distinguishes PST, SOAP, API and item-upload listings, while other help
refers to Partnerközpont/SOAP products. This establishes professional tooling but not public
credentials or a multi-seller contract.
[Programme notice](https://blog.vatera.hu/2024/09/17/elindult-az-uj-vatera20-hirdess-ingyen-program/),
[SOAP/Partnerközpont reference](https://www.vatera.hu/segitseg/az-aukcio-kozben/mi-az-az-akcio-es-hogyan-tudom-akciossa-tenni-a-hirdeteseimet/32/357)

### Vinted

Vinted Pro Integrations implements item create/update/delete, ontology mapping, polling, orders,
shipment labels and signed webhooks. It has production and sandbox environments. Access is limited
to allowlisted Vinted Pro businesses; the initial allocation is 500 active item slots per API user.
[Vinted Pro API](https://pro-docs.svc.vinted.com/)

Vinted's Hungarian help currently lists Pro registration for businesses in the Netherlands,
France, Italy, Luxembourg, Belgium, Portugal, Spain and the United Kingdom—not Hungary. That blocks
a normal Hungarian-business route today.
[Hungarian commercial-selling help](https://www.vinted.hu/help/1120)

## What Playwright can and cannot do

| Method | Technically possible | Main problem | Product decision |
|---|---|---|---|
| **Cloud/headless Playwright** | Can log in and manipulate forms if sessions/challenges permit. | Requires credentials/cookies, breaks on UI/anti-bot changes, cannot safely bypass CAPTCHA/2FA, high platform/account risk. | **Do not build.** |
| **Local Playwright using the seller's Chrome** | Can fill the seller's already-open account locally. | Still unapproved UI automation; selectors/A-B tests/mobile variants break; final acceptance/status remains unknown. | Personal experiment only after written platform approval; never stealth/headless. |
| **Chrome extension/content script** | Best technical UI-assist shape: explicit user action, visible fields, platform session stays in Chrome. | Still needs platform approval; host permissions and DOM maintenance; upload/moderation/payment steps vary. | If a platform approves UI assist, prefer this over Playwright and stop before submit unless full submit is explicitly allowed. |
| **Clipboard/photo package** | Yes, now. | More seller actions; no remote verification. | Ship for every unsupported platform. |
| **Official API/feed** | Yes after onboarding. | Commercial agreement, tokens, category schemas, media rules, async moderation and reconciliation. | Only production auto-publishing route. |

### Browser-automation guardrails

If a platform explicitly authorizes browser assistance:

- use the active signed-in Chrome profile locally; never send cookies/passwords to the server;
- require an explicit action for each listing and show every filled field;
- stop for CAPTCHA, 2FA, fees, identity checks and any changed terms;
- never bypass challenges, hide automation or scrape remote status;
- default to pausing before final submission unless the authorization expressly covers submit;
- store `seller-confirmed` status until an approved read interface proves otherwise;
- include a kill switch and expect continuous selector maintenance.

## Recommended connector ladder

1. **Now:** canonical item → destination package → open platform → seller submits → paste
   listing URL → seller-confirmed status.
2. **Jófogás handoff:** surface its official Facebook Marketplace syndication checkbox and explain
   the eligibility/limits.
3. **Partner outreach:** Jófogás and Vatera first; Vinted only after Hungarian Pro availability;
   Meta through a formal Marketplace partner route; HardverApró directly.
4. **Adapter boundary:** implement capabilities such as `create`, `update`, `remove`, `readStatus`
   but enable them only per authorized connector.
5. **Optional UI helper:** only if the platform approves it in writing. Prefer an interactive local
   Chrome extension, not remote Playwright.

## Questions that decide whether an integration is real

Send each platform the same short questionnaire:

1. May Tovább create, update and delete listings for multiple independent Hungarian private
   sellers?
2. What seller authorization is required: OAuth, per-account token, account linking, partner ID or
   master/agency account?
3. Which categories/account types qualify, and what are the fees and volume limits?
4. How are images supplied and which structured fields/taxonomies are mandatory?
5. Do you return listing ID/URL, moderation errors and live/sold/removed state through polling or
   webhooks?
6. Is interactive browser form filling permitted if no API is available, and must the seller press
   the final submit button?
7. What sandbox, support, rate limits, security/DPA and termination requirements apply?

## Evidence status

- **PASS:** primary-source review of official machine publishing and browser-automation policy.
- **PASS:** Jófogás→Marketplace syndication verified and separated from direct Meta access.
- **PASS:** Vinted Pro API verified; Hungarian Pro registration gap identified.
- **NOT RUN:** partner contact, account onboarding, credentials, sandbox, listing creation,
  extension or Playwright prototype.
- **BLOCKED:** production automatic publishing until a platform grants written multi-seller access
  and credentials.
