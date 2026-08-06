import { readJSON, safeSet } from '@/core/storage'
import { applySm2 } from '@/core/scoring/sm2'
import { DEFAULTS, type ItemRecord } from '@/core/scoring/itemStore'

// Per-segment SM-2 schedule for the Maintain tab. Keyed by 0-indexed segment,
// reusing `ItemRecord` so the repo's existing `applySm2` reschedules verbatim.
// Only the schedule fields (ease/intervalDays/dueAt/reps) drive maintenance; the
// correct/wrong counts are maintained too so per-segment stats stay meaningful.
// An unseen segment defaults to `{...DEFAULTS}` → `dueAt 0` → due right now.

const STORE_KEY = 'major-pi-maintain'

export type MaintainStore = Record<number, ItemRecord>

export function loadMaintainStore(): MaintainStore {
  return readJSON<MaintainStore>(STORE_KEY, {})
}

export function saveMaintainStore(store: MaintainStore): void {
  safeSet(STORE_KEY, JSON.stringify(store))
}

export function getSegSchedule(store: MaintainStore, seg: number): ItemRecord {
  return store[seg] ?? { ...DEFAULTS }
}

// Reschedule one recited segment. Grade is fixed binary (pass → 4, fail → 2)
// rather than `gradeAnswer`, since a segment try records only whole-segment
// pass/fail — there's no per-segment latency, and an `ms:0` would be mis-read
// as "fast". Loads, updates, and persists atomically.
export function rescheduleSegment(seg: number, ok: boolean): void {
  const store = loadMaintainStore()
  const record = getSegSchedule(store, seg)
  const next = applySm2(record, ok ? 4 : 2)
  next.correct = record.correct + (ok ? 1 : 0)
  next.wrong = record.wrong + (ok ? 0 : 1)
  saveMaintainStore({ ...store, [seg]: next })
}
