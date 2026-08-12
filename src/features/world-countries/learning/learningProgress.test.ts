import { describe, expect, it } from 'vitest'
import { getCountriesForSubregion, getSubregionsForContinent } from '@/features/world-countries/geography/queries'
import { getContinentLearningReadinessProgress, getSubregionLearningReadinessProgress } from './learningProgress'
import type { Country } from '@/features/world-countries/data/countries'

const sample: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'JP', country: 'Japan', capital: 'Tokyo', continent: 'Asia', subregionId: 'east-asia', subregion: 'East Asia' },
]

describe('World Countries Learning geography', () => {
  it('derives hierarchy membership from country records', () => {
    expect(getSubregionsForContinent('Europe', sample)).toEqual(['Northern Europe'])
    expect(getCountriesForSubregion('Europe', 'northern-europe', sample)).toEqual(sample.slice(0, 2))
  })
  it('exposes and aggregates Learning Readiness', () => {
    const states = [{ subregionId: 'northern-europe' as const, countriesLearnedAt: 1, capitalsLearnedAt: 2 }, { subregionId: 'east-asia' as const, countriesLearnedAt: 2 }]
    expect(getSubregionLearningReadinessProgress('northern-europe', states, sample).readiness).toBe('COUNTRIES_AND_CAPITALS_LEARNED')
    expect(getContinentLearningReadinessProgress('Europe', states, sample)).toMatchObject({ countriesLearned: { count: 1, total: 1, ratio: 1 }, countriesAndCapitalsLearned: { count: 1, total: 1, ratio: 1 } })
  })
})
