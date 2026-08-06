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
  // Build attempts for segment 0 (positions 1..10). `outcomes[i]` is the ordered
  // list of ok/wrong for pair i+1; a missing entry means the pair was untouched.
  function seg0(outcomes: Array<boolean[] | undefined>): A[] {
    const rows: A[] = []
    let t = 0
    outcomes.forEach((oks, i) => {
      oks?.forEach(ok => rows.push({ key: `pi:${i + 1}`, at: ++t, ok, ms: 100 }))
    })
    return rows
  }
  const status = async (rows: A[]) => (await piSegmentStatuses(10))[0]

  beforeEach(() => mockAttempts.mockReset())

  it('is new when no pair was touched', async () => {
    mockAttempts.mockResolvedValue([])
    expect(await status([])).toBe('new')
  })

  it('turns learned on a first flawless pass (single correct per pair)', async () => {
    mockAttempts.mockResolvedValue(seg0(Array(10).fill([true])))
    expect(await status(seg0(Array(10).fill([true])))).toBe('learned')
  })

  it('is weak when some pairs are still untouched', async () => {
    const outcomes = Array<boolean[] | undefined>(10).fill([true])
    outcomes[5] = undefined
    mockAttempts.mockResolvedValue(seg0(outcomes))
    expect(await status(seg0(outcomes))).toBe('weak')
  })

  it('demotes to weak on a fresh miss', async () => {
    const outcomes = Array<boolean[] | undefined>(10).fill([true])
    outcomes[3] = [true, false] // most recent answer wrong
    mockAttempts.mockResolvedValue(seg0(outcomes))
    expect(await status(seg0(outcomes))).toBe('weak')
  })

  it('regains learned only after two correct re-answers (not one)', async () => {
    const oneRedo = Array<boolean[] | undefined>(10).fill([true])
    oneRedo[3] = [true, false, true] // one correct after the miss — still weak
    mockAttempts.mockResolvedValue(seg0(oneRedo))
    expect(await status(seg0(oneRedo))).toBe('weak')

    const twoRedo = Array<boolean[] | undefined>(10).fill([true])
    twoRedo[3] = [true, false, true, true] // two correct after the miss — clean
    mockAttempts.mockResolvedValue(seg0(twoRedo))
    expect(await status(seg0(twoRedo))).toBe('learned')
  })
})

describe('describeSegment (status dot tooltip)', () => {
  const s = (p: Partial<PiSegmentSummary>): PiSegmentSummary =>
    ({ status: 'new', touched: 0, clean: 0, correct: 0, wrong: 0, ...p })

  it('distinguishes memorised-in-study from untouched for new segments', () => {
    expect(describeSegment(s({ status: 'new' }), true)).toBe('memorised in study — not yet recited')
    expect(describeSegment(s({ status: 'new' }), false)).toBe('not yet recited')
  })

  it('reports all pairs solid and accuracy when learned', () => {
    const sum = s({ status: 'learned', touched: 10, clean: 10, correct: 19, wrong: 1 })
    expect(describeSegment(sum, false)).toBe('learned · all 10 pairs solid · 20 answers, 95% correct')
  })

  it('reports the solid count and accuracy when practising', () => {
    const sum = s({ status: 'weak', touched: 8, clean: 6, correct: 9, wrong: 3 })
    expect(describeSegment(sum, false)).toBe('practising · 6/10 pairs solid · 12 answers, 75% correct')
  })

  it('singularises a lone answer', () => {
    const sum = s({ status: 'weak', touched: 1, clean: 1, correct: 1, wrong: 0 })
    expect(describeSegment(sum, false)).toBe('practising · 1/10 pairs solid · 1 answer, 100% correct')
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
