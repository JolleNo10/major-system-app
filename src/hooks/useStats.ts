import type { AllStats, Direction, AnswerMode } from '../types'
import {
  loadStore, saveStore, getItem, setItem, itemKey,
  medianMs, SLOW_MS, OUTLIER_MS, MAX_LATENCIES,
  type ItemRecord,
} from '../data/itemStore'
import { gradeAnswer, applySm2 } from '../data/sm2'

const LEGACY_KEY = 'major-stats'

// ── Legacy store (ModeSelector totals + SpeedRound compat) ───────────────────

export function getStats(): AllStats {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// ── Free functions (safe outside React) ──────────────────────────────────────

export function getDueCount(allNums: string[]): number {
  const store = loadStore()
  const now = Date.now()
  let overdue = 0
  let newCount = 0
  for (const num of allNums) {
    for (const dir of ['enc', 'dec'] as Direction[]) {
      const item = getItem(store, dir, num)
      if (item.lastSeenAt === 0) newCount++
      else if (item.dueAt <= now) overdue++
    }
  }
  // Cap new items at 10 so the badge isn't overwhelming for first-time users
  return overdue + Math.min(newCount, 10)
}

export function buildRepQueue(
  allNums: string[],
): Array<{ dir: Direction; num: string }> {
  const store = loadStore()
  const now = Date.now()
  const overdue: Array<{ dir: Direction; num: string; dueAt: number }> = []
  const newItems: Array<{ dir: Direction; num: string }> = []

  for (const num of allNums) {
    for (const dir of ['enc', 'dec'] as Direction[]) {
      const item = getItem(store, dir, num)
      if (item.lastSeenAt === 0) newItems.push({ dir, num })
      else if (item.dueAt <= now) overdue.push({ dir, num, dueAt: item.dueAt })
    }
  }

  // Most overdue first (smallest past-due timestamp)
  overdue.sort((a, b) => a.dueAt - b.dueAt)

  // Shuffle new items, cap at 10
  const shuffledNew = [...newItems].sort(() => Math.random() - 0.5).slice(0, 10)

  return [...overdue.map(({ dir, num }) => ({ dir, num })), ...shuffledNew]
}

export function getNextDueMs(allNums: string[]): number | null {
  const store = loadStore()
  const now = Date.now()
  let min: number | null = null
  for (const num of allNums) {
    for (const dir of ['enc', 'dec'] as Direction[]) {
      const k = itemKey(dir, num)
      const item = store[k]
      if (item?.lastSeenAt > 0 && item.dueAt > now) {
        if (min === null || item.dueAt < min) min = item.dueAt
      }
    }
  }
  return min
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStats() {
  // Legacy — for SpeedRound (no direction / latency)
  const recordAnswer = (key: string, correct: boolean) => {
    const stats = getStats()
    const entry = stats[key] ?? { correct: 0, wrong: 0 }
    stats[key] = {
      correct: entry.correct + (correct ? 1 : 0),
      wrong: entry.wrong + (correct ? 0 : 1),
    }
    localStorage.setItem(LEGACY_KEY, JSON.stringify(stats))
  }

  // Full: direction + latency + SM-2
  const recordFull = (
    dir: Direction,
    num: string,
    correct: boolean,
    ms: number,
    answerMode: AnswerMode,
    hintUsed = false,
  ) => {
    // Keep legacy store in sync for ModeSelector totals
    recordAnswer(num, correct)

    const store = loadStore()
    let item: ItemRecord = getItem(store, dir, num)

    item = {
      ...item,
      correct: item.correct + (correct ? 1 : 0),
      wrong: item.wrong + (correct ? 0 : 1),
      hintCount: (item.hintCount ?? 0) + (hintUsed ? 1 : 0),
    }

    if (ms > 0 && ms < OUTLIER_MS) {
      item = { ...item, latencies: [...item.latencies, ms].slice(-MAX_LATENCIES) }
    }

    let grade = gradeAnswer(correct, ms, answerMode)
    // Assisted correct answer is not mastery — cap at 3 so item stays in rotation
    if (hintUsed && correct) grade = Math.min(grade, 3)
    item = applySm2(item, grade)

    saveStore(setItem(store, dir, num, item))
  }

  const getWeakNumbers = (limit = 10): string[] => {
    const store = loadStore()
    const encKeys = Object.keys(store).filter(k => k.startsWith('enc:'))

    if (!encKeys.length) {
      // Fall back to legacy store (no latency data yet)
      const stats = getStats()
      return Object.entries(stats)
        .filter(([, s]) => s.wrong > 0)
        .sort(([, a], [, b]) => {
          const rA = a.wrong / (a.correct + a.wrong)
          const rB = b.wrong / (b.correct + b.wrong)
          return rB - rA || b.wrong - a.wrong
        })
        .slice(0, limit)
        .map(([k]) => k)
    }

    const slowThreshold = SLOW_MS['multiple-choice']

    return encKeys
      .map(k => {
        const num = k.slice(4)
        const item = store[k]
        const total = item.correct + item.wrong
        if (total === 0) return null
        const wrongRate = item.wrong / total
        const median = medianMs(item.latencies)
        const normLatency = median ? Math.min(1, median / slowThreshold) : 0
        // Combined weakness score: error rate weighted 60%, latency 40%
        return { num, weakness: wrongRate * 0.6 + normLatency * 0.4 }
      })
      .filter((x): x is { num: string; weakness: number } => x !== null && x.weakness > 0)
      .sort((a, b) => b.weakness - a.weakness)
      .slice(0, limit)
      .map(({ num }) => num)
  }

  return { recordAnswer, recordFull, getWeakNumbers }
}
