import { describe, expect, it } from 'vitest'
import { getContinents, getCountriesForSubregion, getSubregionsForContinent } from '@/features/world-countries/geography/queries'
import { getContinentMemoProgress, getMemoProgress, getSubregionMemoProgress } from './memoProgress'
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

  it('derives not-started, partial, and complete progress', () => {
    expect(getMemoProgress(sample, []).status).toBe('not-started')
    expect(getContinentMemoProgress('Europe', ['NO'], sample)).toMatchObject({
      memoedCount: 1, totalCount: 2, remainingCount: 1, status: 'partial',
    })
    expect(getSubregionMemoProgress('Europe', 'northern-europe', ['NO', 'SE'], sample)).toMatchObject({
      memoedCount: 2, totalCount: 2, ratio: 1, status: 'complete',
    })
  })

  it('uses the bundled records as the default world source', () => {
    expect(getMemoProgress(countries, []).totalCount).toBe(countries.length)
  })
})
