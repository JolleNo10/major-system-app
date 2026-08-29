import { describe, expect, it } from 'vitest'
import { countries, type Country } from '@/features/world-countries/data/countries'
import {
  createContinentHoverGroups,
  createCountryOrderLabels,
  createCountryColors,
  createSubregionHoverGroups,
  findUnresolvedCountries,
  getContinentHoverGroupId,
  getSubregionHoverGroupId,
  resolveCountryIdsToSvgIds,
  resolveCountryToSvgIds,
  sortCountriesByMapPosition,
  sortSubregionsByMapPosition,
} from './geographyMapAdapter'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'

const norway = countries.find(country => country.id === 'NO') as Country
const sweden = countries.find(country => country.id === 'SE') as Country
const unitedStates = countries.find(country => country.id === 'US') as Country
const unitedKingdom = countries.find(country => country.id === 'GB') as Country

describe('World Countries geography map adapter', () => {
  it('resolves domain names to asset-specific SVG IDs', () => {
    expect(resolveCountryToSvgIds(norway, ['Norway'])).toEqual(['Norway'])
    expect(resolveCountryToSvgIds(unitedStates, ['United_States_of_America'])).toEqual(['United_States_of_America'])
    expect(resolveCountryToSvgIds(unitedKingdom, ['England', 'Scotland', 'Wales'])).toEqual([
      'England', 'Scotland', 'Wales',
    ])
    expect(resolveCountryIdsToSvgIds(['NO', 'SE'], [norway, sweden], ['Norway', 'Sweden'])).toEqual(['Norway', 'Sweden'])
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
    expect(createCountryColors([norway], ['NO'], ['Norway'], '#22c55e')).toEqual([
      ['Norway', '#22c55e'],
    ])
  })

  it('derives 1-based temporary labels from the supplied Country order', () => {
    const sweden = countries.find(country => country.id === 'SE') as Country
    expect(createCountryOrderLabels([norway, sweden], ['Norway', 'Sweden'])).toEqual({
      Norway: '1. Norway',
      Sweden: '2. Sweden',
    })
    expect(createCountryOrderLabels([sweden, norway], ['Norway', 'Sweden'])).toEqual({
      Sweden: '1. Sweden',
      Norway: '2. Norway',
    })
  })

  it('sorts countries by their map label position and preserves unresolved order', () => {
    const markup = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <g><path id="Norway"/><text id="Norway_label" x="20"/></g>
        <g><path id="Sweden"/><text id="Sweden_label" x="80"/></g>
      </svg>`

    expect(sortCountriesByMapPosition([unitedKingdom, sweden, norway], markup).map(country => country.id))
      .toEqual(['NO', 'SE', 'GB'])
  })

  it('sorts subregions by the mean map position of their members and trails unpositioned ones', () => {
    const france = countries.find(country => country.id === 'FR') as Country
    const markup = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <g><path id="France"/><text id="France_label" x="20"/></g>
        <g><path id="Norway"/><text id="Norway_label" x="80"/></g>
      </svg>`
    const northern = getSubregionDefinition('northern-europe')
    const western = getSubregionDefinition('western-europe')
    const southern = getSubregionDefinition('southern-europe')

    expect(
      sortSubregionsByMapPosition([northern, southern, western], markup, [norway, france])
        .map(subregion => subregion.id),
    ).toEqual(['western-europe', 'northern-europe', 'southern-europe'])
  })

  it('reports unresolved domain records instead of silently inventing membership', () => {
    expect(findUnresolvedCountries([norway], ['Missing'])).toHaveLength(1)
  })
})
