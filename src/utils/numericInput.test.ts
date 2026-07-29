import { describe, expect, it } from 'vitest'
import {
  isCompleteNumericAnswer,
  isNumericDraft,
  isValidNumericInsertion,
  summarizeBatchTimings,
} from './numericInput'

describe('numeric input validation', () => {
  it('accepts empty drafts, digits, and leading zeroes up to the limit', () => {
    expect(isNumericDraft('', 2)).toBe(true)
    expect(isNumericDraft('0', 2)).toBe(true)
    expect(isNumericDraft('07', 2)).toBe(true)
  })

  it('rejects overlong, pasted, or non-ASCII numeric drafts', () => {
    for (const value of ['123', '1 2', '1.2', '-1', '+1', '1a', '1!', '１２']) {
      expect(isNumericDraft(value, 2), value).toBe(false)
    }
  })

  it('requires the exact number of ASCII digits before submission', () => {
    expect(isCompleteNumericAnswer('07', 2)).toBe(true)
    expect(isCompleteNumericAnswer('', 2)).toBe(false)
    expect(isCompleteNumericAnswer('0', 2)).toBe(false)
    expect(isCompleteNumericAnswer('007', 2)).toBe(false)
    expect(isCompleteNumericAnswer('0!', 2)).toBe(false)
  })
  it('rejects invalid or overlong pasted text before the browser truncates it', () => {
    expect(isValidNumericInsertion('', '07', 0, 0, 2)).toBe(true)
    expect(isValidNumericInsertion('', '07!', 0, 0, 2)).toBe(false)
    expect(isValidNumericInsertion('0', '12', 1, 1, 2)).toBe(false)
    expect(isValidNumericInsertion('07', '1', 0, 2, 2)).toBe(true)
  })
})

describe('batch timing summary', () => {
  it('keeps total, rate, average, and slowest batch accurate', () => {
    expect(summarizeBatchTimings([
      { pairCount: 10, ms: 5000 },
      { pairCount: 5, ms: 2000 },
    ])).toEqual({
      totalMs: 7000,
      pairCount: 15,
      pairsPerSec: 15 / 7,
      averagePairMs: 7000 / 15,
      slowestBatchMs: 5000,
      hasMultiPairBatch: true,
    })
  })

  it('handles empty and single-pair timing sets', () => {
    expect(summarizeBatchTimings([])).toEqual({
      totalMs: 0,
      pairCount: 0,
      pairsPerSec: 0,
      averagePairMs: 0,
      slowestBatchMs: 0,
      hasMultiPairBatch: false,
    })
    expect(summarizeBatchTimings([{ pairCount: 1, ms: 800 }]).hasMultiPairBatch).toBe(false)
  })
})
