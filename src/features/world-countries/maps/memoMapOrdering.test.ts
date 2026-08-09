// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { getMemoMapDefinition } from './mapDefinitions'
import {
  sortCountriesByMemoMapPosition,
  sortSubregionsByMemoMapPosition,
} from './memoMapOrdering'

const sweden = countries.find(country => country.id === 'SE') as Country
const norway = countries.find(country => country.id === 'NO') as Country

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubSvgLoad(markup: string, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    text: vi.fn().mockResolvedValue(markup),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const europeMarkup = `
  <svg xmlns="http://www.w3.org/2000/svg">
    <g><path id="Italy"/><text id="Italy_label" x="20"/></g>
    <g><path id="Norway"/><text id="Norway_label" x="50"/></g>
    <g><path id="Sweden"/><text id="Sweden_label" x="80"/></g>
  </svg>`

describe('Memo map ordering capability', () => {
  it('loads the resolved map and sorts Countries by map position', async () => {
    const fetchMock = stubSvgLoad(europeMarkup)

    const ordered = await sortCountriesByMemoMapPosition('Europe', [sweden, norway])

    expect(ordered.map(country => country.id)).toEqual(['NO', 'SE'])
    expect(fetchMock).toHaveBeenCalledWith(getMemoMapDefinition('Europe').svgUrl)
  })

  it('loads the resolved map and sorts Subregions by their mapped Country positions', async () => {
    stubSvgLoad(europeMarkup)

    const northernEurope = getSubregionDefinition('northern-europe')
    const southernEurope = getSubregionDefinition('southern-europe')
    const ordered = await sortSubregionsByMemoMapPosition('Europe', [northernEurope, southernEurope])

    expect(ordered.map(subregion => subregion.id)).toEqual(['southern-europe', 'northern-europe'])
  })

  it('rejects a failed map load without changing the caller draft', async () => {
    const fetchMock = stubSvgLoad('', false, 503)
    const draft = [sweden, norway]

    await expect(sortCountriesByMemoMapPosition('Europe', draft)).rejects.toThrow('Map request failed with 503')

    expect(draft.map(country => country.id)).toEqual(['SE', 'NO'])
    expect(fetchMock).toHaveBeenCalledWith(getMemoMapDefinition('Europe').svgUrl)
  })
})
