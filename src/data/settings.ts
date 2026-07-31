// User-adjustable settings (localStorage).

import { readJSON, readString, safeSet } from '../utils/storage'

export interface Settings {
  // Multiplier on RECALL_FAST_MS for the mastery "fast enough" bar. 1 = strict
  // (must be green/fast); higher lets slower answers still count as mastered.
  masteryLatencyFactor: number
  // Upper bound (in digits) for the "Max π digits" slider in the Pi drill setup.
  // Increase this as more pi digit data is added to piDigits.ts.
  maxPiDigits: number
  // When true, the app makes no proactive update checks (runs from the SW cache)
  // to conserve free-tier hosting usage. Manual "Check for updates" still works.
  offlineMode: boolean
  // Pairs typed per answer in the Pi drills' typing mode: 1 = pair-by-pair,
  // 10 = a whole 10-pair row at once. Ignored in multiple-choice.
  piPairsPerAnswer: 1 | 10
}

const KEY = 'major-settings'
const LEGACY_PAIRS_KEY = 'major-pi-answer-size'

export const DEFAULT_SETTINGS: Settings = {
  masteryLatencyFactor: 1.4, // ~1.7s recall — lenient enough that "not slow" counts
  maxPiDigits: 200,
  offlineMode: false, // default: check for updates on launch
  piPairsPerAnswer: 1,
}

export const MASTERY_FACTOR_MIN = 1
export const MASTERY_FACTOR_MAX = 2.5
export const MASTERY_FACTOR_STEP = 0.1

export const MAX_PI_DIGITS_MIN  = 20
export const MAX_PI_DIGITS_STEP = 20

export function loadSettings(): Settings {
  const stored = readJSON<Partial<Settings>>(KEY, {})
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  // One-time migration: pairs-per-answer used to live in its own localStorage key.
  if (stored.piPairsPerAnswer === undefined && readString(LEGACY_PAIRS_KEY) === '10') {
    merged.piPairsPerAnswer = 10
  }
  return merged
}

export function saveSettings(s: Settings): void {
  safeSet(KEY, JSON.stringify(s))
}
