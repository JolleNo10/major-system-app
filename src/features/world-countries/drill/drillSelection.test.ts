import { describe, expect, it } from 'vitest'
import { getCanonicalCountryIdsForSubregion } from '@/features/world-countries/data/countries'
import {
  createDrillSelection,
  getAllDrillSubregionIds,
  getCountriesForDrillSelection,
  getCountriesForDrillSelectionInEffectiveOrder,
  isEntireContinentSelection,
  toggleEntireContinentSelection,
  toggleDrillSubregion,
  withAllDrillSubregions,
} from './drillSelection'

describe('World Countries Drill selection', () => {
  it('starts empty and can opt into an entire Continent', () => {
    const emptySelection = createDrillSelection('Europe')
    expect(emptySelection.subregionIds).toEqual([])
    expect(isEntireContinentSelection(emptySelection)).toBe(false)
    expect(getCountriesForDrillSelection(emptySelection)).toEqual([])

    const selection = withAllDrillSubregions('Europe')
    const expectedSubregions = getAllDrillSubregionIds('Europe')
    expect(selection.subregionIds).toEqual(expectedSubregions)
    expect(isEntireContinentSelection(selection)).toBe(true)
    expect(getCountriesForDrillSelection(selection).every(country => country.continent === 'Europe')).toBe(true)
  })

  it('derives a selected Subregion population without persisting Country membership', () => {
    const selection = createDrillSelection('Europe', ['northern-europe'])
    expect(selection).toEqual({ continent: 'Europe', subregionIds: ['northern-europe'] })
    expect(getCountriesForDrillSelection(selection).map(country => country.id)).toEqual(
      getCanonicalCountryIdsForSubregion('northern-europe'),
    )
  })

  it('projects saved geographic order into an ordered Drill Country population', () => {
    const countryIds = getCanonicalCountryIdsForSubregion('northern-europe')
    const reversedCountryIds = [...countryIds].reverse()

    const orderedCountries = getCountriesForDrillSelectionInEffectiveOrder(
      createDrillSelection('Europe', ['northern-europe']),
      undefined,
      { continentId: 'europe', subregionOrder: ['northern-europe'] },
      [{ subregionId: 'northern-europe', countryOrder: reversedCountryIds }],
    )

    expect(orderedCountries.map(country => country.id)).toEqual(reversedCountryIds)
  })

  it('keeps selection inside one Continent and supports toggling Subregions', () => {
    const single = createDrillSelection('Europe', ['northern-europe'])
    const toggled = toggleDrillSubregion(single, 'western-europe')
    expect(toggled.subregionIds).toEqual(['western-europe', 'northern-europe'])

    const removed = toggleDrillSubregion(toggled, 'northern-europe')
    expect(removed.subregionIds).toEqual(['western-europe'])

    const invalid = createDrillSelection('Europe', ['northern-europe', 'south-asia'])
    expect(invalid.subregionIds).toEqual(['northern-europe'])
  })

  it('toggles Entire Continent between all and no Subregions', () => {
    const partial = createDrillSelection('Europe', ['northern-europe'])
    const all = toggleEntireContinentSelection(partial)
    expect(all.subregionIds).toEqual(getAllDrillSubregionIds('Europe'))
    expect(isEntireContinentSelection(all)).toBe(true)

    const none = toggleEntireContinentSelection(all)
    expect(none).toEqual({ continent: 'Europe', subregionIds: [] })
    expect(isEntireContinentSelection(none)).toBe(false)

    const allAgain = toggleEntireContinentSelection(none)
    expect(allAgain.subregionIds).toEqual(getAllDrillSubregionIds('Europe'))
  })
})
