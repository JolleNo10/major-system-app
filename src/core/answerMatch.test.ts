import { describe, it, expect } from 'vitest'
import { matchesAnswer, matchesAnswerLoose } from '@/core/answerMatch'

describe('matchesAnswer', () => {
  it('accepts the full name (case/space-insensitive)', () => {
    expect(matchesAnswer('Tom Cruise', 'Tom Cruise')).toBe(true)
    expect(matchesAnswer('  tom cruise ', 'Tom Cruise')).toBe(true)
  })

  it('accepts any word 2+ letters, not just the first', () => {
    expect(matchesAnswer('Tom', 'Tom Cruise')).toBe(true)
    expect(matchesAnswer('donald', 'Donald Trump')).toBe(true)
    expect(matchesAnswer('Cruise', 'Tom Cruise')).toBe(true)
    expect(matchesAnswer('sikte', 'i sikte bla bla')).toBe(true)
    expect(matchesAnswer('bla', 'i sikte bla bla')).toBe(true)
  })

  it('rejects single-letter words and non-word input', () => {
    expect(matchesAnswer('i', 'i sikte bla bla')).toBe(false)
    expect(matchesAnswer('Tom C', 'Tom Cruise')).toBe(false)
    expect(matchesAnswer('', 'Tom Cruise')).toBe(false)
    expect(matchesAnswer('Nemo', 'Mario')).toBe(false)
  })

  it('accepts a single-letter answer typed in full', () => {
    expect(matchesAnswer('i', 'i')).toBe(true)
  })

  it('is a no-op for single-word answers', () => {
    expect(matchesAnswer('sete', 'sete')).toBe(true)
    expect(matchesAnswer('tass', 'sete')).toBe(false)
  })
})

describe('matchesAnswerLoose', () => {
  it('still accepts everything strict matching does', () => {
    expect(matchesAnswerLoose('Tom Cruise', 'Tom Cruise')).toBe(true)
    expect(matchesAnswerLoose('Cruise', 'Tom Cruise')).toBe(true)
    expect(matchesAnswerLoose('', 'Tom Cruise')).toBe(false)
  })

  it('accepts an inflected form via a token-edge stem match', () => {
    expect(matchesAnswerLoose('hanske', 'hansken')).toBe(true)   // typed indefinite, answer definite
    expect(matchesAnswerLoose('hansken', 'hanske')).toBe(true)   // and the reverse
    expect(matchesAnswerLoose('katt', 'katten')).toBe(true)
  })

  it('accepts a compound part at either edge', () => {
    expect(matchesAnswerLoose('mål', 'fotballmål')).toBe(true)   // suffix
    expect(matchesAnswerLoose('fotball', 'fotballmål')).toBe(true) // prefix
  })

  it('matches per answer-word too', () => {
    expect(matchesAnswerLoose('cruiser', 'Tom Cruise')).toBe(true)
  })

  it('rejects stems shorter than the minimum (1–2 chars)', () => {
    expect(matchesAnswerLoose('ha', 'hansken')).toBe(false)
    expect(matchesAnswerLoose('ka', 'katten')).toBe(false)
  })

  it('rejects unrelated words', () => {
    expect(matchesAnswerLoose('hund', 'hansken')).toBe(false)
  })
})
