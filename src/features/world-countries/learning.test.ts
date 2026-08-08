import { describe, expect, it } from 'vitest'
import {
  capitalToCountryItemId,
  countryToCapitalItemId,
  getContinentScope,
  getSubregionScope,
  getWorldScope,
} from './learning'
import { countries, type Country } from './data/countries'

const sample: Country[] = [
  { country: 'Norway', capital: 'Oslo', continent: 'Europe', subregion: 'Northern Europe' },
  { country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregion: 'Northern Europe' },
  { country: 'Japan', capital: 'Tokyo', continent: 'Asia', subregion: 'East Asia' },
]

describe('World Countries learning adapter', () => {
  it('publishes stable IDs on bundled country records', () => {
    expect(countries.find(entry => entry.country === 'Norway')?.id).toBe('NO')
  })

  it('keeps opposite recall directions independent and uses stable country ids', () => {
    expect(countryToCapitalItemId(sample[0])).toBe('geo:capital:NO:country-to-capital')
    expect(capitalToCountryItemId(sample[0])).toBe('geo:capital:NO:capital-to-country')
    expect(countryToCapitalItemId(sample[0])).not.toBe(capitalToCountryItemId(sample[0]))
  })

  it('derives scopes from geography records rather than creating hierarchy items', () => {
    expect(getSubregionScope('Northern Europe', 'country-to-capital', sample).itemIds).toEqual([
      'geo:capital:NO:country-to-capital',
      'geo:capital:SE:country-to-capital',
    ])
    expect(getContinentScope('Europe', 'country-to-capital', sample).itemIds).toHaveLength(2)
    expect(getWorldScope('capital-to-country', sample).itemIds).toHaveLength(3)
  })
})
