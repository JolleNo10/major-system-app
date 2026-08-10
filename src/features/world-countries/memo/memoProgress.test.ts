import { describe, expect, it } from 'vitest'
import { getContinents, getCountriesForSubregion, getSubregionsForContinent } from '@/features/world-countries/geography/queries'
import { getContinentMemoReadinessProgress, getNextSubregionToMemo, getSubregionMemoReadinessProgress, getWorldMemoReadinessProgress } from './memoProgress'
import { countries, type Country } from '@/features/world-countries/data/countries'

const sample: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'JP', country: 'Japan', capital: 'Tokyo', continent: 'Asia', subregionId: 'east-asia', subregion: 'East Asia' },
]

describe('World Countries Memo geography', () => {
  it('derives hierarchy membership from country records', () => {
    expect(getContinents(sample)).toEqual(['Europe', 'Asia'])
    expect(getSubregionsForContinent('Europe', sample)).toEqual(['Northern Europe'])
    expect(getCountriesForSubregion('Europe', 'northern-europe', sample)).toEqual(sample.slice(0, 2))
  })

  it('exposes the exact readiness state for one current Subregion', () => {
    expect(getSubregionMemoReadinessProgress('northern-europe', [
      { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
    ], sample).readiness).toBe('COUNTRIES_AND_CAPITALS_MEMOED')
  })

  it('aggregates World and Continent progress by current Subregions', () => {
    const states = [
      { subregionId: 'northern-europe' as const, countriesLearnedAt: 1 },
      { subregionId: 'east-asia' as const, countriesLearnedAt: 2, capitalsLearnedAt: 3 },
    ]
    expect(getWorldMemoReadinessProgress(states, sample)).toMatchObject({
      totalSubregions: 2,
      countriesMemoedCount: 2,
      countriesAndCapitalsMemoedCount: 1,
    })
    expect(getContinentMemoReadinessProgress('Europe', states, sample)).toMatchObject({
      totalSubregions: 1,
      countriesMemoedCount: 1,
      countriesAndCapitalsMemoedCount: 0,
    })
  })

  it('finds the first Subregion whose Countries Memo is incomplete', () => {
    const order = [
      { id: 'balkans', label: 'Balkans', continent: 'Europe' },
      { id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' },
    ] as const

    expect(getNextSubregionToMemo(order, subregionId => subregionId === 'balkans')).toEqual(order[1])
    expect(getNextSubregionToMemo(order, () => true)).toBeNull()
  })

  it('uses the bundled records as the default world source', () => {
    expect(getWorldMemoReadinessProgress([]).totalSubregions).toBeGreaterThan(0)
    expect(countries.length).toBeGreaterThan(0)
  })
})
