import { describe, expect, it } from 'vitest'
import { countries, type Country } from '@/features/world-countries/data/countries'
import {
  createContinentHoverGroups,
  createMemoCountryColors,
  createSubregionHoverGroups,
  findUnresolvedCountries,
  getContinentHoverGroupId,
  getSubregionHoverGroupId,
  resolveCountryToSvgIds,
} from './memoMapAdapter'

const norway = countries.find(country => country.id === 'NO') as Country
const unitedStates = countries.find(country => country.id === 'US') as Country
const unitedKingdom = countries.find(country => country.id === 'GB') as Country

describe('World Countries Memo map adapter', () => {
  it('resolves domain names to asset-specific SVG IDs', () => {
    expect(resolveCountryToSvgIds(norway, ['Norway'])).toEqual(['Norway'])
    expect(resolveCountryToSvgIds(unitedStates, ['United_States_of_America'])).toEqual(['United_States_of_America'])
    expect(resolveCountryToSvgIds(unitedKingdom, ['England', 'Scotland', 'Wales'])).toEqual([
      'England', 'Scotland', 'Wales',
    ])
  })

  it('derives hover groups and learned colors from domain records', () => {
    expect(getContinentHoverGroupId('North America')).toBe('continent-north-america')
    expect(getSubregionHoverGroupId('Northern Europe')).toBe('subregion-northern-europe')
    expect(createContinentHoverGroups([norway], ['Norway'])).toEqual([
      { id: 'continent-europe', countryIds: ['Norway'] },
    ])
    expect(createSubregionHoverGroups('Europe', [norway], ['Norway'])).toEqual([
      { id: 'subregion-northern-europe', countryIds: ['Norway'] },
    ])
    expect(createMemoCountryColors([norway], ['NO'], ['Norway'])).toEqual([
      ['Norway', '#22c55e'],
    ])
  })

  it('reports unresolved domain records instead of silently inventing membership', () => {
    expect(findUnresolvedCountries([norway], ['Missing'])).toHaveLength(1)
  })
})
