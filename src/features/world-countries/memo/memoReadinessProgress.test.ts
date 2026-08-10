import { describe, expect, it } from 'vitest'
import { getContinentMemoReadinessProgress, getWorldMemoReadinessProgress } from './memoProgress'
import type { Country } from '@/features/world-countries/data/countries'

const sample: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'JP', country: 'Japan', capital: 'Tokyo', continent: 'Asia', subregionId: 'east-asia', subregion: 'East Asia' },
]

describe('World Countries Memo readiness progress', () => {
  it('counts Subregions cumulatively, with the combined milestone contributing to both', () => {
    const progress = getWorldMemoReadinessProgress([
      { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      { subregionId: 'east-asia', countriesLearnedAt: 3 },
    ], sample)

    expect(progress).toMatchObject({
      totalSubregions: 2,
      countriesMemoedCount: 2,
      countriesAndCapitalsMemoedCount: 1,
      countriesMemoedRatio: 1,
      countriesAndCapitalsMemoedRatio: 0.5,
    })
  })

  it('limits Continent progress to that Continent’s current Subregions', () => {
    const progress = getContinentMemoReadinessProgress('Europe', [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      { subregionId: 'east-asia', countriesLearnedAt: 2, capitalsLearnedAt: 3 },
    ], sample)

    expect(progress).toMatchObject({
      totalSubregions: 1,
      countriesMemoedCount: 1,
      countriesAndCapitalsMemoedCount: 0,
    })
  })
})
