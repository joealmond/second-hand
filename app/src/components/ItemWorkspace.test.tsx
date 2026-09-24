import { describe, expect, it } from 'vitest'
import { shouldShowAiProgress } from './ItemWorkspace'

describe('AI progress', () => {
  it('stays visible from photo upload through AI analysis', () => {
    expect(shouldShowAiProgress(true, 0)).toBe(true)
    expect(shouldShowAiProgress(false, 1)).toBe(true)
    expect(shouldShowAiProgress(false, 0)).toBe(false)
  })
})
