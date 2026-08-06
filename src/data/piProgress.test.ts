import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  flawlessSegmentsFromRun,
  flawlessSegmentsFromSessions,
  loadFlawlesslyRecitedPiSegments,
  pendingMemoedSegmentRanges,
  saveFlawlesslyRecitedPiSegments,
} from './piProgress'
import type { PiSession } from './piStats'

afterEach(() => vi.unstubAllGlobals())

describe('flawlessly recited segment persistence', () => {
  it('round-trips the completed segment set in sorted order', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })

    saveFlawlesslyRecitedPiSegments(new Set([5, 1, 3]))

    expect(values.get('major-pi-recited-segs')).toBe('[1,3,5]')
    expect(loadFlawlesslyRecitedPiSegments()).toEqual(new Set([1, 3, 5]))
  })
})

describe('pendingMemoedSegmentRanges', () => {
  it('groups adjacent pending memoed segments into one range', () => {
    expect(pendingMemoedSegmentRanges(
      new Set([2, 3, 4]),
      new Set(),
      ['new', 'new', 'new', 'new', 'new'],
      5,
    )).toEqual([{ startSeg: 2, endSeg: 4 }])
  })

  it('creates separate ranges for disconnected segments', () => {
    expect(pendingMemoedSegmentRanges(
      new Set([1, 2, 5, 7, 8]),
      new Set(),
      Array(9).fill('new'),
      9,
    )).toEqual([
      { startSeg: 1, endSeg: 2 },
      { startSeg: 5, endSeg: 5 },
      { startSeg: 7, endSeg: 8 },
    ])
  })

  it('excludes completed, learned, non-memoed, and out-of-range segments', () => {
    expect(pendingMemoedSegmentRanges(
      new Set([0, 1, 2, 8]),
      new Set([1, 4]),
      ['new', 'weak', 'learned', 'new'],
      4,
    )).toEqual([{ startSeg: 0, endSeg: 0 }])
  })
})

describe('flawlessSegmentsFromRun', () => {
  it('completes each flawless segment independently in a mixed range', () => {
    const correctness = [
      ...Array(10).fill(true),
      ...Array(9).fill(true), false,
      ...Array(10).fill(true),
    ]
    expect(flawlessSegmentsFromRun(21, correctness)).toEqual([2, 4])
  })

  it('does not complete partial or non-aligned segments', () => {
    expect(flawlessSegmentsFromRun(1, Array(9).fill(true))).toEqual([])
    expect(flawlessSegmentsFromRun(2, Array(10).fill(true))).toEqual([])
  })
})

describe('flawlessSegmentsFromSessions', () => {
  const session = (overrides: Partial<PiSession>): PiSession => ({
    at: 1,
    anchor: 1,
    pairs: 10,
    correctPairs: 10,
    reach: 10,
    totalMs: 1000,
    pairsPerSec: 10,
    accuracy: 100,
    answerMode: 'typing',
    answerSize: 1,
    ...overrides,
  })

  it('migrates perfect aligned historical ranges but ignores imperfect runs', () => {
    const result = flawlessSegmentsFromSessions([
      session({ anchor: 11, pairs: 20, correctPairs: 20 }),
      session({ anchor: 31, pairs: 10, correctPairs: 9 }),
    ], 10)
    expect([...result]).toEqual([1, 2])
  })
})
