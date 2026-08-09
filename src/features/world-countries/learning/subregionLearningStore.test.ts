// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { getSubregionLearningState, markSubregionCountriesLearned, SUBREGION_LEARNING_STORAGE_KEY } from './subregionLearningStore'

afterEach(() => localStorage.clear())

describe('Subregion learning store', () => {
  it('persists only the durable country-learning completion fact', () => {
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(markSubregionCountriesLearned('northern-europe', 1234)).toEqual({ subregionId: 'northern-europe', countriesLearnedAt: 1234 })
    expect(getSubregionLearningState('northern-europe')).toEqual({ subregionId: 'northern-europe', countriesLearnedAt: 1234 })
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_STORAGE_KEY)!)).toEqual([
      { subregionId: 'northern-europe', countriesLearnedAt: 1234 },
    ])
  })
})
