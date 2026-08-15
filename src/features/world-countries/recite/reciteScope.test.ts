import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import type { ContinentMetadata } from '@/features/world-countries/geography/continentMetadata'
import {
  createWorldCountriesReciteScope,
  getCountriesForReciteSelectionInEffectiveOrder,
  toggleEntireContinentReciteSelection,
  toggleReciteSubregionSelection,
} from './reciteScope'

describe('World Countries Recite scope', () => {
  it('keeps the active population in supplied order', () => {
    expect(createWorldCountriesReciteScope([
      { id: 'GL' },
      { id: 'NO' },
      { id: 'GL' },
    ])).toEqual({
      countryIds: ['GL', 'NO'],
      totalCountries: 2,
    })
  })

  it('uses effective authored order rather than Subregion selection order', () => {
    const entries = countries.filter(country => ['DZ', 'AO', 'BJ'].includes(country.id))

    const ordered = getCountriesForReciteSelectionInEffectiveOrder(
      'Africa',
      ['southern-africa', 'west-africa'],
      entries,
      { continentId: 'africa', subregionOrder: ['west-africa', 'southern-africa'] },
      [
        { subregionId: 'west-africa', countryOrder: ['BJ'] },
        { subregionId: 'southern-africa', countryOrder: ['AO'] },
      ],
    )

    expect(ordered.map(country => country.id)).toEqual(['BJ', 'AO'])
  })

  it('does not duplicate Country IDs in the concrete sequence', () => {
    const entries = countries.filter(country => ['DZ', 'EG'].includes(country.id))
    const ordered = getCountriesForReciteSelectionInEffectiveOrder(
      'Africa',
      ['north-africa'],
      [...entries, entries[0]],
    )

    expect(ordered.map(country => country.id)).toEqual(['DZ', 'EG'])
  })

  it('normalizes toggled selections to effective Subregion order', () => {
    const entries = countries.filter(country => ['DZ', 'AO', 'BJ'].includes(country.id))
    const metadata: Pick<ContinentMetadata, 'continentId' | 'subregionOrder'> = { continentId: 'africa', subregionOrder: ['west-africa', 'north-africa', 'southern-africa'] }
    const selected = toggleReciteSubregionSelection('Africa', ['southern-africa'], 'west-africa', entries, metadata)

    expect(selected).toEqual(['west-africa', 'southern-africa'])
    expect(toggleEntireContinentReciteSelection('Africa', selected, entries, metadata)).toEqual(['west-africa', 'north-africa', 'southern-africa'])
  })
})
