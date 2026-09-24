export interface LatestTaskState<T> {
  running: boolean
  pending: T | null
}

export async function runLatestTask<T>(
  state: LatestTaskState<T>,
  value: T,
  work: (value: T) => Promise<void>
): Promise<void> {
  state.pending = value
  if (state.running) return
  state.running = true
  try {
    while (state.pending !== null) {
      const next = state.pending
      state.pending = null
      await work(next)
    }
  } finally {
    state.running = false
  }
}
