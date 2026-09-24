import { describe, expect, it } from 'vitest'
import { runLatestTask, type LatestTaskState } from './latest-task'

describe('latest task runner', () => {
  it('runs a changed identity once after the in-flight request settles', async () => {
    const state: LatestTaskState<string> = { running: false, pending: null }
    const seen: string[] = []
    let releaseFirst!: () => void
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const work = async (identity: string) => {
      seen.push(identity)
      if (identity === 'A') await firstBlocked
    }
    const first = runLatestTask(state, 'A', work)
    await Promise.resolve()
    await runLatestTask(state, 'B', work)
    await runLatestTask(state, 'B', work)
    expect(seen).toEqual(['A'])
    releaseFirst()
    await first
    expect(seen).toEqual(['A', 'B'])
  })
})
