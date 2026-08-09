import { describe, expect, it } from 'vitest'
import { type Country } from '@/features/world-countries/data/countries'
import {
  resolveSubregionCountryOrder,
} from './subregionMetadata'

const sample: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'DK', country: 'Denmark', capital: 'Copenhagen', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]
describe('Subregion metadata and effective order', () => {
  it('uses canonical order without metadata', () => {
    expect(resolveSubregionCountryOrder('northern-europe', sample).map(country => country.id))
      .toEqual(['NO', 'SE', 'DK'])
  })

  it('reconciles custom order without mutating metadata during reads', () => {
    const metadata = {
      subregionId: 'northern-europe' as const,
      countryOrder: ['DK', 'UNKNOWN', 'DK', 'NO'],
      updatedAt: 1,
    }
    expect(resolveSubregionCountryOrder('northern-europe', sample, metadata).map(country => country.id))
      .toEqual(['DK', 'NO', 'SE'])
    expect(metadata.countryOrder).toEqual(['DK', 'UNKNOWN', 'DK', 'NO'])
  })
})
