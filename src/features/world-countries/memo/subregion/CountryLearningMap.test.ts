import { describe, expect, it } from 'vitest'
import { getCountryLearningMapZoomIds } from './CountryLearningMap'

describe('getCountryLearningMapZoomIds', () => {
  it('keeps the full map for Oceania subregions', () => {
    expect(getCountryLearningMapZoomIds('Oceania', ['Australia', 'Fiji'])).toEqual([])
  })

  it('zooms to the selected scope for other continents', () => {
    const scopeIds = ['Norway', 'Sweden']
    expect(getCountryLearningMapZoomIds('Europe', scopeIds)).toBe(scopeIds)
  })
})
