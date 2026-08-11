// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  getSubregionMetadata,
  resetSubregionCountryOrder,
  setSubregionCountryOrder,
} from './subregionMetadataStore'
import { countries } from '@/features/world-countries/data/countries'

afterEach(() => localStorage.clear())

describe('Subregion metadata persistence', () => {
  it('persists ordering separately from mnemonic content and resets it', () => {
    setSubregionCountryOrder('northern-europe', ['DK', 'NO', 'DK'])
    expect(getSubregionMetadata('northern-europe')?.countryOrder).toEqual(['DK', 'NO'])
    resetSubregionCountryOrder('northern-europe')
    expect(getSubregionMetadata('northern-europe')).toBeNull()
  })

  it('retains hidden Country IDs when saving the active projection', () => {
    const activeCountries = countries.filter(country => country.id !== 'GL')
    const activeIds = activeCountries
      .filter(country => country.subregionId === 'northern-america')
      .map(country => country.id)
      .reverse()
    setSubregionCountryOrder('northern-america', activeIds, activeCountries)
    const storedIds = getSubregionMetadata('northern-america')?.countryOrder ?? []
    expect(storedIds).toContain('GL')
    expect(storedIds.filter(id => activeIds.includes(id))).toEqual(activeIds)
  })
})
