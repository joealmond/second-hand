import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isSellerEmail } from './config'

describe('seller email policy', () => {
  beforeEach(() => vi.stubEnv('SELLER_EMAILS', ' seller@example.com , second@example.com '))
  afterEach(() => vi.unstubAllEnvs())
  it('allows only configured Google accounts, case-insensitively', () => {
    expect(isSellerEmail(' SELLER@EXAMPLE.COM ')).toBe(true)
    expect(isSellerEmail('second@example.com')).toBe(true)
    expect(isSellerEmail('other@gmail.com')).toBe(false)
    expect(isSellerEmail(undefined)).toBe(false)
  })

  it('accepts only exact additional invited emails from backend configuration', () => {
    vi.stubEnv('ADDITIONAL_SELLER_EMAILS', ' Dealer@Example.com , other@example.com ')
    expect(isSellerEmail('dealer@example.com')).toBe(true)
    expect(isSellerEmail('OTHER@example.com')).toBe(true)
    expect(isSellerEmail('notdealer@example.com')).toBe(false)
    expect(isSellerEmail('')).toBe(false)
  })

  it('denies every account when no allowlist is configured', () => {
    vi.stubEnv('SELLER_EMAILS', '')
    vi.stubEnv('ADDITIONAL_SELLER_EMAILS', '')
    expect(isSellerEmail('seller@example.com')).toBe(false)
  })
})
