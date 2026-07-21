import { describe, it, expect } from 'vitest'
import { matchesAnswer } from './answerMatch'

describe('matchesAnswer', () => {
  it('accepts the full name (case/space-insensitive)', () => {
    expect(matchesAnswer('Tom Cruise', 'Tom Cruise')).toBe(true)
    expect(matchesAnswer('  tom cruise ', 'Tom Cruise')).toBe(true)
  })

  it('accepts just the first name', () => {
    expect(matchesAnswer('Tom', 'Tom Cruise')).toBe(true)
    expect(matchesAnswer('donald', 'Donald Trump')).toBe(true)
  })

  it('rejects wrong or partial-but-not-first-word input', () => {
    expect(matchesAnswer('Cruise', 'Tom Cruise')).toBe(false)
    expect(matchesAnswer('Tom C', 'Tom Cruise')).toBe(false)
    expect(matchesAnswer('', 'Tom Cruise')).toBe(false)
    expect(matchesAnswer('Nemo', 'Mario')).toBe(false)
  })

  it('is a no-op for single-word answers', () => {
    expect(matchesAnswer('sete', 'sete')).toBe(true)
    expect(matchesAnswer('tass', 'sete')).toBe(false)
  })
})
