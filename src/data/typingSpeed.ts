import type { AnswerMode } from '../types'
import { FAST_MS, SLOW_MS } from './itemStore'
import { safeSet } from '../utils/storage'

// Typing speed compensation.
//
// In typing mode a raw answer time = recall time + time spent physically typing,
// and longer words take longer to type. We estimate the user's typing speed
// (ms per character) and subtract the expected typing time, leaving the recall
// time — which is what we actually want to judge fast/slow by. Multiple-choice
// involves no typing, so it is never adjusted.

// Separate estimates for word typing (letters) vs number typing (digits): a
// user's per-char speed differs between the two, and decode answers are always
// 2 digits, so they must not be judged by the word-typing estimate.
const WORD_KEY = 'major-typing-speed'
const DIGIT_KEY = 'major-typing-speed-digit'
const keyFor = (chars: number) => (chars >= 3 ? WORD_KEY : DIGIT_KEY)
const DEFAULT_MS_PER_CHAR = 160
const MIN_MS_PER_CHAR = 50
const MAX_MS_PER_CHAR = 500
const ALPHA_DOWN = 0.25  // adapt quickly toward a faster (lower) per-char time
const ALPHA_UP = 0.05    // drift back up only slowly

// Recall-time thresholds (typing time removed) — same scale as multiple choice,
// which is pure recall with no typing.
export const RECALL_FAST_MS = FAST_MS['multiple-choice']
export const RECALL_SLOW_MS = SLOW_MS['multiple-choice']

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function getMsPerChar(chars: number): number {
  try {
    const v = parseFloat(localStorage.getItem(keyFor(chars)) ?? '')
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_MS_PER_CHAR
  } catch {
    return DEFAULT_MS_PER_CHAR
  }
}

// Update the per-char estimate from a correct typed answer. ms/char over-counts
// (it still contains recall time), so we track toward the floor: adapt down fast
// when a sample is faster, drift up only slowly otherwise. Routed to the word or
// digit track by answer length.
export function recordTypingSpeed(rawMs: number, chars: number): void {
  if (chars < 1 || rawMs <= 0) return
  const perChar = rawMs / chars
  const prev = getMsPerChar(chars)
  const alpha = perChar < prev ? ALPHA_DOWN : ALPHA_UP
  const next = clamp(prev + (perChar - prev) * alpha, MIN_MS_PER_CHAR, MAX_MS_PER_CHAR)
  safeSet(keyFor(chars), String(Math.round(next)))
}

// Raw latency with the expected typing time removed → recall time.
// Floored at 20% of raw so we never over-subtract into "instant".
export function adjustLatency(rawMs: number, answerMode: AnswerMode, chars: number): number {
  if (answerMode !== 'typing' || chars <= 0) return rawMs
  const typingMs = getMsPerChar(chars) * chars
  return Math.max(rawMs - typingMs, Math.round(rawMs * 0.2))
}

export function recallColor(adjMs: number): string {
  if (adjMs <= RECALL_FAST_MS) return 'text-green-400'
  if (adjMs >= RECALL_SLOW_MS) return 'text-red-400'
  return 'text-yellow-400'
}
