import { describe, it, expect } from 'vitest'
import { CARD_WORDS } from './cardWords'
import { WORDS } from './words'

describe('cardWords', () => {
  it('has all 52 card numbers 01–52, each with a non-empty word', () => {
    const keys = Object.keys(CARD_WORDS).sort()
    const expected = Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, '0'))
    expect(keys).toEqual(expected)
    for (const k of expected) {
      expect(CARD_WORDS[k]).toBeTruthy()
    }
  })

  it('seeds clubs (01–13) from the Major System defaults', () => {
    for (let i = 1; i <= 13; i++) {
      const k = String(i).padStart(2, '0')
      expect(CARD_WORDS[k]).toBe(WORDS[k])
    }
  })
})
