# Platform playbook

What each Hungarian selling destination needs from Tovább. Updated 2026-09-20 from the
[primary-source capability review](13-platform-capabilities-hungary-2026-09.md).

This is an implementation playbook, not a permanent specification. Platform fees, limits and
screens change. Keep volatile values out of code and generated copy; verify them in the current
platform UI before release.

## Product contract

**Prepare, hand off, let the seller post.** For ordinary private sellers, none of the reviewed
destinations provides a verified public listing-and-status API suitable for this product.
Professional feeds or partner tooling exist on Jófogás, Vatera and Meta, but their public evidence
does not establish eligibility for a multi-seller consumer assistant.

Store two different kinds of state:

- `seller-confirmed`: the seller says the listing was posted, sold or removed;
- `integration-verified`: a future authorized integration has read the remote state.

The current prototype implements only seller-confirmed state. Copying text, opening a destination
or receiving a listing URL is not verified publication.

## Quick comparison

| Destination | Cost/lifetime evidence | Transaction or shipping | Current Tovább support |
|---|---|---|---|
| Jófogás | Charges depend on category/count; universal lifetime not verified | Foxpost, GLS and MPL with service-specific rules | Assisted handoff |
| Vatera | Current schedule required; listings run at most 21 days | Native shipping/payment choices | Assisted handoff |
| Facebook Marketplace | Hungary availability verified; lifetime and Hungarian checkout/shipping unknown | Location/account dependent | Assisted handoff |
| Facebook buy/sell group | Group-specific rules and moderation | Usually arranged by members; do not assume | Assisted handoff |
| HardverApró | 8 free private ads, 12 with Premium; lifetime unknown; 25-day same-item re-ad restriction | Seller-arranged in reviewed public material | Assisted handoff |
| Vinted Hungary | Private selling free; lifetime unknown | Native checkout/label; dispatch within five working days | Constrained assisted handoff |

## Jófogás

### Ask and prepare

- Hungarian title and factual description.
- Seller-selected Jófogás category and region; never silently guess either.
- Price and platform contact details.
- Condition, known defects and included/missing accessories.
- Pickup or chosen carrier/service. When shipping, collect the parcel measurements that the
  selected service requests.
- Real item photos with a clear cover, whole item, identifying label/accessories and visible
  defects.

Jófogás moderates submissions. Official help says an accepted ad normally becomes visible within
30 minutes after the notification email; do not mark it live merely because the seller submitted
the form. Fees vary across categories and active-ad thresholds. Link to the current platform
schedule rather than reproducing prices.

An accessible official rules PDF prohibits generative-AI images, but its current effective date
could not be verified. Keep Jófogás originals-first, avoid synthetic backgrounds/models/objects,
and recheck the live rule before release.

### Do not claim

- a universal 90-day lifetime;
- a universal photo/title limit;
- one fixed shipping threshold or parcel limit;
- successful publication or remote status;
- general API access based on the real-estate XML feed or historical Bolt import.

## Vatera

### Ask and prepare

- Fixed-price or auction intent; the seller chooses the remote format.
- Accurate title, category, parameters, condition and every known defect.
- Price/auction values.
- Each offered shipping method, its charge and the payment choices.
- Pickup location when offered.

Listings run for at most 21 days, so a 21-day reminder is supported. The current fee schedule must
be checked at posting time. Do not describe Vatera as universally charging both a listing fee and
a commission.

Vatera rules prohibit directing buyers to telephone, email or an external contact site from item
text/images unless a separate agreement/category rule allows it. The Vatera export therefore
omits Tovább public-page links and contact details by default.

Professional SOAP/Partnerközpont tooling is not permission for this app to post for private
sellers. Keep the seller in control until written partner terms say otherwise.

## Facebook Marketplace

### Ask and prepare

- Editable Hungarian title and description.
- Price, category suggestion, condition/defects, location and handover facts.
- Original photos in seller-selected order.

Meta documents Marketplace in Hungary, selected inventory partnerships and a first-party Seller
app. The Seller launch was US/iOS-specific and is not a Hungarian third-party API. No reviewed
official source defines a public listing/status endpoint or supported prefilled composer URL.

Copy the package and open the ordinary Marketplace destination. The seller completes the form,
handles moderation/messages and confirms posting/removal. Do not infer Hungarian checkout,
shipping or status access from features announced for another country/account.

Do not automate or scrape Marketplace UI without written Meta authorization. Meta documents
enforcement against unauthorized automated scraping; that narrower evidence replaces the old
claim that every possible posting automation necessarily violates the same term.

## Facebook buy/sell groups

Treat groups as a separate destination from Marketplace.

- Generate a short, complete, editable post with price, approximate location, condition/defects
  and handover information.
- Let the seller choose the group, read its current rules and attach original photos.
- Store the group name/note, seller confirmation and optional post URL.
- Never claim administrator approval, publication or continuing visibility.

Facebook confirms buy/sell groups as a selling surface, but the reviewed official sources do not
define universal group fields, length/crop conventions, programmatic posting, rules access or
moderation status. Learn individual group conventions through the Hungarian pilot; do not encode
them as platform facts.

## HardverApró

### Ask and prepare

- Exact brand, model and configuration/specifications.
- Fixed price, condition, purchase date/proof and remaining warranty.
- Accessories, missing parts, known faults and tests performed.
- Pickup location and seller-arranged shipping availability/cost/responsibility.

The audience is technically informed, so prefer exact facts over sales adjectives. A private
account has 8 free ads (12 with Premium). The same item cannot be duplicated or advertised again
within 25 days unless the repeat ad is paid. Warn the seller; do not implement automatic relisting.

No current public integration programme, defined universal ad lifetime or native carrier/payment
contract was found. `Csomagküldéssel is` is a listing/filter attribute, not evidence of a carrier
integration.

## Vinted Hungary

Vinted is not clothes-only. Hungarian private sellers may list permitted clothing, home, hobby
and selected consumer-electronics items, but must not use a private account commercially.

### Mandatory preflight

- One available item in the correct permitted category.
- Declared condition plus every fault, modification and missing part.
- Seller-created, Vinted-purpose, **unedited** photos: no crop, cleanup, background removal,
  generated content, stock image, text or watermark. First photo shows the whole item; maximum 20.
- No external product/public-page/contact link in listing text.
- Seller uses Vinted checkout and the purchased shipping label, then dispatches within five
  working days.

Export immutable originals only. This is the deliberate exception to the normal derived-photo
pipeline. Vinted prohibits external tools such as bots/scrapers/crawlers unless authorized and
also restricts repeated/bulk relisting. Do not automate login, posting, status, messages or relist.

## Universal rules

1. Keep the same confirmed price unless the seller explicitly chooses otherwise.
2. Preserve known defects in every destination variant.
3. Preserve originals. Apply only destination-allowed derivatives; Vinted receives originals.
4. Never expose private notes, a floor price, unpublished photos or a home address.
5. Record where the seller says they posted and ask for the external URL when useful.
6. When sold, generate a removal checklist. Do not claim automatic delisting.
7. Automate only through documented authorization covering this product and Hungarian/account
   scope.
8. Recheck volatile fees, shipping limits, category rules and policy dates before release.

## Current implementation implications

The TypeScript prototype currently supports `jofogas` and one combined `facebook` destination,
with seller-reported posting/removal. Before adding another destination:

- split Marketplace from Facebook groups;
- add category mappings and category-specific facts;
- model pickup and shipping per service, including parcel measurements;
- add destination photo eligibility and preflight rules;
- store confirmation time, external URL and optional expiry/reminder;
- reserve a separate state for future integration-verified status.

The original Python `PLATFORMS` table remains an export formatter, not an integration registry.
