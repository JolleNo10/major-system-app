import { describe, expect, it } from 'vitest'
import { getCanonicalCountryIdsForSubregion } from '@/features/world-countries/data/countries'
import {
  createDrillSelection,
  getAllDrillSubregionIds,
  getCountriesForDrillSelection,
  isEntireContinentSelection,
  toggleEntireContinentSelection,
  toggleDrillSubregion,
} from './drillSelection'

describe('World Countries Drill selection', () => {
  it('derives an entire Continent from its canonical Subregions', () => {
    const selection = createDrillSelection('Europe')
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
