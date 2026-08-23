import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  CAPITAL_AUTHORING_GEO_REFERENCES,
  CAPITAL_AUTHORING_REFERENCE_EXCEPTIONS,
} from './capitalAuthoringReferenceData'

describe('capital authoring geographic reference data', () => {
  it('uses only canonical Country IDs and covers the authoring population', () => {
    const countryIds = new Set(countries.map(country => country.id))
    const exceptions = new Set(CAPITAL_AUTHORING_REFERENCE_EXCEPTIONS)

    for (const [key, reference] of Object.entries(CAPITAL_AUTHORING_GEO_REFERENCES)) {
      expect(countryIds.has(key)).toBe(true)
      expect(reference.countryId).toBe(key)
      expect(exceptions.has(key)).toBe(false)
    }
    for (const country of countries) {
      expect(exceptions.has(country.id) || CAPITAL_AUTHORING_GEO_REFERENCES[country.id]).toBeTruthy()
    }
  })

  it('keeps every coordinate finite and inside geographic ranges', () => {
    for (const reference of Object.values(CAPITAL_AUTHORING_GEO_REFERENCES)) {
      for (const point of [reference.capital, reference.countryReference]) {
        expect(Number.isFinite(point.lat)).toBe(true)
        expect(Number.isFinite(point.lon)).toBe(true)
        expect(point.lat).toBeGreaterThanOrEqual(-90)
        expect(point.lat).toBeLessThanOrEqual(90)
        expect(point.lon).toBeGreaterThanOrEqual(-180)
        expect(point.lon).toBeLessThanOrEqual(180)
      }
    }
  })
})
