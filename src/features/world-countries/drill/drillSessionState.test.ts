import { describe, expect, it } from 'vitest'
import {
  createDrillSession,
  getCurrentDrillStep,
  isDrillSessionCompatible,
  submitDrillStep,
} from './drillSessionState'

describe('World Countries Drill session', () => {
  it('uses Country as the visible unit in Countries + Capitals', () => {
    let state = createDrillSession({ mode: 'countries-capitals', countryIds: ['NO', 'SE'] })
    expect(getCurrentDrillStep(state)).toEqual({ countryId: 'NO', skill: 'location-to-country' })

    const wrongCountry = submitDrillStep(state, false)
    state = wrongCountry.state
    expect(getCurrentDrillStep(state)).toEqual({ countryId: 'NO', skill: 'country-to-capital' })
    expect(wrongCountry.step).toEqual({ countryId: 'NO', skill: 'location-to-country' })

    state = submitDrillStep(state, true).state
    expect(getCurrentDrillStep(state)).toEqual({ countryId: 'SE', skill: 'location-to-country' })
  })

  it('completes a single-skill Country run after one atomic attempt per Country', () => {
    let state = createDrillSession({ mode: 'countries', countryIds: ['NO'] })
    const result = submitDrillStep(state, false)
    state = result.state
    expect(result.completedNow).toBe(true)
    expect(state.phase).toBe('complete')
    expect(getCurrentDrillStep(state)).toBeNull()
  })

  it('keeps Country → Capital evidence tied to the canonical Country', () => {
    const state = createDrillSession({ mode: 'countries-capitals', countryIds: ['NO'] })
    const location = submitDrillStep(state, false)
    expect(location.step?.countryId).toBe('NO')
    expect(location.state.countryOrder).toEqual(['NO'])
    expect(getCurrentDrillStep(location.state)?.countryId).toBe('NO')
  })

  it('detects when a live population change invalidates a session', () => {
    const state = createDrillSession({ mode: 'countries', countryIds: ['NO', 'SE'] })
    expect(isDrillSessionCompatible(state, [{ id: 'NO' }, { id: 'SE' }])).toBe(true)
    expect(isDrillSessionCompatible(state, [{ id: 'NO' }])).toBe(false)
  })
})
