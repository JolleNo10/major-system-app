import { describe, expect, it } from 'vitest'
import {
  bestFromStartPairsPerSec,
  bestFromStartReach,
  fromStartRecordRun,
  fullReciteSessions,
  isFromStartRecord,
  isFullRecite,
  practiceSessions,
  type PiSession,
} from '@/features/pi/shared/piStats'

// Minimal PiSession factory — only the fields these helpers read matter.
function session(partial: Partial<PiSession>): PiSession {
  return {
    at: 0,
    anchor: 1,
    pairs: 10,
    correctPairs: 10,
    reach: 10,
    totalMs: 1000,
    pairsPerSec: 1,
    accuracy: 100,
    answerMode: 'typing',
    answerSize: 1,
    ...partial,
  }
}

describe('full recite vs practice classification', () => {
  it('treats only anchor === 1 as a full recite', () => {
    expect(isFullRecite(session({ anchor: 1 }))).toBe(true)
    expect(isFullRecite(session({ anchor: 2 }))).toBe(false)
    expect(isFullRecite(session({ anchor: 51 }))).toBe(false)
  })

  it('partitions sessions into full and practice tracks', () => {
    const runs = [
      session({ at: 1, anchor: 1 }),
      session({ at: 2, anchor: 11 }),
      session({ at: 3, anchor: 1 }),
      session({ at: 4, anchor: 2 }),
    ]
    expect(fullReciteSessions(runs).map(s => s.at)).toEqual([1, 3])
    expect(practiceSessions(runs).map(s => s.at)).toEqual([2, 4])
  })
})

describe('fromStartRecordRun', () => {
  it('returns null when there are no full recites', () => {
    expect(fromStartRecordRun([session({ anchor: 11, reach: 50 })])).toBeNull()
  })

  it('picks the full recite with the greatest reach', () => {
    const runs = [
      session({ at: 1, anchor: 1, reach: 10 }),
      session({ at: 2, anchor: 1, reach: 40 }),
      session({ at: 3, anchor: 11, reach: 99 }), // practice, ignored
    ]
    expect(fromStartRecordRun(runs)?.at).toBe(2)
  })

  it('breaks reach ties in favour of the earliest run', () => {
    const runs = [
      session({ at: 200, anchor: 1, reach: 30 }),
      session({ at: 100, anchor: 1, reach: 30 }),
    ]
    expect(fromStartRecordRun(runs)?.at).toBe(100)
  })
})

describe('bestFromStartPairsPerSec', () => {
  it('considers full-recite runs only', () => {
    const runs = [
      session({ anchor: 1, pairsPerSec: 2 }),
      session({ anchor: 11, pairsPerSec: 9 }), // faster, but practice
      session({ anchor: 1, pairsPerSec: 3.5 }),
    ]
    expect(bestFromStartPairsPerSec(runs)).toBe(3.5)
  })

  it('is 0 when there are no full recites', () => {
    expect(bestFromStartPairsPerSec([session({ anchor: 11, pairsPerSec: 9 })])).toBe(0)
  })
})

describe('isFromStartRecord', () => {
  it('is true only when strictly greater than the standing from-π#1 best', () => {
    const prior = [session({ anchor: 1, reach: 40 })]
    expect(isFromStartRecord(prior, 41)).toBe(true)
    expect(isFromStartRecord(prior, 40)).toBe(false) // tie is not a record
    expect(isFromStartRecord(prior, 39)).toBe(false)
  })

  it('counts the first full recite as a record but never a zero reach', () => {
    expect(isFromStartRecord([], 1)).toBe(true)
    expect(isFromStartRecord([], 0)).toBe(false)
  })

  it('ignores practice runs when measuring the standing best', () => {
    const prior = [session({ anchor: 11, reach: 99 })]
    expect(bestFromStartReach(prior)).toBe(0)
    expect(isFromStartRecord(prior, 5)).toBe(true)
  })
})
