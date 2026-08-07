import { REFRESH_BASE_GAP, REFRESH_MAX } from '@/core/scoring/scoring'

// Per-session refresh scheduler — ephemeral round state (like roundStats), never
// persisted. Once an item masters we schedule a small number of spaced refreshers
// on an expanding interval, then retire it, so already-known items get a couple of
// self-limiting reviews instead of being hammered or starved.
//
// `dueAt` is a *question index* (a counter the drill bumps once per recorded
// answer), not wall-clock time. `stage` is how many refreshers have been served
// (0 = mastered but not yet refreshed).
export interface RefreshEntry {
  stage: number
  dueAt: number
}
export type RefreshState = Record<string, RefreshEntry>

// The mastered items that should currently sit in the refresher pool: not retired
// (stage < REFRESH_MAX) and due now (dueAt <= index). Everything else that is
// mastered-but-not-due is dropped from `available` so pickWeighted's mastered pool
// contains exactly the due refreshers.
export function eligible(
  available: string[],
  masteredSet: Set<string>,
  state: RefreshState,
  index: number,
): string[] {
  return available.filter(num => {
    if (!masteredSet.has(num)) return true // unmastered items always eligible
    const entry = state[num]
    if (!entry) return true // mastered but not yet scheduled → keep this draw
    if (entry.stage >= REFRESH_MAX) return false // retired
    return entry.dueAt <= index // due now?
  })
}

// Record that `num` was just served at `index`, given its mastery before and after
// the answer. Returns the next state (pure reducer):
//  - first mastery (was unmastered, now mastered): stage 0, first refresher one
//    REFRESH_BASE_GAP out.
//  - refresh of an already-mastered item: advance the stage and push the next
//    refresher out by ×2 per stage.
// Non-mastered serves leave the state untouched.
export function noteServed(
  state: RefreshState,
  num: string,
  index: number,
  wasMastered: boolean,
  isNowMastered: boolean,
): RefreshState {
  if (!isNowMastered) return state
  if (!wasMastered) {
    return { ...state, [num]: { stage: 0, dueAt: index + REFRESH_BASE_GAP } }
  }
  // Already mastered and served again → this was a refresher.
  const stage = (state[num]?.stage ?? 0) + 1
  return { ...state, [num]: { stage, dueAt: index + REFRESH_BASE_GAP * 2 ** stage } }
}
