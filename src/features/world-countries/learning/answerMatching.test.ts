import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { classifyPlaceName, matchesCountryName, matchesPlaceName, normalizePlaceName } from './answerMatching'

describe('World Countries answer matching', () => {
  it('normalizes case, whitespace, punctuation, accents, and aliases', () => {
    expect(normalizePlaceName('  Washington, D.C. ')).toBe('washington d c')
    expect(matchesPlaceName('Sao Tome', 'São Tomé')).toBe(true)
    const unitedKingdom = countries.find(country => country.id === 'GB')
    if (!unitedKingdom) throw new Error('Expected United Kingdom fixture is missing')
    expect(matchesCountryName('UK', unitedKingdom)).toBe(true)
    expect(matchesCountryName('Great Britain', unitedKingdom)).toBe(true)
    expect(matchesCountryName('England', unitedKingdom)).toBe(false)
  })

  it('keeps normalized country and capital answers unambiguous', () => {
    const countryOwners = new Map<string, string>()
    for (const country of countries) {
      for (const value of [country.country, ...(country.countryAliases ?? [])]) {
        const normalized = normalizePlaceName(value)
        const owner = countryOwners.get(normalized)
        if (owner && owner !== country.id) {
          throw new Error(`Country answer ${value} resolves to both ${owner} and ${country.id}`)
        }
        countryOwners.set(normalized, country.id)
      }
    }

    const capitalOwners = new Map<string, string>()
    for (const country of countries) {
      for (const value of [country.capital, ...(country.capitalAliases ?? [])]) {
        const normalized = normalizePlaceName(value)
        const owner = capitalOwners.get(normalized)
        if (owner && owner !== country.id) {
          throw new Error(`Capital answer ${value} resolves to both ${owner} and ${country.id}`)
        }
        capitalOwners.set(normalized, country.id)
      }
    }
  })

  it('only applies controlled fuzzy matching when enabled', () => {
    expect(matchesPlaceName('Noreway', 'Norway')).toBe(false)
    expect(matchesPlaceName('Noreway', 'Norway', { fuzzy: true, candidates: ['Norway', 'Sweden'] })).toBe(true)
    expect(classifyPlaceName('Riyahd', 'Riyadh', { fuzzy: true, candidates: ['Riyadh', 'Jeddah'] })).toBe('fuzzy')
  })

  it('rejects a short answer with two genuine errors', () => {
    expect(classifyPlaceName('Riyxah', 'Riyadh', { fuzzy: true, candidates: ['Riyadh'] })).toBe('none')
  })

  it('rejects ambiguous fuzzy matches', () => {
    expect(classifyPlaceName('Austria', 'Australia', { fuzzy: true, candidates: ['Austria', 'Australia'] })).toBe('none')
  })

  it('classifies exact and fuzzy matches separately', () => {
    expect(classifyPlaceName('Norway', 'Norway', { fuzzy: true })).toBe('exact')
    expect(classifyPlaceName('Noreway', 'Norway', { fuzzy: true, candidates: ['Norway', 'Sweden'] })).toBe('fuzzy')
    expect(classifyPlaceName('Noreway', 'Norway')).toBe('none')
  })
})
