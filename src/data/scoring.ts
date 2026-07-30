import type { AnswerMode } from '../types'

// Central scoring / latency configuration. Kept dependency-free (types only) so
// every scorer — sm2, typingSpeed, roundMastery, numberStats, quiz — and the
// persistence layer can import from one place instead of the store owning them.

// Latency thresholds per answer mode (ms): at/under FAST = fast, at/over SLOW = slow.
export const FAST_MS: Record<AnswerMode, number> = {
  'multiple-choice': 1200,
  'typing': 1500,
}
export const SLOW_MS: Record<AnswerMode, number> = {
  'multiple-choice': 2000,
  'typing': 2500,
}

// Recall-time thresholds (typing time removed) — the multiple-choice scale, which
// is pure recall with no typing. All adjusted latencies are judged against these.
export const RECALL_FAST_MS = FAST_MS['multiple-choice']
export const RECALL_SLOW_MS = SLOW_MS['multiple-choice']

// Answer-quality gates (ms).
export const OUTLIER_MS = 30_000  // latency above this is excluded from rolling stats
export const STALE_MS = 60_000    // answer discarded (idle / walked away)

// SM-2 ease bounds.
export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3

// Rolling per-item latency window kept in the item record.
export const MAX_LATENCIES = 10

// Decay half-life (days) for age-weighting older answers/mistakes.
export const HISTORY_HALFLIFE_DAYS = 14
