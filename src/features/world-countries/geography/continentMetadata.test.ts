import { describe, expect, it } from 'vitest'
import { type Country } from '@/features/world-countries/data/countries'
import { type SubregionId } from '@/features/world-countries/data/subregions'
import {
  resolveContinentSubregionIds,
} from './continentMetadata'

const sample: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'FR', country: 'France', capital: 'Paris', continent: 'Europe', subregionId: 'western-europe', subregion: 'Western Europe' },
  { id: 'IT', country: 'Italy', capital: 'Rome', continent: 'Europe', subregionId: 'southern-europe', subregion: 'Southern Europe' },
]

describe('Continent metadata and effective Subregion order', () => {
  it('uses canonical order without metadata', () => {
    expect(resolveContinentSubregionIds('Europe', sample))
      .toEqual(['northern-europe', 'western-europe', 'southern-europe'])
  })

  it('reconciles custom order without mutating metadata during reads', () => {
    const metadata = {
      continentId: 'europe' as const,
      subregionOrder: ['southern-europe', 'unknown', 'southern-europe', 'northern-europe'] as SubregionId[],
      updatedAt: 1,
    }
    expect(resolveContinentSubregionIds('Europe', sample, metadata))
      .toEqual(['southern-europe', 'northern-europe', 'western-europe'])
    expect(metadata.subregionOrder).toEqual(['southern-europe', 'unknown', 'southern-europe', 'northern-europe'])
  })

  it('ignores metadata authored for a different Continent', () => {
    const metadata = {
      continentId: 'asia' as const,
      subregionOrder: ['southern-europe', 'northern-europe'] as SubregionId[],
      updatedAt: 1,
    }
    expect(resolveContinentSubregionIds('Europe', sample, metadata))
      .toEqual(['northern-europe', 'western-europe', 'southern-europe'])
  })
})
