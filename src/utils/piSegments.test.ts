import { describe, it, expect } from 'vitest'
import { PI_PAIRS } from '../data/piDigits'
import { segmentAnchorPos, segmentDigitRange, segmentAnchorPairs } from './piSegments'

describe('segmentAnchorPos', () => {
  it('maps segment 0 to the first π pair', () => {
    expect(segmentAnchorPos(0)).toBe(1)
  })

  it('maps segment 3 to π position 31', () => {
    expect(segmentAnchorPos(3)).toBe(31)
  })
})

describe('segmentDigitRange', () => {
  it('covers decimal digits 1–20 for segment 0', () => {
    expect(segmentDigitRange(0)).toEqual([1, 20])
  })

  it('covers decimal digits 61–80 for segment 3', () => {
    expect(segmentDigitRange(3)).toEqual([61, 80])
  })

  it('starts where the previous segment ended', () => {
    const [, prevEnd] = segmentDigitRange(4)
    const [nextStart] = segmentDigitRange(5)
    expect(nextStart).toBe(prevEnd + 1)
  })
})

describe('segmentAnchorPairs', () => {
  it('reads the opening pair of each consecutive segment', () => {
    expect(segmentAnchorPairs(0, 3)).toEqual([PI_PAIRS[0], PI_PAIRS[10], PI_PAIRS[20]])
  })

  it('starts at the requested segment', () => {
    expect(segmentAnchorPairs(3, 2)).toEqual([PI_PAIRS[30], PI_PAIRS[40]])
  })

  it('truncates past the end of the π data', () => {
    const lastSeg = Math.floor((PI_PAIRS.length - 1) / 10)
    expect(segmentAnchorPairs(lastSeg, 5).length).toBeLessThanOrEqual(5)
    expect(segmentAnchorPairs(lastSeg + 10, 3)).toEqual([])
  })

  it('returns nothing for a zero-length run', () => {
    expect(segmentAnchorPairs(2, 0)).toEqual([])
  })
})
