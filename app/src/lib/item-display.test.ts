import { describe, expect, it } from 'vitest'
import { EMPTY_FACTS, EMPTY_FACT_SOURCES, type ItemRecord } from './item-contract'
import {
  deriveTodos,
  displayStatus,
  formatHuf,
  itemMeta,
  relativeDays,
  suggestedPriceCut,
} from './item-display'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 8, 24, 12)

function item(
  patch: Partial<ItemRecord> = {},
  facts: Partial<ItemRecord['facts']> = {}
): ItemRecord {
  return {
    id: 'item-1',
    facts: {
      ...EMPTY_FACTS,
      title: 'Citizen karóra',
      priceHuf: 34_900,
      city: 'Piliscsaba',
      contactValue: 'elado@example.com',
      ...facts,
    },
    photos: [{ id: 'p1', name: 'a.jpg', contentType: 'image/jpeg', size: 1 }],
    status: 'draft',
    revision: 1,
    createdAt: NOW - 30 * DAY,
    updatedAt: NOW - DAY,
    shareId: null,
    postings: [],
    factSources: EMPTY_FACT_SOURCES,
    aiSuggestion: null,
    priceSuggestion: null,
    ...patch,
  }
}

describe('item display rules', () => {
  it('calls an item advertised only when a link exists or the seller reported a post', () => {
    expect(displayStatus(item())).toBe('draft')
    expect(displayStatus(item({ shareId: 'share' }))).toBe('active')
    expect(
      displayStatus(
        item({
          postings: [
            { destination: 'jofogas', status: 'reported_posted', url: '', updatedAt: NOW },
          ],
        })
      )
    ).toBe('active')
    expect(
      displayStatus(
        item({
          postings: [
            { destination: 'jofogas', status: 'reported_removed', url: '', updatedAt: NOW },
          ],
        })
      )
    ).toBe('draft')
    expect(displayStatus(item({ status: 'sold', shareId: 'share' }))).toBe('sold')
  })

  it('formats forints and relative days in Hungarian', () => {
    expect(formatHuf(34_900)).toBe('34 900 Ft')
    expect(relativeDays(0)).toBe('ma')
    expect(relativeDays(1)).toBe('tegnap')
    expect(relativeDays(12)).toBe('12 napja')
    expect(relativeDays(21)).toBe('3 hete')
    expect(suggestedPriceCut(34_900)).toBe(31_400)
  })

  it('describes each card by where it is or what it still needs', () => {
    expect(itemMeta(item({ photos: [] }), NOW)).toBe('Nincs még fotó')
    expect(itemMeta(item({}, { city: '' }), NOW)).toBe('Még 1 dolog hiányzik')
    expect(itemMeta(item(), NOW)).toBe('Kész a feladásra')
    expect(
      itemMeta(
        item({
          shareId: 'share',
          postings: [
            {
              destination: 'jofogas',
              status: 'reported_posted',
              url: '',
              updatedAt: NOW - 12 * DAY,
            },
          ],
        }),
        NOW
      )
    ).toBe('Jófogás, saját link · 12 napja')
  })

  it('puts a sold item that is still reported as posted first', () => {
    const todos = deriveTodos(
      [
        item({ id: 'empty', photos: [] }),
        item({
          id: 'sold',
          status: 'sold',
          postings: [
            { destination: 'facebook', status: 'reported_posted', url: '', updatedAt: NOW },
          ],
        }),
        item({
          id: 'old',
          postings: [
            {
              destination: 'jofogas',
              status: 'reported_posted',
              url: '',
              updatedAt: NOW - 11 * DAY,
            },
          ],
        }),
        item({ id: 'ready' }),
      ],
      NOW
    )
    expect(todos.map((todo) => [todo.itemId, todo.action])).toEqual([
      ['sold', 'take-down'],
      ['old', 'price-cut'],
      ['ready', 'post'],
      ['empty', 'add-photo'],
    ])
    expect(todos[0]).toMatchObject({ title: 'Vedd le a Facebookról', item: 'Citizen karóra' })
    expect(todos[1]!.text).toContain('31 400 Ft')
  })

  it('never nags about a fresh post or an item already taken down', () => {
    expect(
      deriveTodos(
        [
          item({
            postings: [
              {
                destination: 'jofogas',
                status: 'reported_posted',
                url: '',
                updatedAt: NOW - 3 * DAY,
              },
            ],
          }),
          item({
            id: 'sold',
            status: 'sold',
            postings: [
              { destination: 'jofogas', status: 'reported_removed', url: '', updatedAt: NOW },
            ],
          }),
        ],
        NOW
      )
    ).toEqual([])
  })
})
