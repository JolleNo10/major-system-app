import { describe, it, expect } from 'vitest'
import { groupTriples, roleAt } from '@/features/pao/triples'

describe('groupTriples', () => {
  it('chunks an exact multiple of 3 into full triples', () => {
    expect(groupTriples([1, 2, 3, 4, 5, 6])).toEqual([[1, 2, 3], [4, 5, 6]])
  })

  it('keeps a partial final group of 1', () => {
    const g = groupTriples([1, 2, 3, 4, 5, 6, 7])
    expect(g).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('keeps a partial final group of 2', () => {
    const g = groupTriples([1, 2, 3, 4, 5])
    expect(g).toEqual([[1, 2, 3], [4, 5]])
  })

  it('handles a full 52-card deck as 17 triples + 1 leftover', () => {
    const deck = Array.from({ length: 52 }, (_, i) => i)
    const g = groupTriples(deck)
    expect(g).toHaveLength(18)
    expect(g[17]).toEqual([51])
    expect(g.slice(0, 17).every(t => t.length === 3)).toBe(true)
  })

  it('returns an empty array for empty input', () => {
    expect(groupTriples([])).toEqual([])
  })

  it('supports a custom size', () => {
    expect(groupTriples([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})

describe('roleAt', () => {
  it('maps triple positions to person/action/object', () => {
    expect(roleAt(0)).toBe('person')
    expect(roleAt(1)).toBe('action')
    expect(roleAt(2)).toBe('object')
  })
})
