import type { Direction, AnswerMode } from '../types'
import { safeSet } from '../utils/storage'

export interface Attempt {
  at: number    // epoch ms when answered
  ok: boolean   // correct?
  ms: number    // recall-adjusted latency (typing time removed)
}

export interface ItemRecord {
  correct: number
  wrong: number
  latencies: number[]   // rolling last MAX_LATENCIES ms, outliers excluded
  hintCount: number     // all-time hints used for this item
  ease: number          // SM-2 ease factor, default 2.5
  intervalDays: number  // SM-2 interval
  dueAt: number         // epoch ms, 0 = new / due immediately
  lastSeenAt: number    // epoch ms, 0 = never seen
  reps: number          // consecutive successful reps
}

export const STORAGE_KEY = 'major-item-data'
export const MAX_LATENCIES = 10
export const OUTLIER_MS = 30_000
export const STALE_MS = 60_000  // answer discarded above this (idle / walked away)
export const DAY_MS = 86_400_000

// Per-answer history retention. 90 days ≈ 6 half-lives of a ~2-week forgetting
// curve (so nothing meaningfully weighted is dropped) and spans several reviews
// of a mature SM-2 item. HISTORY_HALFLIFE_DAYS is the decay used when weighting
// older answers/mistakes by age. HISTORY_MAX is a hard guardrail on array size.
export const HISTORY_RETENTION_DAYS = 90
export const HISTORY_HALFLIFE_DAYS = 14
export const HISTORY_MAX = 200

// Latency thresholds per answer mode
export const FAST_MS: Record<AnswerMode, number> = {
  'multiple-choice': 1200,
  'typing': 1500,
}
export const SLOW_MS: Record<AnswerMode, number> = {
  'multiple-choice': 2000,
  'typing': 2500,
}

const DEFAULTS: ItemRecord = {
  correct: 0,
  wrong: 0,
  latencies: [],
  hintCount: 0,
  ease: 2.5,
  intervalDays: 0,
  dueAt: 0,
  lastSeenAt: 0,
  reps: 0,
}

export function itemKey(dir: Direction, num: string): string {
  return `${dir}:${num}`
}

export function loadStore(): Record<string, ItemRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveStore(store: Record<string, ItemRecord>): void {
  safeSet(STORAGE_KEY, JSON.stringify(store))
}

export function getItem(store: Record<string, ItemRecord>, dir: Direction, num: string): ItemRecord {
  return store[itemKey(dir, num)] ?? { ...DEFAULTS }
}

export function setItem(
  store: Record<string, ItemRecord>,
  dir: Direction,
  num: string,
  item: ItemRecord,
): Record<string, ItemRecord> {
  return { ...store, [itemKey(dir, num)]: item }
}

export function medianMs(latencies: number[]): number | null {
  if (!latencies.length) return null
  const s = [...latencies].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function clearSchedules(): void {
  const store = loadStore()
  const cleared: Record<string, ItemRecord> = {}
  for (const [k, v] of Object.entries(store)) {
    cleared[k] = { ...v, ease: 2.5, intervalDays: 0, dueAt: 0, lastSeenAt: 0, reps: 0 }
  }
  saveStore(cleared)
}
