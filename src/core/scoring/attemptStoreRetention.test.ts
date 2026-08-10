import { describe, expect, it } from 'vitest'
import { shouldPruneAttemptHistory } from './attemptStore'

describe('attempt history retention policy', () => {
  it('keeps generic history pruning enabled by default', () => {
    expect(shouldPruneAttemptHistory()).toBe(true)
    expect(shouldPruneAttemptHistory({ pruneHistory: true })).toBe(true)
  })

  it('allows a caller with durable evidence semantics to retain full history', () => {
    expect(shouldPruneAttemptHistory({ pruneHistory: false })).toBe(false)
  })
})
