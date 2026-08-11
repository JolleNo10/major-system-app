import { describe, expect, it } from 'vitest'
import { getGuidedLearningActions } from './guidedLearning'

describe('World Countries guided-learning actions', () => {
  it('recommends Countries when one Subregion is not learned', () => {
    expect(getGuidedLearningActions({
      subregionCount: 1,
      countryCount: 4,
      countriesLearned: false,
      capitalsLearned: false,
    })).toEqual({
      primary: 'learn-countries',
      secondary: [],
    })
  })

  it('recommends Capitals and keeps Country review secondary', () => {
    expect(getGuidedLearningActions({
      subregionCount: 1,
      countryCount: 4,
      countriesLearned: true,
      capitalsLearned: false,
    })).toEqual({
      primary: 'learn-capitals',
      secondary: ['review-countries'],
    })
  })

  it('recommends combined Drill with both reviews secondary after completion', () => {
    expect(getGuidedLearningActions({
      subregionCount: 1,
      countryCount: 4,
      countriesLearned: true,
      capitalsLearned: true,
    })).toEqual({
      primary: 'drill-countries-capitals',
      secondary: ['review-countries', 'review-capitals'],
    })
  })

  it('does not expose guided actions for multiple Subregions or an empty scope', () => {
    expect(getGuidedLearningActions({
      subregionCount: 2,
      countryCount: 8,
      countriesLearned: false,
      capitalsLearned: false,
    })).toEqual({ primary: null, secondary: [] })
    expect(getGuidedLearningActions({
      subregionCount: 1,
      countryCount: 0,
      countriesLearned: true,
      capitalsLearned: true,
    })).toEqual({ primary: null, secondary: [] })
  })
})
