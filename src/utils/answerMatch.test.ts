import { describe, it, expect } from 'vitest'
import { matchesAnswer } from './answerMatch'

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
