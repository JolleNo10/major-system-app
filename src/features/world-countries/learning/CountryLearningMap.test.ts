import { describe, expect, it } from 'vitest'
import { getCountryLearningMapZoomIds } from './CountryLearningMap'

describe('getCountryLearningMapZoomIds', () => {
  it('does not zoom Oceania to scattered microstates', () => {
    expect(getCountryLearningMapZoomIds('Oceania', ['Australia', 'Fiji'])).toEqual([])
  })

  it('zooms other Continents to the selected Country scope', () => {
    const scopeIds = ['Norway', 'Sweden']
    expect(getCountryLearningMapZoomIds('Europe', scopeIds)).toBe(scopeIds)
  })
})
