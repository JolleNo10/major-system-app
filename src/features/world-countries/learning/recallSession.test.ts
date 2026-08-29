import { describe, expect, it } from 'vitest'
import {
  advanceRecallStep,
  createRecallSession,
  getCurrentRecallStep,
  getRecallSessionTotalSteps,
} from './recallSession'

describe('World Countries recall session mechanics', () => {
  it('deduplicates Countries while respecting a supplied order', () => {
    const state = createRecallSession({
      countryIds: ['NO', 'SE', 'NO'],
      countryOrder: ['SE', 'NO', 'SE'],
      skills: ['country-to-capital'],
    })

    expect(state.countryIds).toEqual(['NO', 'SE'])
    expect(state.countryOrder).toEqual(['SE', 'NO'])
    expect(getCurrentRecallStep(state)).toEqual({ countryId: 'SE', skill: 'country-to-capital' })
  })

  it('steps through every supplied skill and completes once', () => {
    let state = createRecallSession({
      countryIds: ['NO', 'SE'],
      skills: ['location-to-country', 'country-to-capital'],
    })

    expect(getRecallSessionTotalSteps(state)).toBe(4)
    expect(getCurrentRecallStep(state)).toEqual({ countryId: 'NO', skill: 'location-to-country' })
    state = advanceRecallStep(state).state
    expect(getCurrentRecallStep(state)).toEqual({ countryId: 'NO', skill: 'country-to-capital' })
    state = advanceRecallStep(state).state
    expect(getCurrentRecallStep(state)).toEqual({ countryId: 'SE', skill: 'location-to-country' })
    state = advanceRecallStep(state).state
    expect(getCurrentRecallStep(state)).toEqual({ countryId: 'SE', skill: 'country-to-capital' })

    const result = advanceRecallStep(state)
    expect(result.completedCountryNow).toBe(true)
    expect(result.completedNow).toBe(true)
    expect(result.state.phase).toBe('complete')
    expect(getCurrentRecallStep(result.state)).toBeNull()
  })
})
