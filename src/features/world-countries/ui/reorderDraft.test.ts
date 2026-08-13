import { describe, expect, it } from 'vitest'
import { reorderDraft } from './reorderDraft'

describe('reorderDraft', () => {
  it('moves one visible item without mutating the source', () => {
    const source = ['a', 'b', 'c']
    expect(reorderDraft(source, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(source).toEqual(['a', 'b', 'c'])
  })

  it('returns a copy for invalid positions', () => {
    const source = ['a', 'b']
    expect(reorderDraft(source, -1, 1)).toEqual(source)
    expect(reorderDraft(source, 0, 4)).not.toBe(source)
  })
})
