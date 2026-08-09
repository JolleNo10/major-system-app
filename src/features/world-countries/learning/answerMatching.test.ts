import { describe, expect, it } from 'vitest'
import { matchesCountryName, matchesPlaceName, normalizePlaceName } from './answerMatching'

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
    expect(matchesPlaceName('Austria', 'Australia', { fuzzy: true, candidates: ['Austria', 'Australia'] })).toBe(false)
  })
})
