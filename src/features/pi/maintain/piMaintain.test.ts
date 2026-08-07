import { describe, it, expect } from 'vitest'
import { DAY_MS, DEFAULTS, type ItemRecord } from '@/core/scoring/itemStore'
import type { PiSegmentStatus } from '@/features/pi/shared/piStats'
import { buildMaintenanceBatches, segmentResultsFromRun } from '@/features/pi/maintain/piMaintain'
import type { MaintainStore } from '@/features/pi/maintain/piMaintainStore'

const NOW = 1_700_000_000_000

function rec(dueAt: number): ItemRecord {
  return { ...DEFAULTS, dueAt }
}

describe('segmentResultsFromRun', () => {
  it('returns nothing for an empty run', () => {
    expect(segmentResultsFromRun(1, [])).toEqual([])
  })

  it('marks a fully-correct single segment as ok', () => {
    expect(segmentResultsFromRun(1, Array(10).fill(true))).toEqual([{ seg: 0, ok: true }])
  })

  it('fails a segment when any pair in it is wrong', () => {
    const correctness = [...Array(10).fill(true), ...Array(10).fill(true)]
    correctness[15] = false // a pair inside segment 1
    expect(segmentResultsFromRun(1, correctness)).toEqual([
      { seg: 0, ok: true },
      { seg: 1, ok: false },
    ])
  })

  it('only counts segments whose full 10-pair span sits inside the run', () => {
    // 15 pairs from π #1 → segment 0 is whole, segment 1 is partial (dropped).
    expect(segmentResultsFromRun(1, Array(15).fill(true))).toEqual([{ seg: 0, ok: true }])
  })

  it('handles a run that starts mid-π', () => {
    // anchor 11 = first pair of segment 1.
    expect(segmentResultsFromRun(11, Array(10).fill(true))).toEqual([{ seg: 1, ok: true }])
  })
})

describe('buildMaintenanceBatches', () => {
  const build = (
    statuses: PiSegmentStatus[],
    store: MaintainStore,
    batchSegs: number,
    maxSegments: number,
  ) => buildMaintenanceBatches(statuses, store, batchSegs, maxSegments, NOW)

  it('splits eligible segments into maximal contiguous runs (a gap breaks a run)', () => {
    const statuses: PiSegmentStatus[] = ['weak', 'weak', 'new', 'learned', 'learned']
    const { due } = build(statuses, {}, 10, 5)
    expect(due.map(b => b.segs)).toEqual([[0, 1], [3, 4]])
  })

  it('tiles a run into consecutive chunks of <= batchSegs, partial final chunk kept', () => {
    const statuses: PiSegmentStatus[] = Array(5).fill('learned')
    const { due } = build(statuses, {}, 2, 5)
    expect(due.map(b => b.segs)).toEqual([[0, 1], [2, 3], [4]])
  })

  it('treats an unseen segment (no schedule) as due now', () => {
    const { due, upcoming } = build(['weak'], {}, 5, 1)
    expect(due).toHaveLength(1)
    expect(upcoming).toHaveLength(0)
    expect(due[0].dueCount).toBe(1)
  })

  it('reports 0d overdue for a never-maintained segment (not epoch age)', () => {
    // dueAt 0 sentinel must not be measured from the Unix epoch.
    const { due } = build(['learned'], {}, 5, 1)
    expect(due[0].meanOverdueDays).toBe(0)
  })

  it('sorts genuinely-overdue batches above never-maintained ones', () => {
    const statuses: PiSegmentStatus[] = ['learned', 'new', 'learned']
    const store: MaintainStore = { 0: rec(NOW - 2 * DAY_MS) } // seg 2 unseen
    const { due } = build(statuses, store, 1, 3)
    expect(due.map(b => b.startSeg)).toEqual([0, 2])
  })

  it('excludes new/gray segments (never recited) entirely', () => {
    const { due, upcoming } = build(['new', 'new'], {}, 5, 2)
    expect(due).toHaveLength(0)
    expect(upcoming).toHaveLength(0)
  })

  it('partitions into due vs upcoming and orders each correctly', () => {
    const statuses: PiSegmentStatus[] = ['learned', 'learned', 'new', 'learned', 'learned']
    const store: MaintainStore = {
      0: rec(NOW - 5 * DAY_MS), // most overdue
      1: rec(NOW - 1 * DAY_MS), // less overdue
      3: rec(NOW + 2 * DAY_MS), // upcoming, later
      4: rec(NOW + 1 * DAY_MS), // upcoming, sooner
    }
    const { due, upcoming } = build(statuses, store, 1, 5)
    // due: most-overdue first
    expect(due.map(b => b.startSeg)).toEqual([0, 1])
    // upcoming: soonest-due first
    expect(upcoming.map(b => b.startSeg)).toEqual([4, 3])
  })

  it('breaks a due tie by earliest π position', () => {
    const statuses: PiSegmentStatus[] = ['learned', 'learned']
    const store: MaintainStore = {
      0: rec(NOW - 3 * DAY_MS),
      1: rec(NOW - 3 * DAY_MS),
    }
    const { due } = build(statuses, store, 1, 2)
    expect(due.map(b => b.startSeg)).toEqual([0, 1])
  })

  it('reports dueCount and nextDueMs per batch', () => {
    const statuses: PiSegmentStatus[] = ['learned', 'learned']
    const store: MaintainStore = {
      0: rec(NOW - DAY_MS),      // due
      1: rec(NOW + 3 * DAY_MS),  // not due
    }
    const { due } = build(statuses, store, 2, 2)
    expect(due).toHaveLength(1)
    expect(due[0].dueCount).toBe(1)
    expect(due[0].nextDueMs).toBe(3 * DAY_MS)
  })
})
