import type { Category, FactSources, ItemFacts, ItemSuggestion } from '../../src/lib/item-contract'

const categories = new Set<Category>([
  'bicycle',
  'electronics',
  'furniture',
  'household',
  'clothing',
  'sport',
  'toy',
  'book',
  'other',
])

export function canonicalManufacturer(value: string): string {
  const normalized = value.trim().toLocaleLowerCase('hu')
  if (normalized === 'logi' || normalized === 'logitech') return 'Logitech'
  return value.trim()
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function texts(value: unknown, count: number, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => text(entry, max))
    .filter(Boolean)
    .slice(0, count)
}

export interface ParsedItemAnalysis {
  category: Category
  title: string
  manufacturer: string
  model: string
  description: string
  aestheticNotes: string[]
  accessories: string[]
  visibleDetails: string[]
  possibleDefects: string[]
  photo: ItemSuggestion['photo']
}

export function parseItemAnalysis(value: unknown): ParsedItemAnalysis {
  if (!value || typeof value !== 'object') throw new Error('Invalid Gemini result')
  const input = value as Record<string, unknown>
  const category = categories.has(input.category as Category)
    ? (input.category as Category)
    : 'other'
  const title = text(input.title, 140)
  const description = text(input.description, 1200)
  const photoInput =
    input.photo && typeof input.photo === 'object' ? (input.photo as Record<string, unknown>) : {}
  const rawScore = typeof photoInput.score === 'number' ? photoInput.score : 0
  if (!title || !description) throw new Error('Incomplete Gemini result')
  return {
    category,
    title,
    manufacturer: canonicalManufacturer(text(input.manufacturer, 120)),
    model: text(input.model, 120),
    description,
    aestheticNotes: texts(input.aestheticNotes, 8, 180),
    accessories: texts(input.accessories, 12, 180),
    visibleDetails: texts(input.visibleDetails, 12, 180),
    possibleDefects: texts(input.possibleDefects, 8, 180),
    photo: {
      score: Math.max(0, Math.min(100, Math.round(rawScore))),
      ready: photoInput.ready === true,
      summary: text(photoInput.summary, 300),
      issues: texts(photoInput.issues, 6, 180),
      suggestedAngles: texts(photoInput.suggestedAngles, 6, 180),
    },
  }
}

export function protectedDetailsPreserved(original: string, suggestion: string): boolean {
  const protectedTokens =
    original
      .toLocaleLowerCase('hu')
      .match(
        /(?:\d+[\d .,:-]*|nem|nincs|soha|hibás|hiba|sérült|karcos|repedt|hiányzik|nem működik)/g
      ) ?? []
  const candidate = suggestion.toLocaleLowerCase('hu')
  return protectedTokens.every((token) => candidate.includes(token.trim()))
}

export const itemAnalysisPrompt = `Használt tárgy eladását segítő magyar képelemző vagy.

Azonosítsd a fotók központi tárgyát, majd adj rövid, tárgyilagos magyar hirdetési javaslatot és fotózási tanácsot.

Szabályok:
- Csak azt állítsd, ami a képen látható. Márkát, modellt, anyagot vagy méretet csak olvasható/biztos jel alapján írj.
- A manufacturer a kanonikus gyártó vagy márka (például a „logi” logó jelentése Logitech), a model a címkén pontosan olvasható típus/modell; ha nem olvasható, legyen üres. Az adattábla és modellfelirat erősebb bizonyíték a korábbi képi becslésnél. A karaktereket pontosan másold, ne cseréld fel (például 2S nem S2).
- Csak akkor kérj címke-, adattábla-, vonalkód- vagy feliratfotót a suggestedAngles mezőben, ha a tárgy láthatóan gyártott termék és a pontos azonosítás hasznos. Kézzel készített, generikus vagy márka nélküli tárgynál hagyd üresen a gyártót és modellt, és ne kérj ilyen fotót.
- A cím legfeljebb 12 szó, természetes magyar hirdetési cím.
- A leírás rövid, tömör felsorolás legyen, soronként egy • jellel kezdődő vevői tény. Térj ki a látható esztétikai állapotra és a fotón biztosan látható tartozékokra.
- A leírás legfeljebb 6 rövid sor. Ne állítsd, hogy működik, hibátlan, eredeti vagy teljes, ha ez a képből nem bizonyítható. Árat ne adj.
- A possibleDefects csak ténylegesen látható, lehetséges sérüléseket tartalmazzon. Üres lista nem jelenti azt, hogy hibátlan.
- Az összes kapott fotót együtt értékeld, és az új, pontosabb bizonyítékkal javítsd a korábbi AI-becslést. A seller-confirmed tényeket és ismert hibákat ne írd felül.
- A fotókat együtt értékeld: élesség, fény, kivágás, zavaró háttér, felismerhetőség és szükséges nézetek.
- suggestedAngles csak még hiányzó, valóban hasznos következő képek legyenek, rövid felszólító mondatokkal.
- A ready akkor igaz, ha a tárgy felismerhető, a fő kép használható, és nincs nyilvánvalóan hiányzó alapnézet.
- Minden szöveg magyar legyen.`

export function itemAnalysisPromptFor(facts: ItemFacts, sources: FactSources): string {
  const previousAiIdentity = Object.fromEntries(
    (['category', 'title', 'manufacturer', 'model'] as const)
      .filter((key) => sources[key] === 'ai')
      .map((key) => [key, facts[key]])
  )
  return `${itemAnalysisPrompt}\n\nKorábbi AI-azonosítás (az új, erősebb képi bizonyítékkal javítsd):\n${JSON.stringify(previousAiIdentity)}`
}

export const itemAnalysisResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'category',
    'title',
    'manufacturer',
    'model',
    'description',
    'aestheticNotes',
    'accessories',
    'visibleDetails',
    'possibleDefects',
    'photo',
  ],
  properties: {
    category: { type: 'string', enum: [...categories] },
    title: { type: 'string' },
    manufacturer: { type: 'string' },
    model: { type: 'string' },
    description: { type: 'string' },
    aestheticNotes: { type: 'array', items: { type: 'string' } },
    accessories: { type: 'array', items: { type: 'string' } },
    visibleDetails: { type: 'array', items: { type: 'string' } },
    possibleDefects: { type: 'array', items: { type: 'string' } },
    photo: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'ready', 'summary', 'issues', 'suggestedAngles'],
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100 },
        ready: { type: 'boolean' },
        summary: { type: 'string' },
        issues: { type: 'array', items: { type: 'string' } },
        suggestedAngles: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}
