import { describe, expect, it } from 'vitest'
import { MAX_PHOTOS } from '../itemValidators'
import { RATE_LIMIT_DEFS } from './rateLimitService'

describe('item AI rate limits', () => {
  it('reserves a complete item photo budget independently from research and correction', () => {
    expect(RATE_LIMIT_DEFS.analyzeItemPhotos).toMatchObject({
      rate: 50,
      period: 86_400_000,
      capacity: 50,
    })
    expect(RATE_LIMIT_DEFS.analyzeItemPhotos.capacity).toBeGreaterThanOrEqual(MAX_PHOTOS)
    expect(RATE_LIMIT_DEFS.researchItemPrice.capacity).toBe(4)
    expect(RATE_LIMIT_DEFS.correctItemText.capacity).toBe(10)
    expect(new Set(['analyzeItemPhotos', 'researchItemPrice', 'correctItemText']).size).toBe(3)
  })
})
