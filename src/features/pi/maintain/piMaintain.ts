import { DAY_MS } from '@/core/scoring/itemStore'
import { PAIRS_PER_SEGMENT, type PiSegmentStatus } from '@/features/pi/shared/piStats'
import { getSegSchedule, type MaintainStore } from '@/features/pi/maintain/piMaintainStore'

// Batch assembly for the Maintain tab. Selection is *due-driven* (most-overdue
// first), cycling through learned material to keep it alive against the
// forgetting curve — not a weakest-spot ranker (Recite's amber dots do that).
// Everything here is a pure function of the statuses + the SM-2 schedule store.

export interface MaintainBatch {
  startSeg: number
  endSeg: number
  segs: number[]
  dueCount: number          // segments due now (dueAt <= now)
  meanOverdueDays: number   // mean (now - dueAt) in days across the batch
  nextDueMs: number         // ms until the soonest not-yet-due segment (Infinity if all due)
}

export interface MaintenanceBatches {
  due: MaintainBatch[]
  upcoming: MaintainBatch[]
}

// A segment is eligible for maintenance once it's ever been recited (amber/weak
// or emerald/learned). New/gray segments (memorised but not recited) are
// excluded and act as hard boundaries that break a contiguous run.
function isEligible(status: PiSegmentStatus | undefined): boolean {
  return status === 'weak' || status === 'learned'
}

// The per-segment slicing of a completed run into whole-segment pass/fail
// results. Factored out so both `recordSegmentTries` (the try log) and the
// Maintain tab (SM-2 rescheduling) agree on which segments a run covered.
// `correctness[i]` is the outcome of the run's i-th pair (π position anchor+i);
// only segments whose full PAIRS_PER_SEGMENT span sits inside the run appear.
export function segmentResultsFromRun(
  anchor: number,
  correctness: boolean[],
): { seg: number; ok: boolean }[] {
  if (correctness.length === 0) return []
  const lastPos = anchor + correctness.length - 1
  const firstSeg = Math.ceil((anchor - 1) / PAIRS_PER_SEGMENT)
  const lastSeg = Math.floor((lastPos - PAIRS_PER_SEGMENT) / PAIRS_PER_SEGMENT)
  const results: { seg: number; ok: boolean }[] = []
  for (let seg = firstSeg; seg <= lastSeg; seg++) {
    const start = seg * PAIRS_PER_SEGMENT + 1 - anchor
    const ok = correctness.slice(start, start + PAIRS_PER_SEGMENT).every(Boolean)
    results.push({ seg, ok })
  }
  return results
}

function summarizeBatch(segs: number[], store: MaintainStore, now: number): MaintainBatch {
  let dueCount = 0
  let overdueSum = 0
  let nextDueMs = Infinity
  for (const seg of segs) {
    const { dueAt, lastSeenAt } = getSegSchedule(store, seg)
    // A never-maintained segment (recited in Recite but not yet reviewed here)
    // carries the DEFAULTS sentinel `dueAt 0 / lastSeenAt 0`. It's due now, but
    // its "overdue" age is meaningless — clamp to 0 rather than measuring from
    // the Unix epoch (which showed absurd ~20672d values and corrupted the sort).
    overdueSum += lastSeenAt === 0 ? 0 : (now - dueAt) / DAY_MS
    if (dueAt <= now) dueCount++
    else nextDueMs = Math.min(nextDueMs, dueAt - now)
  }
  return {
    startSeg: segs[0],
    endSeg: segs[segs.length - 1],
    segs,
    dueCount,
    meanOverdueDays: overdueSum / segs.length,
    nextDueMs,
  }
}

// Build the ranked maintenance batches:
//   1. Eligible = segs < maxSegments with status weak | learned.
//   2. Split eligible into maximal contiguous runs (a gap breaks the run).
//   3. Tile each run into consecutive chunks of <= batchSegs from the run start.
//   4. Per batch, roll up dueCount / meanOverdueDays / nextDueMs (unseen dueAt 0
//      → maximally overdue → due now).
//   5. `due` = batches with a due segment, most-overdue first (tie: earliest π
//      position). `upcoming` = the rest, soonest-due first.
export function buildMaintenanceBatches(
  statuses: PiSegmentStatus[],
  store: MaintainStore,
  batchSegs: number,
  maxSegments: number,
  now: number = Date.now(),
): MaintenanceBatches {
  const size = Math.max(1, batchSegs)

  // 1 + 2: maximal contiguous runs of eligible segments.
  const runs: number[][] = []
  let run: number[] = []
  for (let seg = 0; seg < maxSegments; seg++) {
    if (isEligible(statuses[seg])) {
      run.push(seg)
    } else if (run.length) {
      runs.push(run)
      run = []
    }
  }
  if (run.length) runs.push(run)

  // 3: tile each run into consecutive chunks of <= size.
  const batches: MaintainBatch[] = []
  for (const r of runs) {
    for (let i = 0; i < r.length; i += size) {
      batches.push(summarizeBatch(r.slice(i, i + size), store, now))
    }
  }

  // 5: partition + order.
  const due = batches
    .filter(b => b.dueCount > 0)
    .sort((a, b) =>
      b.meanOverdueDays - a.meanOverdueDays || a.startSeg - b.startSeg)
  const upcoming = batches
    .filter(b => b.dueCount === 0)
    .sort((a, b) => a.nextDueMs - b.nextDueMs || a.startSeg - b.startSeg)

  return { due, upcoming }
}
