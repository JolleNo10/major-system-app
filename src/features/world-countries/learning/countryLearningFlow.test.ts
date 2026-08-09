import { describe, expect, it } from 'vitest'
import {
  createCountryLearningFlow,
  moveCountryWalkthrough,
  startCountryWalkthrough,
  startLocationPractice,
  startOrderedRecall,
  submitCountryLocation,
  submitCountryOrderAnswer,
} from './countryLearningFlow'

describe('country-learning workflow coordinator', () => {
  it('keeps the phase transitions separate from the Stage A and B rules', () => {
    let flow = createCountryLearningFlow({ countryIds: ['A'], minimumCleanTarget: 1 })
    expect(flow.phase).toBe('memory-preview')
    flow = startCountryWalkthrough(flow)
    flow = startLocationPractice(flow, 1, () => 0)
    const location = submitCountryLocation(flow, 'A', () => 0)
    expect(location.result.completedNow).toBe(true)
    flow = startOrderedRecall(location.state, 2)
    const error = submitCountryOrderAnswer(flow, false)
    expect(error.state.phase).toBe('ordered-recall')
    const repaired = submitCountryOrderAnswer(error.state, true)
    expect(repaired.result.restartedCleanPass).toBe(true)
    const complete = submitCountryOrderAnswer(repaired.state, true)
    expect(complete.state.phase).toBe('complete')
  })

  it('traverses every phase in order from memory-preview to complete', () => {
    // Three countries so walkthrough and sessions have visible structure.
    let flow = createCountryLearningFlow({ countryIds: ['A', 'B', 'C'], minimumCleanTarget: 2 })
    expect(flow.phase).toBe('memory-preview')

    // Walkthrough
    flow = startCountryWalkthrough(flow)
    expect(flow.phase).toBe('walkthrough')
    expect(flow.walkthroughIndex).toBe(0)
    flow = moveCountryWalkthrough(flow, 1)
    flow = moveCountryWalkthrough(flow, 1)
    expect(flow.walkthroughIndex).toBe(2)

    // Stage A — location practice; target = max(3 countries, 2 minimum) = 3 correct in a row.
    // Use a deterministic random so draw order is stable.
    const rng = () => 0
    flow = startLocationPractice(flow, 2, rng)
    expect(flow.phase).toBe('location-practice')
    expect(flow.location).not.toBeNull()
    // Drive clean streak to completion. Accept whichever country is current each turn.
    let locationResult: ReturnType<typeof submitCountryLocation>
    let attempts = 0
    do {
      const currentId = flow.location!.currentCountryId
      locationResult = submitCountryLocation(flow, currentId, rng)
      flow = locationResult.state
      attempts++
      if (attempts > 100) throw new Error('location recall did not complete')
    } while (!locationResult.result.completedNow)
    expect(flow.location!.completed).toBe(true)

    // Stage B — ordered recall; 3 countries, rewindOnError = 0 for a clean run.
    flow = startOrderedRecall(flow, 0)
    expect(flow.phase).toBe('ordered-recall')
    expect(flow.ordered).not.toBeNull()
    // Submit each country in order.
    for (const _id of ['A', 'B', 'C']) {
      const result = submitCountryOrderAnswer(flow, true)
      flow = result.state
    }
    expect(flow.phase).toBe('complete')
  })
})
