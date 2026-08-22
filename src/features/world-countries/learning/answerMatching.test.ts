import { describe, expect, it } from 'vitest'
import { classifyPlaceName, matchesCountryName, matchesPlaceName, normalizePlaceName } from './answerMatching'

describe('World Countries answer matching', () => {
  it('normalizes case, whitespace, punctuation, accents, and aliases', () => {
    expect(normalizePlaceName('  Washington, D.C. ')).toBe('washington d c')
    expect(matchesPlaceName('Sao Tome', 'São Tomé')).toBe(true)
    expect(matchesCountryName('England', {
      id: 'GB',
      country: 'United Kingdom',
      capital: 'London',
      continent: 'Europe',
      subregionId: 'northern-europe',
      subregion: 'Northern Europe',
      aliases: ['England'],
    })).toBe(true)
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
