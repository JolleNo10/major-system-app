import { describe, expect, it } from 'vitest'
import { buildCountryQuestion, matchesPlaceName, normalizePlaceName, pickCountry } from './countryQuiz'
import type { Country } from './countries'

const sample: Country[] = [
  { country: 'Norway', capital: 'Oslo', continent: 'Europe', subregion: 'Northern Europe' },
  { country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregion: 'Northern Europe' },
  { country: 'France', capital: 'Paris', continent: 'Europe', subregion: 'Western Europe' },
  { country: 'Japan', capital: 'Tokyo', continent: 'Asia', subregion: 'East Asia' },
]

describe('country quiz helpers', () => {
  it('normalizes accents, punctuation, and casing', () => {
    expect(normalizePlaceName('  WASHINGTON, D.C. ')).toBe('washington d c')
    expect(matchesPlaceName('Sao Tome', 'São Tomé')).toBe(true)
    expect(matchesPlaceName('Cote d Ivoire', "Côte d'Ivoire")).toBe(true)
    expect(matchesPlaceName('Washington DC', 'Washington, D.C.')).toBe(true)
    expect(matchesPlaceName('NDjamena', "N'Djamena")).toBe(true)
  })

  it('builds unique options containing the answer', () => {
    const question = buildCountryQuestion(sample[0], sample, 'country-to-capital', () => 0)
    expect(question.prompt).toBe('Norway')
    expect(question.answer).toBe('Oslo')
    expect(question.options).toContain('Oslo')
    expect(new Set(question.options).size).toBe(question.options.length)
    expect(question.options).toHaveLength(3)
  })

  it('supports the reverse direction', () => {
    const question = buildCountryQuestion(sample[3], sample, 'capital-to-country', () => 0)
    expect(question.prompt).toBe('Tokyo')
    expect(question.answer).toBe('Japan')
  })

  it('does not immediately repeat when alternatives exist', () => {
    expect(pickCountry(sample, 'Norway', () => 0).country).toBe('Sweden')
  })
})
