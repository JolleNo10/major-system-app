import { describe, expect, it } from 'vitest'
import { createDrillSession, submitDrillStep } from './drillSessionState'
import { deriveDrillSessionProgress } from './drillSessionProgress'

describe('deriveDrillSessionProgress', () => {
  it('keeps Country position separate from multi-step Drill progress', () => {
    const state = createDrillSession({ mode: 'countries-capitals', countryIds: ['NO', 'SE'] })

    expect(deriveDrillSessionProgress(state)).toEqual({
      totalSteps: 4,
      completedSteps: 0,
      progressPercent: 0,
      countryPosition: 1,
      totalCountries: 2,
    })

    const afterLocation = submitDrillStep(state, true).state
    expect(deriveDrillSessionProgress(afterLocation)).toMatchObject({
      completedSteps: 1,
      progressPercent: 25,
      countryPosition: 1,
      totalCountries: 2,
    })

    const secondCountry = submitDrillStep(afterLocation, true).state
    expect(deriveDrillSessionProgress(secondCountry)).toMatchObject({
      completedSteps: 2,
      progressPercent: 50,
      countryPosition: 2,
      totalCountries: 2,
    })
  })

  it('reports the first, middle, and final boundaries', () => {
    const state = createDrillSession({ mode: 'countries', countryIds: ['NO', 'SE'] })
    expect(deriveDrillSessionProgress(state).completedSteps).toBe(0)

    const middle = submitDrillStep(state, true).state
    expect(deriveDrillSessionProgress(middle)).toMatchObject({
      completedSteps: 1,
      progressPercent: 50,
      countryPosition: 2,
    })

    const final = submitDrillStep(middle, true).state
    expect(deriveDrillSessionProgress(final)).toEqual({
      totalSteps: 2,
      completedSteps: 2,
      progressPercent: 100,
      countryPosition: 2,
      totalCountries: 2,
    })
  })
})
