// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { type Country } from '@/features/world-countries/data/countries'
import { countryId } from '@/features/world-countries/learning'
import {
  resolveSubregionCountryOrder,
} from './subregionMetadata'
import {
  getSubregionMetadata,
  resetSubregionCountryOrder,
  setSubregionCountryOrder,
} from './subregionMetadataStore'

const sample: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregion: 'Northern Europe' },
  { id: 'DK', country: 'Denmark', capital: 'Copenhagen', continent: 'Europe', subregion: 'Northern Europe' },
]

afterEach(() => localStorage.clear())

describe('Subregion metadata and effective order', () => {
  it('uses canonical order without metadata', () => {
    expect(resolveSubregionCountryOrder('northern-europe', sample).map(countryId))
      .toEqual(['NO', 'SE', 'DK'])
  })

  it('reconciles custom order without mutating metadata during reads', () => {
    const metadata = {
      subregionId: 'northern-europe' as const,
      countryOrder: ['DK', 'UNKNOWN', 'DK', 'NO'],
      updatedAt: 1,
    }
    expect(resolveSubregionCountryOrder('northern-europe', sample, metadata).map(countryId))
      .toEqual(['DK', 'NO', 'SE'])
    expect(metadata.countryOrder).toEqual(['DK', 'UNKNOWN', 'DK', 'NO'])
  })

  it('persists ordering separately from mnemonic content and resets it', () => {
    setSubregionCountryOrder('northern-europe', ['DK', 'NO', 'DK'])
    expect(getSubregionMetadata('northern-europe')?.countryOrder).toEqual(['DK', 'NO'])
    resetSubregionCountryOrder('northern-europe')
    expect(getSubregionMetadata('northern-europe')).toBeNull()
  })
})
