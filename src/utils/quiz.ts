import { loadStore, getItem } from '../data/itemStore'
import { itemWeakness } from './numberStats'
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

// Weighted spaced-repetition pick for one direction. Draw weight scales with the
// shared per-number weakness score (see numberStats.itemWeakness); unseen items
// get a flat baseline; already-mastered-this-round items are de-prioritised.
const WEAKNESS_GAIN = 4  // maps weakness 0..1 → weight 1..5
export function pickWeighted(dir: Direction, available: string[], masteredSet: Set<string>): string {
  if (available.length === 1) return available[0]
  const store = loadStore()
  const weights = available.map(num => {
    const item = getItem(store, dir, num)
    const base = item.lastSeenAt === 0 ? 1.5 : 1 + itemWeakness(item) * WEAKNESS_GAIN
    return masteredSet.has(num) ? base * 0.25 : base
  })
  // Guarantee unmastered items get ≥ TARGET of all draws when the pool is mixed.
  const hasUnmastered = available.some(n => !masteredSet.has(n))
  if (masteredSet.size > 0 && hasUnmastered) {
    const unmasteredTotal = weights.reduce((s, w, i) => masteredSet.has(available[i]) ? s : s + w, 0)
    const masteredTotal   = weights.reduce((s, w, i) => masteredSet.has(available[i]) ? s + w : s, 0)
    const TARGET = 0.75
    const maxMastered = unmasteredTotal * (TARGET / (1 - TARGET))
    if (masteredTotal > maxMastered) {
      const scale = maxMastered / masteredTotal
      for (let i = 0; i < available.length; i++) {
        if (masteredSet.has(available[i])) weights[i] *= scale
      }
    }
  }
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * sum
  for (let i = 0; i < available.length; i++) {
    r -= weights[i]
    if (r <= 0) return available[i]
  }
  return available[available.length - 1]
}
