import { loadStore, getItem } from '@/core/scoring/itemStore'
import { itemWeakness } from '@/core/scoring/numberStats'
import type { Direction } from '@/core/types'

// Shared quiz helpers used across the drills.

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Distractor numbers for a multiple-choice question. Prefers same-decade
// numbers (same tens digit) first so wrong options are plausibly close.
export function pickDistractors(target: string, allNums: string[], count = 2): string[] {
  const sameDecade = shuffle(allNums.filter(n => n[0] === target[0] && n !== target))
  const others = shuffle(allNums.filter(n => n[0] !== target[0] && n !== target))
  return [...sameDecade, ...others].slice(0, count)
}

// Multiple-choice option sets for the two number↔word directions. Both put the
// correct answer in with same-decade-biased distractors, then shuffle.
export function buildEncOptions(number: string, words: Record<string, string>): string[] {
  const dist = pickDistractors(number, Object.keys(words))
  return shuffle([words[number], ...dist.map(n => words[n])])
}

export function buildDecOptions(number: string, words: Record<string, string>): string[] {
  const dist = pickDistractors(number, Object.keys(words))
  return shuffle([number, ...dist])
}

// Default fraction of draws that target the not-yet-mastered pool once a round is
// a mix of mastered and unmastered items (overridable per-call from the user
// setting). The split is by *pool*, not by item count, so the last few unmastered
// items keep surfacing even when most of the set is already mastered.
export const DEFAULT_UNMASTERED_SHARE = 0.5

// Weighted draw within a single pool of numbers. Draw weight scales with the
// shared per-number weakness score (see numberStats.itemWeakness); unseen items
// get a flat baseline.
const WEAKNESS_GAIN = 4  // maps weakness 0..1 → weight 1..5
function weightedPick(dir: Direction, store: ReturnType<typeof loadStore>, nums: string[]): string {
  if (nums.length === 1) return nums[0]
  const weights = nums.map(num => {
    const item = getItem(store, dir, num)
    return item.lastSeenAt === 0 ? 1.5 : 1 + itemWeakness(item) * WEAKNESS_GAIN
  })
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * sum
  for (let i = 0; i < nums.length; i++) {
    r -= weights[i]
    if (r <= 0) return nums[i]
  }
  return nums[nums.length - 1]
}

// Spaced-repetition pick for one direction, split into two fixed-ratio pools:
// with probability `unmasteredShare` the draw targets a not-yet-mastered item,
// otherwise an already-mastered one (a refresher). Because the ratio is fixed
// regardless of how many items sit in each pool, a set that is "8 of 10 mastered"
// still surfaces the remaining two on ~`unmasteredShare` of draws instead of
// drowning them among the mastered majority. Falls back to a single weighted pool
// when everything (or nothing) is mastered. Callers own "don't repeat the last
// item" by pre-filtering `available`.
export function pickWeighted(
  dir: Direction,
  available: string[],
  masteredSet: Set<string>,
  unmasteredShare: number = DEFAULT_UNMASTERED_SHARE,
): string {
  if (available.length === 1) return available[0]
  const store = loadStore()
  const unmastered = available.filter(n => !masteredSet.has(n))
  const mastered = available.filter(n => masteredSet.has(n))
  if (unmastered.length === 0) return weightedPick(dir, store, mastered)
  if (mastered.length === 0) return weightedPick(dir, store, unmastered)
  const pool = Math.random() < unmasteredShare ? unmastered : mastered
  return weightedPick(dir, store, pool)
}
