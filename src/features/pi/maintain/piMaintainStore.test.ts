import { beforeEach, describe, it, expect } from 'vitest'
import { DAY_MS } from '@/core/scoring/itemStore'
import {
  getSegSchedule, loadMaintainStore, rescheduleSegment, seedSegmentSchedule,
} from '@/features/pi/maintain/piMaintainStore'

// core/storage talks to localStorage; the node test env has none, so stub a
// fresh in-memory one before each test.
beforeEach(() => {
  const mem = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, String(v)) },
    removeItem: (k: string) => { mem.delete(k) },
    clear: () => mem.clear(),
    key: () => null,
    get length() { return mem.size },
  } as Storage
})

describe('getSegSchedule', () => {
  it('defaults an unseen segment to due-now (dueAt 0)', () => {
    expect(getSegSchedule({}, 7).dueAt).toBe(0)
  })
})

describe('rescheduleSegment', () => {
  it('a pass advances the interval and pushes dueAt into the future', () => {
    rescheduleSegment(3, true)
    const rec = loadMaintainStore()[3]
    expect(rec.reps).toBe(1)
    expect(rec.intervalDays).toBe(1)
    expect(rec.correct).toBe(1)
    expect(rec.dueAt).toBeGreaterThan(Date.now())
  })

  it('successive passes expand the interval (1 → 3 days)', () => {
    rescheduleSegment(0, true)
    rescheduleSegment(0, true)
    const rec = loadMaintainStore()[0]
    expect(rec.reps).toBe(2)
    expect(rec.intervalDays).toBe(3)
    expect(rec.dueAt).toBeGreaterThan(Date.now() + 2 * DAY_MS)
  })

  it('a fail resets reps/interval and sets dueAt to ~now', () => {
    rescheduleSegment(1, true)   // build up a rep first
    rescheduleSegment(1, false)  // then miss
    const rec = loadMaintainStore()[1]
    expect(rec.reps).toBe(0)
    expect(rec.intervalDays).toBe(0)
    expect(rec.wrong).toBe(1)
    expect(Math.abs(rec.dueAt - Date.now())).toBeLessThan(5000)
  })

  it('an unseen segment reschedules from defaults (due now → 1 day out)', () => {
    rescheduleSegment(9, true)
    const rec = loadMaintainStore()[9]
    expect(rec.reps).toBe(1)
    expect(rec.dueAt).toBeGreaterThan(Date.now())
  })
})

describe('seedSegmentSchedule', () => {
  it('seeds a fresh segment with the first SM-2 interval (~1 day out, not due now)', () => {
    seedSegmentSchedule(4)
    const rec = loadMaintainStore()[4]
    expect(rec.reps).toBe(1)
    expect(rec.intervalDays).toBe(1)
    expect(rec.correct).toBe(1)
    expect(rec.dueAt).toBeGreaterThan(Date.now())
  })

  it('is a no-op once the segment already has a schedule (re-reciting must not advance it)', () => {
    seedSegmentSchedule(4)
    const first = loadMaintainStore()[4]
    seedSegmentSchedule(4)
    seedSegmentSchedule(4)
    const after = loadMaintainStore()[4]
    expect(after).toEqual(first)   // interval never ballooned past the first day
  })

  it('does not touch a segment already advanced via a maintenance run', () => {
    rescheduleSegment(2, true)     // reps 1 (interval 1)
    rescheduleSegment(2, true)     // reps 2 (interval 3)
    seedSegmentSchedule(2)         // should NOT reset it back to reps 1
    expect(loadMaintainStore()[2].reps).toBe(2)
  })
})
