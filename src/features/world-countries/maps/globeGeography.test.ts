import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  createValidatedGlobeGeography,
  getGlobeFeature,
  getGlobeGeography,
  GLOBE_SOURCE_ID_EXCEPTIONS,
} from './globeGeography'

describe('globe geography adapter', () => {
  it('covers every canonical Country exactly once', () => {
    const geography = getGlobeGeography()
    const ids = geography.features.map(feature => feature.properties.countryId)

    expect(geography.features).toHaveLength(countries.length)
    expect(new Set(ids).size).toBe(countries.length)
    expect(new Set(ids)).toEqual(new Set(countries.map(country => country.id)))
  })

  it('preserves explicit source identity exceptions', () => {
    const geography = getGlobeGeography()
    for (const [countryId, sourceIdentity] of Object.entries(GLOBE_SOURCE_ID_EXCEPTIONS)) {
      const feature = geography.features.find(candidate => candidate.properties.countryId === countryId)
      expect(feature?.properties.sourceIdentity).toBe(sourceIdentity)
    }
  })

  it('keeps multipart Countries as one canonical feature', () => {
    const geography = getGlobeGeography()
    expect(geography.features.find(feature => feature.id === 'GB')?.geometry.type).toBe('MultiPolygon')
    expect(geography.features.find(feature => feature.id === 'FM')?.geometry.type).toBe('MultiPolygon')
  })

  it('rejects malformed or incomplete prepared data', () => {
    expect(() => createValidatedGlobeGeography({ type: 'FeatureCollection', features: [] }, ['NO'])).toThrow(/missing Countries/)
    expect(() => createValidatedGlobeGeography({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', id: 'NO', properties: {}, geometry: null }],
    }, ['NO'])).toThrow(/invalid Country feature/)
  })

  it('rejects prepared data outside the required canonical set', () => {
    const norway = getGlobeFeature('NO')
    const france = getGlobeFeature('FR')
    expect(norway).toBeDefined()
    expect(france).toBeDefined()
    expect(() => createValidatedGlobeGeography({ type: 'FeatureCollection', features: [norway, france] }, ['NO'])).toThrow(/unknown Countries/)
  })

  it('does not return hidden Country geometry', () => {
    expect(getGlobeFeature('NO', new Set(['NO']))).toBeUndefined()
    expect(getGlobeFeature('NO')?.properties.countryId).toBe('NO')
  })
})
