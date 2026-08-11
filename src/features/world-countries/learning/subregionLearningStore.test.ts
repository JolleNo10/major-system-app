// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { countries, getCanonicalCountryIdsForSubregion } from '@/features/world-countries/data/countries'
import { setSubregionCountryOrder } from '@/features/world-countries/geography/subregionMetadataStore'
import {
  clearSubregionCapitalsLearned,
  clearSubregionCountriesLearned,
  getSubregionLearningState,
  markSubregionCapitalsLearned,
  markSubregionCountriesLearned,
  SUBREGION_LEARNING_MEMBERSHIP_KEY,
  SUBREGION_LEARNING_STORAGE_KEY,
} from './subregionLearningStore'

afterEach(() => localStorage.clear())

describe('Subregion learning store', () => {
  it('preserves independent Country and Capital completion facts', () => {
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(markSubregionCountriesLearned('northern-europe', 1234)).toEqual({ subregionId: 'northern-europe', countriesLearnedAt: 1234 })
    expect(markSubregionCapitalsLearned('northern-europe', 5678)).toEqual({
      subregionId: 'northern-europe',
      countriesLearnedAt: 1234,
      capitalsLearnedAt: 5678,
    })
    expect(getSubregionLearningState('northern-europe')).toEqual({
      subregionId: 'northern-europe',
      countriesLearnedAt: 1234,
      capitalsLearnedAt: 5678,
    })
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_STORAGE_KEY)!)).toEqual([
      { subregionId: 'northern-europe', countriesLearnedAt: 1234, capitalsLearnedAt: 5678 },
    ])
  })

  it('allows Capitals to be learned before Countries and clears fields independently', () => {
    expect(markSubregionCapitalsLearned('northern-europe', 5678)).toEqual({
      subregionId: 'northern-europe',
      capitalsLearnedAt: 5678,
    })
    clearSubregionCountriesLearned('northern-europe')
    expect(getSubregionLearningState('northern-europe')).toEqual({
      subregionId: 'northern-europe',
      capitalsLearnedAt: 5678,
    })
    clearSubregionCapitalsLearned('northern-europe')
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_MEMBERSHIP_KEY)!)).toEqual({})
  })

  it('does not trust legacy completion rows without a membership fingerprint', () => {
    localStorage.setItem(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify([
      { subregionId: 'northern-europe', countriesLearnedAt: 1234, capitalsLearnedAt: 5678 },
    ]))
    expect(getSubregionLearningState('northern-europe')).toBeNull()
  })

  it('keeps completion when only the user-authored Country order changes', () => {
    markSubregionCapitalsLearned('northern-europe', 5678)
    const canonicalIds = getCanonicalCountryIdsForSubregion('northern-europe')
    setSubregionCountryOrder('northern-europe', [...canonicalIds].reverse())
    expect(getSubregionLearningState('northern-europe')).toEqual({
      subregionId: 'northern-europe',
      capitalsLearnedAt: 5678,
    })
  })

  it('invalidates both completion dimensions when the membership fingerprint changes', () => {
    markSubregionCountriesLearned('northern-europe', 1234)
    markSubregionCapitalsLearned('northern-europe', 5678)
    localStorage.setItem(SUBREGION_LEARNING_MEMBERSHIP_KEY, JSON.stringify({ 'northern-europe': 'changed' }))
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_STORAGE_KEY)!)).toEqual([])
  })

  it('restores completion when a previously learned Country membership is re-enabled', () => {
    const fullMembership = countries
    const withoutGreenland = countries.filter(country => country.id !== 'GL')
    markSubregionCountriesLearned('northern-america', 1234, fullMembership)
    expect(getSubregionLearningState('northern-america', withoutGreenland)).toBeNull()
    expect(getSubregionLearningState('northern-america', fullMembership)).toEqual({
      subregionId: 'northern-america',
      countriesLearnedAt: 1234,
    })
  })
})
