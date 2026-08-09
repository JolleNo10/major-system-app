import { describe, expect, it } from 'vitest'
import { countries } from './countries'
import {
  CONTINENT_IDS,
  SUBREGION_DEFINITIONS,
  getSubregionDefinition,
  subregionIdFor,
} from './subregions'

describe('stable World Countries geography identity', () => {
  it('keeps explicit IDs independent from presentation labels', () => {
    expect(subregionIdFor('Northern Europe')).toBe('northern-europe')
    expect(getSubregionDefinition('northern-europe')).toMatchObject({
      id: 'northern-europe',
      label: 'Northern Europe',
      continent: 'Europe',
    })
  })

  it('has unique explicit IDs and stable IDs on every bundled country', () => {
    expect(new Set(SUBREGION_DEFINITIONS.map(definition => definition.id)).size)
      .toBe(SUBREGION_DEFINITIONS.length)
    expect(countries.every(country => country.subregionId)).toBe(true)
    expect(countries.every(country => {
      const definition = getSubregionDefinition(country.subregionId)
      return definition.continent === country.continent
    })).toBe(true)
  })

  it('preserves the existing continent key values', () => {
    expect(CONTINENT_IDS).toMatchObject({ Africa: 'africa', Europe: 'europe', Oceania: 'oceania' })
  })
})
