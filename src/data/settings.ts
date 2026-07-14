// User-adjustable settings (localStorage).

export interface Settings {
  // Multiplier on RECALL_FAST_MS for the mastery "fast enough" bar. 1 = strict
  // (must be green/fast); higher lets slower answers still count as mastered.
  masteryLatencyFactor: number
  // Upper bound (in digits) for the "Max π digits" slider in the Pi drill setup.
  // Increase this as more pi digit data is added to piDigits.ts.
  maxPiDigits: number
}

const KEY = 'major-settings'

export const DEFAULT_SETTINGS: Settings = {
  masteryLatencyFactor: 1.4, // ~1.7s recall — lenient enough that "not slow" counts
  maxPiDigits: 200,
}

export const MASTERY_FACTOR_MIN = 1
export const MASTERY_FACTOR_MAX = 2.5
export const MASTERY_FACTOR_STEP = 0.1

export const MAX_PI_DIGITS_MIN  = 20
export const MAX_PI_DIGITS_STEP = 20

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return { ...DEFAULT_SETTINGS, ...raw }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}
