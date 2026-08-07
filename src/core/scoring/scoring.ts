import type { AnswerMode } from '@/core/types'

// Central scoring / latency configuration. Kept dependency-free (types only) so
// every scorer — sm2, typingSpeed, roundScheduler, numberStats, quiz — and the
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

// Effective "fast enough" recall bar (ms) for a given user tolerance factor. 1 =
// strict (must be green/fast); higher lets slower answers still count as mastered.
export function masteryFastMs(factor: number): number {
  return RECALL_FAST_MS * factor
}

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

// ── Per-session round scheduler (roundScheduler.ts) ─────────────────────────────
// Constrained weighted randomness: selectionWeight = need × spacing × balance,
// with graded mastery advanced only by spaced (and fast, un-hinted) recalls. All
// numbers here are tunable defaults; makeRoundConfig derives the batch-relative
// values (minimum gap, target intervals) from batchSize. Validated by simulation.

// Graded mastery: 0 unlearned · 1 learning · 2 mastered · 3 confirmed.
export const MASTERY_MAX_LEVEL = 3
export const MASTERED_LEVEL = 2 // level at/above which a question counts as mastered

// Need weight by mastery level at the *baseline* unmastered-focus setting (0.5).
// A deliberately moderate advantage (not 10:1) so the last unmastered item isn't
// hammered. Scaled by the user's "unmastered focus" setting in makeRoundConfig.
export const ROUND_NEED_BASE: [number, number, number, number] = [2.0, 1.5, 1.0, 0.7]
export const ROUND_NEED_UNSEEN = 2.2 // an unseen (timesSeen 0) question's need weight at baseline

// Target review interval per mastery level, as a fraction of batch size. Doubles
// as the spacing (in questions) required to advance OUT of that level.
export const ROUND_INTERVAL_FACTORS = [0.0, 0.25, 0.75, 1.5]
export const ROUND_INTERVAL_MIN = 2
export const ROUND_INTERVAL_MAX = 75

// Hard anti-repeat window as a fraction of batch size (clamped 1..5).
export const ROUND_MIN_GAP_FACTOR = 0.15
export const ROUND_MIN_GAP_MIN = 1
export const ROUND_MIN_GAP_MAX = 5

// A wrong answer halves the question's target interval (floored at the minimum).
export const ROUND_INCORRECT_INTERVAL_FACTOR = 0.5
