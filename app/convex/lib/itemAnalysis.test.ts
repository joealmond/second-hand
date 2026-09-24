import { describe, expect, it } from 'vitest'
import { parseItemAnalysis, protectedDetailsPreserved, canonicalManufacturer } from './itemAnalysis'

describe('item analysis', () => {
  it('canonicalizes an abbreviated manufacturer logo', () => {
    expect(canonicalManufacturer('logi')).toBe('Logitech')
    expect(canonicalManufacturer('Bosch')).toBe('Bosch')
  })
  it('normalizes a structured result and keeps uncertain defects separate', () => {
    const result = parseItemAnalysis({
      category: 'furniture',
      title: ' Fa szék ',
      description: 'Barna fa szék látható.',
      visibleDetails: [' barna ', ''],
      possibleDefects: ['Karc lehet az ülőlapon'],
      photo: {
        score: 104.4,
        ready: false,
        summary: ' Kissé sötét. ',
        issues: ['sötét'],
        suggestedAngles: ['Fotózd le oldalról.'],
      },
    })
    expect(result).toMatchObject({
      category: 'furniture',
      title: 'Fa szék',
      photo: { score: 100, ready: false },
    })
    expect(result.possibleDefects).toEqual(['Karc lehet az ülőlapon'])
  })

  it('falls back to other but rejects missing core copy', () => {
    expect(
      parseItemAnalysis({
        category: 'unknown',
        title: 'Tárgy',
        description: 'Látható tárgy.',
        photo: {},
      }).category
    ).toBe('other')
    expect(() => parseItemAnalysis({ title: '', description: '', photo: {} })).toThrow('Incomplete')
  })

  it('protects numbers, negations and defect words during wording correction', () => {
    expect(
      protectedDetailsPreserved(
        'Nem működik, 2 karcos tartozékkal.',
        '• Nem működik\n• 2 karcos tartozék'
      )
    ).toBe(true)
    expect(
      protectedDetailsPreserved(
        'Nem működik, 2 karcos tartozékkal.',
        'Szép állapotú, tartozékokkal.'
      )
    ).toBe(false)
    expect(protectedDetailsPreserved('A burkolat sérült.', 'A burkolat szép.')).toBe(false)
  })
})
