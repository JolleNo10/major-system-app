import { describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import {
  getCanonicalWorldContinents,
  resolveWorldContinentIds,
  resolveWorldContinentOrder,
  type WorldMetadata,
} from './worldMetadata'

const sample: Country[] = [
  { id: 'A1', country: 'Alpha', capital: '', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'B1', country: 'Bravo', capital: '', continent: 'Asia', subregionId: 'south-asia', subregion: 'South Asia' },
  { id: 'C1', country: 'Charlie', capital: '', continent: 'Europe', subregionId: 'western-europe', subregion: 'Western Europe' },
  { id: 'D1', country: 'Delta', capital: '', continent: 'North America', subregionId: 'caribbean', subregion: 'Caribbean' },
]

describe('World Continent ordering', () => {
  it('derives canonical Continent membership from Country data', () => {
    expect(getCanonicalWorldContinents(sample)).toEqual(['Europe', 'Asia', 'North America'])
  })

  it('resolves stored Continent order and appends new Continents canonically', () => {
    const metadata: Pick<WorldMetadata, 'continentOrder'> = {
      continentOrder: ['north-america', 'asia'],
    }

    expect(resolveWorldContinentOrder(sample, metadata)).toEqual(['North America', 'Asia', 'Europe'])
    expect(resolveWorldContinentIds(sample, metadata)).toEqual(['north-america', 'asia', 'europe'])
  })
})
