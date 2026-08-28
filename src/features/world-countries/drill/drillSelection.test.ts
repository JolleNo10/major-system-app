import { describe, expect, it } from 'vitest'
import { getCanonicalCountryIdsForSubregion } from '@/features/world-countries/data/countries'
import {
  clearDrillSelection,
  createDrillSelection,
  getAllDrillSubregionIds,
  getContinentSelectionState,
  getCountriesForDrillSelection,
  getCountriesForDrillSelectionInEffectiveOrder,
  getDrillSelectionCounts,
  selectAllDrillSubregions,
  toggleDrillSubregion,
  toggleEntireContinentSelection,
  withAllDrillSubregions,
} from './drillSelection'

describe('World Countries Drill selection', () => {
  it('allows selected Subregions from multiple Continents', () => {
    const selection = createDrillSelection(['northern-europe', 'south-asia'])

    expect(selection.subregionIds).toEqual(['northern-europe', 'south-asia'])
    expect(getCountriesForDrillSelection(selection).some(country => country.continent === 'Europe')).toBe(true)
    expect(getCountriesForDrillSelection(selection).some(country => country.continent === 'Asia')).toBe(true)
  })

  it('starts empty and can select every Subregion in one Continent', () => {
    const emptySelection = createDrillSelection()
    expect(emptySelection).toEqual({ subregionIds: [] })
    expect(getContinentSelectionState(emptySelection, 'Europe')).toBe('none')
    expect(getCountriesForDrillSelection(emptySelection)).toEqual([])

    const selection = withAllDrillSubregions('Europe')
    const expectedSubregions = getAllDrillSubregionIds('Europe')
    expect(selection.subregionIds).toEqual(expectedSubregions)
    expect(getContinentSelectionState(selection, 'Europe')).toBe('all')
    expect(getCountriesForDrillSelection(selection).every(country => country.continent === 'Europe')).toBe(true)
  })

  it('normalizes stale IDs without dropping valid IDs', () => {
    const selection = createDrillSelection(['northern-europe', 'not-a-subregion' as never, 'south-asia'])

    expect(selection.subregionIds).toEqual(['northern-europe', 'south-asia'])
  })

  it('derives a selected Subregion population without persisting Country membership', () => {
    const selection = createDrillSelection(['northern-europe'])
    expect(selection).toEqual({ subregionIds: ['northern-europe'] })
    expect(getCountriesForDrillSelection(selection).map(country => country.id)).toEqual(
      getCanonicalCountryIdsForSubregion('northern-europe'),
    )
  })

  it('projects saved World, Continent, and Subregion order into the Country population', () => {
    const countryIds = getCanonicalCountryIdsForSubregion('northern-europe')
    const reversedCountryIds = [...countryIds].reverse()
    const metadata = {
      world: { continentOrder: ['europe', 'asia'] as const },
      continents: [
        { continentId: 'europe' as const, subregionOrder: ['northern-europe'] as const },
        { continentId: 'asia' as const, subregionOrder: ['south-asia'] as const },
      ],
      subregions: [{ subregionId: 'northern-europe' as const, countryOrder: reversedCountryIds }],
    }

    const orderedCountries = getCountriesForDrillSelectionInEffectiveOrder(
      createDrillSelection(['northern-europe', 'south-asia']),
      undefined,
      metadata,
    )

    expect(orderedCountries.slice(0, reversedCountryIds.length).map(country => country.id)).toEqual(reversedCountryIds)
    expect(orderedCountries.slice(reversedCountryIds.length).every(country => country.subregionId === 'south-asia')).toBe(true)
  })

  it('reports none, partial, and all state per Continent', () => {
    const allEurope = getAllDrillSubregionIds('Europe')
    expect(getContinentSelectionState(createDrillSelection(), 'Europe')).toBe('none')
    expect(getContinentSelectionState(createDrillSelection([allEurope[0]!]), 'Europe')).toBe('partial')
    expect(getContinentSelectionState(createDrillSelection(allEurope), 'Europe')).toBe('all')
  })

  it('toggles one Continent without changing another', () => {
    const initial = createDrillSelection(['south-asia', 'northern-europe'])
    const selectedEurope = toggleEntireContinentSelection(initial, 'Europe')
    expect(selectedEurope.subregionIds).toContain('south-asia')
    expect(getContinentSelectionState(selectedEurope, 'Europe')).toBe('all')

    const clearedEurope = toggleEntireContinentSelection(selectedEurope, 'Europe')
    expect(clearedEurope.subregionIds).toEqual(['south-asia'])
    expect(getContinentSelectionState(clearedEurope, 'Asia')).toBe('partial')
  })

  it('toggles a Subregion while preserving other Continents', () => {
    const selection = createDrillSelection(['northern-europe', 'south-asia'])
    const added = toggleDrillSubregion(selection, 'western-europe')
    expect(added.subregionIds).toEqual(['northern-europe', 'western-europe', 'south-asia'])

    const removed = toggleDrillSubregion(added, 'northern-europe')
    expect(removed.subregionIds).toEqual(['western-europe', 'south-asia'])
  })

  it('selects all World, clears all, and derives counts', () => {
    const all = selectAllDrillSubregions()
    const counts = getDrillSelectionCounts(all)
    expect(counts.continents).toBeGreaterThan(1)
    expect(counts.subregions).toBe(all.subregionIds.length)
    expect(counts.countries).toBeGreaterThan(counts.subregions)
    expect(clearDrillSelection()).toEqual({ subregionIds: [] })
  })
})
