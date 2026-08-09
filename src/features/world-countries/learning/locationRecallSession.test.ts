import { describe, expect, it } from 'vitest'
import { createLocationRecallSession, submitLocationSelection } from './locationRecallSession'

describe('location recall session', () => {
  it('uses the larger of the country count and configured minimum', () => {
    expect(createLocationRecallSession({ countryIds: ['A', 'B'], minimumCleanTarget: 5 }, () => 0).target).toBe(5)
    expect(createLocationRecallSession({ countryIds: ['A', 'B', 'C'], minimumCleanTarget: 2 }, () => 0).target).toBe(3)
  })

  it('increments clean streaks, resets on errors, and completes at target', () => {
    let state = createLocationRecallSession({ countryIds: ['A'], minimumCleanTarget: 2 }, () => 0)
    const wrong = submitLocationSelection(state, 'B', () => 0)
    expect(wrong.correct).toBe(false)
    expect(wrong.state.cleanStreak).toBe(0)
    state = wrong.state
    const first = submitLocationSelection(state, 'A', () => 0)
    expect(first.state.cleanStreak).toBe(1)
    const second = submitLocationSelection(first.state, 'A', () => 0)
    expect(second.correct).toBe(true)
    expect(second.completedNow).toBe(true)
    expect(second.state.completed).toBe(true)
  })

  it('draws each country exactly once per bag before refilling', () => {
    // Four countries with deterministic (but shuffled) random.
    const rng = () => 0
    let state = createLocationRecallSession(
      { countryIds: ['A', 'B', 'C', 'D'], minimumCleanTarget: 0 },
      rng,
    )
    // The first country is already drawn into currentCountryId.
    // Submit correct answers and collect what country is drawn next each time.
    const drawn: string[] = [state.currentCountryId]
    // Drive 3 more correct answers to exhaust the first bag of 4.
    for (let i = 0; i < 3; i++) {
      const result = submitLocationSelection(state, state.currentCountryId, rng)
      state = result.state
      if (!state.completed) drawn.push(state.currentCountryId)
    }
    // Every country must appear exactly once in the first bag.
    expect(drawn.sort()).toEqual(['A', 'B', 'C', 'D'])
  })
})
