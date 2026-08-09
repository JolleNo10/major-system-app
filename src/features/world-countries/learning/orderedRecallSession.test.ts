import { describe, expect, it } from 'vitest'
import { createOrderedRecallSession, submitOrderedRecall } from './orderedRecallSession'

describe('ordered recall session', () => {
  it('starts at the first item and advances on correct answers', () => {
    let state = createOrderedRecallSession({ order: ['A', 'B', 'C'], rewindOnError: 2 })
    expect(state.currentIndex).toBe(0)
    state = submitOrderedRecall(state, 'A').state
    expect(state.currentIndex).toBe(1)
  })

  it('rewinds two positions and enters repair mode on an error', () => {
    let state = createOrderedRecallSession({ order: ['A', 'B', 'C', 'D'], rewindOnError: 2 })
    state = submitOrderedRecall(state, 'A').state
    state = submitOrderedRecall(state, 'B').state
    state = submitOrderedRecall(state, 'C').state
    const error = submitOrderedRecall(state, 'wrong')
    expect(error.correct).toBe(false)
    expect(error.expectedId).toBe('D')
    expect(error.state.currentIndex).toBe(1)
    expect(error.state.mode).toBe('repair')
  })

  it('requires a new clean pass after repair reaches the end', () => {
    let state = createOrderedRecallSession({ order: ['A', 'B'], rewindOnError: 2 })
    state = submitOrderedRecall(state, 'wrong').state
    state = submitOrderedRecall(state, 'A').state
    const restart = submitOrderedRecall(state, 'B')
    expect(restart.restartedCleanPass).toBe(true)
    expect(restart.completedNow).toBe(false)
    expect(restart.state.currentIndex).toBe(0)
    expect(restart.state.mode).toBe('clean')
    const first = submitOrderedRecall(restart.state, 'A').state
    const complete = submitOrderedRecall(first, 'B')
    expect(complete.completedNow).toBe(true)
  })

  it('an error during the restarted clean pass re-enters repair mode', () => {
    // Three countries; error at start rewinds to index 0, then repair completes the sequence.
    let state = createOrderedRecallSession({ order: ['A', 'B', 'C'], rewindOnError: 2 })
    // Initial error → repair mode, rewound to index 0
    state = submitOrderedRecall(state, false).state
    expect(state.mode).toBe('repair')
    expect(state.currentIndex).toBe(0)
    // Complete the repair pass (A → B → C) → restarts a clean pass
    state = submitOrderedRecall(state, 'A').state
    state = submitOrderedRecall(state, 'B').state
    const restart = submitOrderedRecall(state, 'C')
    expect(restart.restartedCleanPass).toBe(true)
    expect(restart.state.mode).toBe('clean')
    expect(restart.state.currentIndex).toBe(0)
    // Error mid clean pass → must re-enter repair, not complete
    state = submitOrderedRecall(restart.state, 'A').state
    const midPassError = submitOrderedRecall(state, false)
    expect(midPassError.correct).toBe(false)
    expect(midPassError.completedNow).toBe(false)
    expect(midPassError.state.mode).toBe('repair')
  })
})
