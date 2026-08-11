import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { countryClassifications } from '@/features/world-countries/data/countryClassification'
import {
  normalizeWorldCountriesIncludedEntityGroups,
  resolveCountrySet,
  WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS,
  type WorldCountriesEntityGroupId,
} from './countrySet'

function ids(groupIds: readonly WorldCountriesEntityGroupId[]) {
  return resolveCountrySet(countries, countryClassifications, groupIds).map(country => country.id)
}

describe('World Countries country-set resolver', () => {
  it('defaults to the 193 UN Member States', () => {
    const resolved = resolveCountrySet(countries, countryClassifications, [])
    expect(resolved).toHaveLength(193)
    expect(resolved.some(country => country.id === 'VA')).toBe(false)
    expect(resolved.some(country => country.id === 'GL')).toBe(false)
  })

  it('adds the selected geopolitical groups as a union in canonical order', () => {
    expect(ids(['observer-states'])).toEqual(expect.arrayContaining(['VA', 'PS']))
    expect(ids(['partially-recognized-sovereign-states'])).toEqual(expect.arrayContaining(['XK', 'TW']))
    expect(ids(['observer-states', 'partially-recognized-sovereign-states'])).toHaveLength(197)
    expect(ids(['special-political-status'])).toEqual(expect.arrayContaining(['CK', 'NU']))
    expect(ids(['territories'])).toEqual(expect.arrayContaining(['GL']))
  })

  it('does not duplicate entities that match more than one selected rule', () => {
    const resolved = resolveCountrySet(countries, countryClassifications, [
      'observer-states',
      'partially-recognized-sovereign-states',
      'special-political-status',
      'territories',
    ])
    expect(new Set(resolved.map(country => country.id)).size).toBe(resolved.length)
    expect(resolved.map(country => country.id)).toEqual(countries
      .filter(country => resolved.some(candidate => candidate.id === country.id))
      .map(country => country.id))
  })

  it('normalizes persisted group IDs without allowing unknown policy values', () => {
    expect(normalizeWorldCountriesIncludedEntityGroups([
      'territories',
      'territories',
      'not-a-group',
      'observer-states',
    ])).toEqual(['territories', 'observer-states'])
    expect(normalizeWorldCountriesIncludedEntityGroups('territories')).toEqual([])
    expect(WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS).toHaveLength(4)
  })
})
