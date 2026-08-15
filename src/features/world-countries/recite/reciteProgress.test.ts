// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  RECITE_PROGRESS_STORAGE_KEY,
  getReciteProgressOutcome,
  loadWorldCountriesReciteProgress,
  saveCompletedReciteRun,
} from './reciteProgress'

afterEach(() => localStorage.clear())

describe('World Countries Recite progress', () => {
  it('stores the latest completed outcome independently by mode and Country', () => {
    saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: 'recalled' }], 100)
    saveCompletedReciteRun('countries-capitals', [{ countryId: 'NO', outcome: 'revealed' }], 200)

    expect(getReciteProgressOutcome(loadWorldCountriesReciteProgress(), 'countries', 'NO')).toEqual({
      outcome: 'recalled',
      completedAt: 100,
    })
    expect(getReciteProgressOutcome(loadWorldCountriesReciteProgress(), 'countries-capitals', 'NO')).toEqual({
      outcome: 'revealed',
      completedAt: 200,
    })
  })

  it('lets the latest completed run win and ignores an older write', () => {
    saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: 'recalled' }], 200)
    saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: 'recovered' }], 100)

    expect(getReciteProgressOutcome(loadWorldCountriesReciteProgress(), 'countries', 'NO')?.outcome).toBe('recalled')
  })

  it('ignores malformed records without exposing a flattened session sequence', () => {
    localStorage.setItem(RECITE_PROGRESS_STORAGE_KEY, JSON.stringify({
      version: 1,
      outcomes: {
        countries: {
          NO: { outcome: 'recalled', completedAt: 100 },
          SE: { outcome: 'invalid', completedAt: 101 },
        },
        'countries-capitals': 'not-a-map',
      },
      countryIds: ['NO', 'SE'],
    }))

    const progress = loadWorldCountriesReciteProgress()
    expect(getReciteProgressOutcome(progress, 'countries', 'NO')?.outcome).toBe('recalled')
    expect(getReciteProgressOutcome(progress, 'countries', 'SE')).toBeUndefined()
    expect(getReciteProgressOutcome(progress, 'countries-capitals', 'NO')).toBeUndefined()
    expect(progress).not.toHaveProperty('countryIds')
  })
})
