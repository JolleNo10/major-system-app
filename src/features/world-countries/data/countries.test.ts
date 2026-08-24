import { describe, expect, it } from 'vitest'
import { COUNTRY_RECORDS, countries } from './countries'

const knownIdentityByCountry = {
  Pakistan: 'PK',
  India: 'IN',
  Maldives: 'MV',
  Myanmar: 'MM',
} as const

describe('canonical Country identity', () => {
  it('keeps known stable IDs attached to their Country records', () => {
    const recordsByCountry = new Map(COUNTRY_RECORDS.map(record => [record.country, record] as const))

    for (const [countryName, expectedId] of Object.entries(knownIdentityByCountry)) {
      expect(recordsByCountry.get(countryName)?.id).toBe(expectedId)
    }
  })

  it('has a complete, unique stable-ID population', () => {
    const ids = countries.map(country => country.id)

    expect(countries).toHaveLength(200)
    expect(ids.every(id => id.trim().length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('preserves identity when canonical records are reordered', () => {
    const reordered = [...countries].reverse()

    for (const [countryName, expectedId] of Object.entries(knownIdentityByCountry)) {
      expect(reordered.find(country => country.country === countryName)?.id).toBe(expectedId)
    }
  })
})
