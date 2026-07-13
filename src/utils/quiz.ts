import { loadStore, itemKey, medianMs } from '../data/itemStore'
import { RECALL_SLOW_MS } from '../data/typingSpeed'
import type { Direction } from '../types'

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

// Weighted spaced-repetition pick for one direction. Weight rises with wrong
// rate, SM-2 ease penalty, and slow median recall; unseen items get a flat 1.5;
// already-mastered-this-round items are de-prioritised.
const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3
export function pickWeighted(dir: Direction, available: string[], masteredSet: Set<string>): string {
  if (available.length === 1) return available[0]
  const store = loadStore()
  const weights = available.map(num => {
    const item = store[itemKey(dir, num)]
    const base = (!item || item.lastSeenAt === 0)
      ? 1.5
      : (() => {
          const total = item.correct + item.wrong
          const wrongRate = total > 0 ? item.wrong / total : 0
          const easePenalty = Math.max(0, (DEFAULT_EASE - (item.ease ?? DEFAULT_EASE)) / (DEFAULT_EASE - MIN_EASE))
          const median = medianMs(item.latencies)
          const slow = median !== null && median >= RECALL_SLOW_MS ? 0.5 : 0
          return 1 + wrongRate * 3 + easePenalty * 1 + slow
        })()
    return masteredSet.has(num) ? base * 0.25 : base
  })
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * sum
  for (let i = 0; i < available.length; i++) {
    r -= weights[i]
    if (r <= 0) return available[i]
  }
  return available[available.length - 1]
}
