/** Display rules shared by the seller screens. Pure functions over the item contract. */
import { publicationProblems, type Destination, type ItemRecord } from './item-contract'

export type DisplayStatus = 'draft' | 'active' | 'sold'

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: 'Piszkozat',
  active: 'Megosztva',
  sold: 'Eladva',
}

export const DESTINATION_LABELS: Record<Destination, string> = {
  jofogas: 'Jófogás',
  facebook: 'Facebook',
}

const DAY = 24 * 60 * 60 * 1000
const NBSP = ' '

/**
 * "Megosztva" means the seller shared a link or reported a marketplace post.
 * A reported post is the seller's own statement; nothing here claims it is live.
 */
export function displayStatus(item: Pick<ItemRecord, 'status' | 'shareId' | 'postings'>) {
  if (item.status === 'sold') return 'sold' as const
  if (item.shareId || item.postings.some((posting) => posting.status === 'reported_posted'))
    return 'active' as const
  return 'draft' as const
}

export function formatHuf(value: number): string {
  return `${new Intl.NumberFormat('hu-HU').format(value).replace(/\s/g, NBSP)}${NBSP}Ft`
}

export function money(value: number | null): string {
  return value === null ? 'Nincs még ár' : formatHuf(value)
}

export function daysSince(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / DAY))
}

export function relativeDays(days: number): string {
  if (days <= 0) return 'ma'
  if (days === 1) return 'tegnap'
  if (days < 14) return `${days} napja`
  if (days < 60) return `${Math.floor(days / 7)} hete`
  return `${Math.floor(days / 30)} hónapja`
}

export function reportedDestinations(item: Pick<ItemRecord, 'postings'>): Destination[] {
  return item.postings
    .filter((posting) => posting.status === 'reported_posted')
    .map((posting) => posting.destination)
}

/** When the seller first reported a still-standing marketplace post. */
export function postedSince(item: Pick<ItemRecord, 'postings'>): number | null {
  const times = item.postings
    .filter((posting) => posting.status === 'reported_posted')
    .map((posting) => posting.updatedAt)
  return times.length ? Math.min(...times) : null
}

/** A 10% cut, rounded down to the nearest hundred forints. */
export function suggestedPriceCut(price: number): number {
  return Math.max(100, Math.floor((price * 0.9) / 100) * 100)
}

/** "a Jófogásról és a Facebookról" */
function fromPlaces(destinations: Destination[]): string {
  return destinations.map((destination) => `a ${DESTINATION_LABELS[destination]}ról`).join(' és ')
}

/** One short line under an item card: where it is, or what it still needs. */
export function itemMeta(item: ItemRecord, now: number): string {
  const status = displayStatus(item)
  if (status === 'sold') return 'Eladva'
  if (status === 'active') {
    const places = [
      ...reportedDestinations(item).map((destination) => DESTINATION_LABELS[destination]),
      ...(item.shareId ? ['saját link'] : []),
    ].join(', ')
    const since = postedSince(item)
    return since === null ? places : `${places} · ${relativeDays(daysSince(since, now))}`
  }
  if (!item.photos.length) return 'Nincs még fotó'
  const missing = publicationProblems(item.facts, item.photos.length).length
  return missing ? `Még ${missing} dolog hiányzik` : 'Kész a feladásra'
}

export type TodoAction = 'take-down' | 'price-cut' | 'add-photo' | 'finish' | 'post'

export interface Todo {
  id: string
  itemId: string
  action: TodoAction
  tone: 'warn' | 'amber' | 'mint'
  /** What to do, e.g. "Vedd le a Jófogásról". */
  title: string
  /** Which item it is about. */
  item: string
  text: string
  cta: string
}

const PRICE_CUT_AFTER_DAYS = 10
const ORDER: Record<TodoAction, number> = {
  'take-down': 0,
  'price-cut': 1,
  finish: 2,
  post: 3,
  'add-photo': 4,
}

/** The few next steps worth the seller's attention, most urgent first. */
export function deriveTodos(items: ItemRecord[], now: number): Todo[] {
  const entries: { todo: Todo; updatedAt: number }[] = []
  for (const item of items) {
    const name = item.facts.title.trim() || 'Névtelen tárgy'
    const status = displayStatus(item)
    const add = (action: TodoAction, todo: Omit<Todo, 'id' | 'itemId' | 'action' | 'item'>) =>
      entries.push({
        todo: { id: `${item.id}:${action}`, itemId: item.id, action, item: name, ...todo },
        updatedAt: item.updatedAt,
      })
    const reported = reportedDestinations(item)
    if (status === 'sold') {
      if (reported.length)
        add('take-down', {
          tone: 'warn',
          title: `Vedd le ${fromPlaces(reported)}`,
          text: 'Eladottnak jelölted, de ott még feladottként szerepel. Ha levetted, jelöld itt is.',
          cta: 'Megnézem',
        })
      continue
    }
    if (status === 'active') {
      const since = postedSince(item)
      const days = since === null ? 0 : daysSince(since, now)
      if (since !== null && days >= PRICE_CUT_AFTER_DAYS && item.facts.priceHuf)
        add('price-cut', {
          tone: 'amber',
          title: `${days} napja hirdetve`,
          text: `Ha még nem kelt el, érdemes 10%-kal lejjebb menni: ${formatHuf(
            suggestedPriceCut(item.facts.priceHuf)
          )}.`,
          cta: 'Árcsökkentés',
        })
      continue
    }
    if (!item.photos.length) {
      add('add-photo', {
        tone: 'mint',
        title: 'Nincs még fotó',
        text: 'Két kép elég az induláshoz: egy egészben, egy közelről.',
        cta: 'Fotózás',
      })
      continue
    }
    const problems = publicationProblems(item.facts, item.photos.length)
    if (problems.length)
      add('finish', {
        tone: 'mint',
        title: `Még ${problems.length} dolog hiányzik`,
        text: problems[0]!,
        cta: 'Folytatom',
      })
    else
      add('post', {
        tone: 'mint',
        title: 'Kész a feladásra',
        text: 'Minden adat megvan. Válaszd ki, hol hirdeted.',
        cta: 'Feladás',
      })
  }
  return entries
    .sort((a, b) => ORDER[a.todo.action] - ORDER[b.todo.action] || b.updatedAt - a.updatedAt)
    .map((entry) => entry.todo)
}
