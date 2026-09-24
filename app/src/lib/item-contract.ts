/** Portable domain contract. No transport, browser or backend imports. */
export const CATEGORY_LABELS = {
  bicycle: 'Kerékpár',
  electronics: 'Elektronika',
  furniture: 'Bútor',
  household: 'Háztartás',
  clothing: 'Ruha és kiegészítő',
  sport: 'Sport',
  toy: 'Játék',
  book: 'Könyv és média',
  other: 'Más tárgy',
} as const
export type Category = keyof typeof CATEGORY_LABELS
export type WorkingCondition = 'unknown' | 'working' | 'needs_repair'
export type DefectsStatus = 'unknown' | 'none' | 'listed'
export type AccessoriesStatus = 'unknown' | 'complete' | 'listed'
export type ContactKind = 'email' | 'phone' | 'link'
export type ItemStatus = 'draft' | 'active' | 'sold'
export type Destination = 'jofogas' | 'facebook'
export type FactSource = 'unknown' | 'ai' | 'location' | 'seller'
export interface FactSources {
  category: FactSource
  title: FactSource
  description: FactSource
  city: FactSource
  manufacturer: FactSource
  model: FactSource
  priceHuf: FactSource
}
export interface PriceSuggestion {
  query: string
  manufacturer?: string
  searchEntryPoint?: string
  priceHuf: number
  lowHuf: number
  highHuf: number
  summary: string
  sources: { title: string; url: string }[]
  researchedAt: number
}
export interface ItemSuggestion {
  model: string
  analyzedAt: number
  visibleDetails: string[]
  possibleDefects: string[]
  photo: {
    score: number
    ready: boolean
    summary: string
    issues: string[]
    suggestedAngles: string[]
  }
}
export interface ItemFacts {
  category: Category
  title: string
  manufacturer: string
  model: string
  description: string
  aestheticNotes: string[]
  accessoriesStatus: AccessoriesStatus
  accessories: string[]
  priceHuf: number | null
  city: string
  pickupNote: string
  workingCondition: WorkingCondition
  defectsStatus: DefectsStatus
  defects: string[]
  negotiable: boolean
  contactKind: ContactKind
  contactValue: string
  privateNote: string
}
export const EMPTY_FACTS: ItemFacts = {
  category: 'other',
  title: '',
  manufacturer: '',
  model: '',
  description: '',
  aestheticNotes: [],
  accessoriesStatus: 'unknown',
  accessories: [],
  priceHuf: null,
  city: '',
  pickupNote: '',
  workingCondition: 'unknown',
  defectsStatus: 'unknown',
  defects: [],
  negotiable: false,
  contactKind: 'email',
  contactValue: '',
  privateNote: '',
}
export const FACT_SOURCE_KEYS = [
  'category',
  'title',
  'description',
  'city',
  'manufacturer',
  'model',
  'priceHuf',
] as const satisfies readonly (keyof FactSources)[]
export type FactSourceKey = (typeof FACT_SOURCE_KEYS)[number]
export const EMPTY_FACT_SOURCES: FactSources = {
  category: 'unknown',
  title: 'unknown',
  description: 'unknown',
  city: 'unknown',
  manufacturer: 'unknown',
  model: 'unknown',
  priceHuf: 'unknown',
}
export interface ItemPhoto {
  id: string
  name: string
  contentType: string
  size: number
}
export interface Posting {
  destination: Destination
  status: 'reported_posted' | 'reported_removed'
  url: string
  updatedAt: number
}
export interface ItemRecord {
  id: string
  facts: ItemFacts
  photos: ItemPhoto[]
  status: ItemStatus
  revision: number
  createdAt: number
  updatedAt: number
  shareId: string | null
  postings: Posting[]
  factSources: FactSources
  aiSuggestion: ItemSuggestion | null
  priceSuggestion: PriceSuggestion | null
  /** True when the shared page still shows an older snapshot than the owner's facts/photos. */
  publicationOutdated?: boolean
}
export interface PublicItem {
  shareId: string
  title: string
  description: string
  manufacturer: string
  model: string
  aestheticNotes: string[]
  accessoriesStatus: AccessoriesStatus
  accessories: string[]
  priceHuf: number
  city: string
  pickupNote: string
  workingCondition: WorkingCondition
  defectsStatus: DefectsStatus
  defects: string[]
  negotiable: boolean
  contactKind: ContactKind
  contactValue: string
  status: 'active' | 'sold'
  photos: { id: string; name: string }[]
  updatedAt: number
}
/** Buyer-facing condition, written about the seller's claim. */
export const CONDITION_LABELS: Record<WorkingCondition, string> = {
  working: 'Kipróbálva, működik',
  unknown: 'Nincs kipróbálva',
  needs_repair: 'Javításra szorul',
}
/** Seller-facing answers, in the order the editor offers them. */
export const CONDITION_CHOICES: readonly (readonly [WorkingCondition, string])[] = [
  ['working', 'Kipróbáltam, működik'],
  ['unknown', 'Nem próbáltam ki'],
  ['needs_repair', 'Javításra szorul'],
]
export const DEFECT_CHOICES: readonly (readonly [DefectsStatus, string])[] = [
  ['listed', 'Igen, leírom'],
  ['none', 'Nem tudok hibáról'],
  ['unknown', 'Nem néztem meg'],
]
export const ACCESSORY_CHOICES: readonly (readonly [AccessoriesStatus, string])[] = [
  ['complete', 'Minden megvan'],
  ['listed', 'Felsorolom, mi van meg'],
  ['unknown', 'Nem néztem meg'],
]
/** The seller's own words, used in the text they paste into a marketplace. */
const LISTING_CONDITION: Record<WorkingCondition, string> = {
  working: 'kipróbáltam, működik',
  unknown: 'nem próbáltam ki',
  needs_repair: 'javításra szorul',
}
export function defectText(facts: Pick<ItemFacts, 'defectsStatus' | 'defects'>): string {
  if (facts.defectsStatus === 'listed') return facts.defects.join('; ')
  return facts.defectsStatus === 'none'
    ? 'Az eladó nem tud hibáról.'
    : 'A hibákat az eladó még nem nézte át.'
}
function listingDefects(facts: Pick<ItemFacts, 'defectsStatus' | 'defects'>): string {
  if (facts.defectsStatus === 'listed') return facts.defects.join('; ')
  return facts.defectsStatus === 'none' ? 'nem tudok hibáról' : 'még nem néztem át'
}
export function composeListing(f: ItemFacts, destination: Destination = 'jofogas'): string {
  const details = [
    f.manufacturer && `Márka: ${f.manufacturer}`,
    f.model && `Típus: ${f.model}`,
    ...f.aestheticNotes.map((note) => `Külső: ${note}`),
    ...(f.accessoriesStatus === 'complete'
      ? ['Tartozékok: minden gyári tartozék megvan']
      : f.accessoriesStatus === 'listed'
        ? f.accessories.map((entry) => `Tartozék: ${entry}`)
        : []),
  ].filter(Boolean)
  const lines = [
    f.title.trim(),
    f.priceHuf === null
      ? 'Ár: megegyezés szerint'
      : `${new Intl.NumberFormat('hu-HU').format(f.priceHuf)} Ft · ${f.negotiable ? 'alkuképes' : 'fix ár'}`,
    '',
    f.description.trim(),
    ...(details.length ? ['', ...details.map((detail) => `• ${detail}`)] : []),
    '',
    `Működés: ${LISTING_CONDITION[f.workingCondition]}`,
    `Ismert hibák: ${listingDefects(f)}`,
    `Átvétel: ${f.city}${f.pickupNote ? ` · ${f.pickupNote}` : ''}`,
  ]
  return (destination === 'facebook' ? ['Eladó', ...lines] : lines).join('\n').trim()
}
export function suggestedDescription(f: ItemFacts): string {
  return `Eladó ${f.title.trim() || 'a képeken látható tárgy'}. ${f.city ? `Személyesen átvehető: ${f.city}.` : 'Az átvétel részletei egyeztethetők.'}`
}
export function contactHref(kind: ContactKind, value: string, title = ''): string {
  if (kind === 'email') return `mailto:${value.trim()}?subject=${encodeURIComponent(title)}`
  if (kind === 'phone') return `tel:${value.replace(/[\s()-]/g, '')}`
  return value.trim()
}
export function publicationProblems(f: ItemFacts, photoCount: number): string[] {
  const problems: string[] = []
  if (!f.title.trim()) problems.push('Adj rövid címet a tárgynak.')
  if (f.priceHuf === null || !Number.isSafeInteger(f.priceHuf) || f.priceHuf <= 0)
    problems.push('Add meg az árat egész forintban.')
  if (!f.city.trim()) problems.push('Add meg a települést, ahol átvehető.')
  if (!photoCount) problems.push('Tölts fel legalább egy fotót.')
  if (f.defectsStatus === 'listed' && !f.defects.some((x) => x.trim()))
    problems.push('Írd le röviden az ismert hibát.')
  const c = f.contactValue.trim()
  const valid =
    f.contactKind === 'email'
      ? /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(c)
      : f.contactKind === 'phone'
        ? /^\+?[\d\s()-]{7,25}$/.test(c)
        : /^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/.test(c)
  if (!valid)
    problems.push(
      f.contactKind === 'email'
        ? 'Adj meg egy érvényes e-mail-címet, ahol a vevők elérnek.'
        : f.contactKind === 'phone'
          ? 'Adj meg egy érvényes telefonszámot, ahol a vevők elérnek.'
          : 'Adj meg egy https://-sel kezdődő linket, ahol a vevők elérnek.'
    )
  return problems
}
