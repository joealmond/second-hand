import { describe, expect, it } from 'vitest'
import {
  EMPTY_FACTS,
  composeListing,
  defectText,
  publicationProblems,
} from '../../src/lib/item-contract'
import { cleanFacts, detectImage, stripJpegMetadata } from './itemValidators'

// Marker-valid fixture used to exercise our byte-level policy only. It is not a
// decodable photograph, so these tests do not claim image-decoding coverage.
const JPEG_WITH_EXIF = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 0x45, 0x78, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda,
  0x00, 0x08, 0, 0, 0, 0, 0, 0, 0x11, 0x22, 0xff, 0xd9,
])

describe('item domain validators', () => {
  it('keeps unknown condition honest and carries known defects into both listing variants', () => {
    const facts = {
      ...EMPTY_FACTS,
      title: 'Régi bringa',
      priceHuf: 25_000,
      city: 'Szeged',
      contactValue: 'elado@example.com',
      workingCondition: 'unknown' as const,
      defectsStatus: 'listed' as const,
      defects: ['rozsdás lánc'],
    }
    expect(defectText(facts)).toBe('rozsdás lánc')
    expect(composeListing(facts, 'jofogas')).toContain('Működés: nem próbáltam ki')
    expect(composeListing(facts, 'facebook')).toContain('Ismert hibák: rozsdás lánc')
    expect(composeListing(facts, 'facebook')).not.toContain('Tartozék')
  })

  it('does not turn omitted defects into a flawless claim', () => {
    expect(defectText({ defectsStatus: 'unknown', defects: [] })).toContain('még nem nézte át')
    expect(composeListing({ ...EMPTY_FACTS, title: 'Lámpa' })).toContain(
      'Ismert hibák: még nem néztem át'
    )
    expect(
      publicationProblems(
        { ...EMPTY_FACTS, title: 'Tárgy', priceHuf: 1, city: 'Pécs', contactValue: 'a@b.hu' },
        1
      )
    ).toEqual([])
  })

  it('normalizes seller fields but rejects contradictory defects and invalid price', () => {
    expect(
      cleanFacts({
        ...EMPTY_FACTS,
        title: '  Lámpa ',
        defectsStatus: 'listed',
        defects: [' karc ', ' '],
      })
    ).toMatchObject({
      title: 'Lámpa',
      defects: ['karc'],
    })
    expect(() => cleanFacts({ ...EMPTY_FACTS, defects: ['karc'] })).toThrow('felsorolt hibákat')
    expect(() => cleanFacts({ ...EMPTY_FACTS, priceHuf: 1.5 })).toThrow('pozitív egész')
  })

  it('recognizes allowed signatures and rejects malformed upload bytes', () => {
    expect(detectImage(JPEG_WITH_EXIF)).toBe('image/jpeg')
    expect(detectImage(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png')
    expect(detectImage(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99]))).toBe(
      'image/heic'
    )
    expect(detectImage(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 105, 102, 49]))).toBe(
      'image/heif'
    )
    expect(detectImage(new Uint8Array([1, 2, 3, 4]))).toBeNull()
    expect(() => stripJpegMetadata(new Uint8Array([1, 2, 3, 4]))).toThrow('JPEG')
  })

  it('removes EXIF APP markers while preserving image segments and scan bytes', () => {
    const clean = stripJpegMetadata(JPEG_WITH_EXIF)
    expect([...clean]).toEqual([
      0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0, 0, 0, 0, 0, 0,
      0x11, 0x22, 0xff, 0xd9,
    ])
    expect(() => stripJpegMetadata(JPEG_WITH_EXIF.slice(0, -2))).toThrow('Hiányos')
  })
})
