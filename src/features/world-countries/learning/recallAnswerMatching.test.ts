import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from './recallAnswerMatching'

const norway = countries.find(country => country.id === 'NO')!

describe('World Countries recall answer matching', () => {
  it('evaluates each recall direction against the canonical relationship', () => {
    expect(classifyRecallAnswer('location-to-country', 'Norway', norway)).not.toBe('none')
    expect(classifyRecallAnswer('shape-to-country', 'Norway', norway)).not.toBe('none')
    expect(classifyRecallAnswer('country-to-capital', 'Oslo', norway)).not.toBe('none')
    expect(classifyRecallAnswer('capital-to-country', 'Norway', norway)).not.toBe('none')
    expect(classifyRecallAnswer('country-to-capital', 'Stockholm', norway)).toBe('none')
  })

  it('keeps fuzzy matching opt-in and reports the kind of match', () => {
    expect(classifyRecallAnswer('country-to-capital', 'Oslo', norway)).toBe('exact')
    expect(classifyRecallAnswer('country-to-capital', 'Osl', norway, { fuzzy: true })).toBe('none')
    expect(classifyRecallAnswer('location-to-country', 'Noreway', norway, {
      fuzzy: true,
      countryCandidates: [norway],
    })).toBe('fuzzy')
    expect(classifyRecallAnswer('shape-to-country', 'Noreway', norway, {
      fuzzy: true,
      countryCandidates: [norway],
    })).toBe('fuzzy')
  })
})
