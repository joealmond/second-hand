import { describe, expect, it } from 'vitest'
import { ConvexError } from 'convex/values'
import { isRevisionConflict, itemErrorMessage } from './item-client'

describe('production item errors', () => {
  it('recognizes a revision conflict even when production hides the outer error message', () => {
    const error = new ConvexError('CONFLICT: A tárgy egy másik lapon megváltozott.')
    error.message = '[CONVEX M(items:save)] Server Error Called by client'
    expect(isRevisionConflict(error)).toBe(true)
    expect(itemErrorMessage(error)).toBe(error.data)
  })

  it('displays safe application validation data and retains ordinary network errors', () => {
    const error = new ConvexError('Adj meg egy pozitív árat.')
    error.message = 'Server Error'
    expect(itemErrorMessage(error)).toBe('Adj meg egy pozitív árat.')
    expect(isRevisionConflict(error)).toBe(false)
    expect(itemErrorMessage(new Error('Network unavailable'))).toBe('Network unavailable')
  })
})
