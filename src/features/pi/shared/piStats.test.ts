import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bestFromStartReach,
  describeSegment,
  fromStartRecordRun,
  fullReciteSessions,
  isFromStartRecord,
  isFullRecite,
  piSegmentStatuses,
  practiceSessions,
  type PiSegmentSummary,
  type PiSession,
} from '@/features/pi/shared/piStats'
import { getAllAttempts } from '@/core/scoring/attemptStore'

vi.mock('@/core/scoring/attemptStore', () => ({
  getAllAttempts: vi.fn(),
}))
const mockAttempts = vi.mocked(getAllAttempts)

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

describe('piSegmentStatuses (per-segment progress dots)', () => {
  type A = { key: string; at: number; ok: boolean; ms: number }
  // Build segment-0 "try" rows in chronological order — `oks[i]` is whether the
  // i-th recite run over the whole segment was fully correct.
  function seg0(oks: boolean[]): A[] {
    return oks.map((ok, i) => ({ key: 'piseg:0', at: i + 1, ok, ms: 0 }))
  }
  const status = async (rows: A[]) => {
    mockAttempts.mockResolvedValue(rows)
    return (await piSegmentStatuses(10))[0]
  }

  beforeEach(() => mockAttempts.mockReset())

  it('is new when the segment was never fully recited', async () => {
    expect(await status([])).toBe('new')
  })

  it('is weak after a single correct try (needs two for green)', async () => {
    expect(await status(seg0([true]))).toBe('weak')
  })

  it('turns learned when the last two tries were both correct', async () => {
    expect(await status(seg0([true, true]))).toBe('learned')
  })

  it('stays learned on recency — an old miss followed by two clean tries', async () => {
    expect(await status(seg0([false, true, true]))).toBe('learned')
  })

  it('demotes to weak on a fresh miss', async () => {
    expect(await status(seg0([true, true, false]))).toBe('weak')
  })

  it('regains learned only after two correct re-tries (not one)', async () => {
    expect(await status(seg0([true, true, false, true]))).toBe('weak')
    expect(await status(seg0([true, true, false, true, true]))).toBe('learned')
  })
})

describe('describeSegment (status dot tooltip)', () => {
  const s = (p: Partial<PiSegmentSummary>): PiSegmentSummary =>
    ({ status: 'new', recentClean: 0, tries: 0, correctPct: 0, ...p })

  it('distinguishes memorised-in-study from untouched for new segments', () => {
    expect(describeSegment(s({ status: 'new' }), true)).toBe('memorised in study — not yet recited')
    expect(describeSegment(s({ status: 'new' }), false)).toBe('not yet recited')
  })

  it('reports recent tries and decayed accuracy when learned', () => {
    const sum = s({ status: 'learned', recentClean: 2, tries: 6, correctPct: 83 })
    expect(describeSegment(sum, false)).toBe('learned · 2/2 recent tries · 6 tries, 83% correct')
  })

  it('reports the recent-clean count and accuracy when practising', () => {
    const sum = s({ status: 'weak', recentClean: 1, tries: 4, correctPct: 75 })
    expect(describeSegment(sum, false)).toBe('practising · 1/2 recent tries · 4 tries, 75% correct')
  })

  it('singularises a lone try', () => {
    const sum = s({ status: 'weak', recentClean: 1, tries: 1, correctPct: 100 })
    expect(describeSegment(sum, false)).toBe('practising · 1/2 recent tries · 1 try, 100% correct')
  })
})

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
