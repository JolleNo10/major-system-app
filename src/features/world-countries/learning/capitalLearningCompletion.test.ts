import { describe, expect, it, vi } from 'vitest'
import { createCapitalCompletionReporter } from './capitalLearningCompletion'

describe('Capital learning completion reporting', () => {
  it('reports a qualifying session once and can be reset for a review session', () => {
    const onCompleted = vi.fn()
    const reporter = createCapitalCompletionReporter(onCompleted)

    expect(reporter.report(false)).toBe(false)
    expect(reporter.report(true)).toBe(true)
    expect(reporter.report(true)).toBe(false)
    expect(onCompleted).toHaveBeenCalledTimes(1)

    reporter.reset()
    expect(reporter.report(true)).toBe(true)
    expect(onCompleted).toHaveBeenCalledTimes(2)
  })
})
