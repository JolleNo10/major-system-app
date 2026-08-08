import { describe, expect, it } from 'vitest'
import { getPiRangeScope, getPiSegmentScope, piPairItemId } from './piLearning'

describe('Pi learning adapter', () => {
  it('exposes pair identities without changing Pi domain data', () => {
    expect(piPairItemId(42)).toBe('pi:pair:42')
    expect(getPiSegmentScope(0).itemIds).toHaveLength(10)
    expect(getPiSegmentScope(0).itemIds[0]).toBe('pi:pair:1')
  })

  it('represents a range as one scope over its atomic pair identities', () => {
    const scope = getPiRangeScope(0, 1)
    expect(scope.id).toBe('pi:range:0-1')
    expect(scope.itemIds).toHaveLength(20)
  })
})
