import type { AllStats, Direction, AnswerMode } from '../types'
import {
  loadStore, saveStore, getItem, setItem, type ItemRecord,
} from '../data/itemStore'
import { OUTLIER_MS, MAX_LATENCIES } from '../data/scoring'
import { addAttempt } from '../data/attemptStore'
import { gradeAnswer, applySm2 } from '../data/sm2'
import { adjustLatency, recordTypingSpeed } from '../data/typingSpeed'
import { shuffle } from '../utils/quiz'

// New items introduced per repetition session / counted in the due badge, so a
// first-time user isn't buried under 200 unseen items at once.
const NEW_ITEM_CAP = 10

// ── Direction-less per-number aggregates ─────────────────────────────────────
// Derived on demand from the modern item store (enc + dec summed) for the
// ModeSelector totals and the WordListGrid accuracy dots.

export function getStats(): AllStats {
  const store = loadStore()
  const out: AllStats = {}
  for (const [k, item] of Object.entries(store)) {
    const num = k.slice(k.indexOf(':') + 1) // "enc:07" → "07"
    const prev = out[num] ?? { correct: 0, wrong: 0 }
    out[num] = { correct: prev.correct + item.correct, wrong: prev.wrong + item.wrong }
  }
  return out
}

// ── Free functions (safe outside React) ──────────────────────────────────────

// One pass over every (num × direction) item — the shared traversal behind the
// due-count badge, the repetition queue, and the next-due lookup.
function allItems(allNums: string[]): Array<{ dir: Direction; num: string; item: ItemRecord }> {
  const store = loadStore()
  const out: Array<{ dir: Direction; num: string; item: ItemRecord }> = []
  for (const num of allNums) {
    for (const dir of ['enc', 'dec'] as Direction[]) {
      out.push({ dir, num, item: getItem(store, dir, num) })
    }
  }
  return out
}

export function getDueCount(allNums: string[]): number {
  const now = Date.now()
  let overdue = 0
  let newCount = 0
  for (const { item } of allItems(allNums)) {
    if (item.lastSeenAt === 0) newCount++
    else if (item.dueAt <= now) overdue++
  }
  return overdue + Math.min(newCount, NEW_ITEM_CAP)
}

export function buildRepQueue(allNums: string[]): Array<{ dir: Direction; num: string }> {
  const now = Date.now()
  const overdue: Array<{ dir: Direction; num: string; dueAt: number }> = []
  const newItems: Array<{ dir: Direction; num: string }> = []

  for (const { dir, num, item } of allItems(allNums)) {
    if (item.lastSeenAt === 0) newItems.push({ dir, num })
    else if (item.dueAt <= now) overdue.push({ dir, num, dueAt: item.dueAt })
  }

  overdue.sort((a, b) => a.dueAt - b.dueAt) // most overdue first
  const shuffledNew = shuffle(newItems).slice(0, NEW_ITEM_CAP)

  return [...overdue.map(({ dir, num }) => ({ dir, num })), ...shuffledNew]
}

export function getNextDueMs(allNums: string[]): number | null {
  const now = Date.now()
  let min: number | null = null
  for (const { item } of allItems(allNums)) {
    if (item.lastSeenAt > 0 && item.dueAt > now && (min === null || item.dueAt < min)) {
      min = item.dueAt
    }
  }
  return min
}

// ── recordFull steps ──────────────────────────────────────────────────────────

// Fold one answer's counts + rolling recall latency into the item record.
function aggregateItem(
  item: ItemRecord, correct: boolean, adjustedMs: number, hintUsed: boolean, validMs: boolean,
): ItemRecord {
  const next: ItemRecord = {
    ...item,
    correct: item.correct + (correct ? 1 : 0),
    wrong: item.wrong + (correct ? 0 : 1),
    hintCount: (item.hintCount ?? 0) + (hintUsed ? 1 : 0),
  }
  if (!validMs) return next
  return { ...next, latencies: [...next.latencies, adjustedMs].slice(-MAX_LATENCIES) }
}

// Grade the recall time (typing removed) on the recall/MC scale and advance the
// SM-2 schedule. An assisted-correct answer is capped at 3 so it stays in rotation.
function scheduleItem(item: ItemRecord, correct: boolean, adjustedMs: number, hintUsed: boolean) {
  let grade = gradeAnswer(correct, adjustedMs, 'multiple-choice')
  if (hintUsed && correct) grade = Math.min(grade, 3)
  return { item: applySm2(item, grade), grade }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStats() {
  // Record an answer: log it, update the typing-speed estimate, aggregate counts,
  // and advance the SM-2 schedule. Returns the grade (RepetitionDrill re-queues on it).
  const recordFull = (
    dir: Direction,
    num: string,
    correct: boolean,
    ms: number,
    answerMode: AnswerMode,
    hintUsed = false,
    chars = 0,
  ) => {
    const store = loadStore()
    const adjusted = adjustLatency(ms, answerMode, chars) // remove typing time → recall time
    const validMs = ms > 0 && ms < OUTLIER_MS

    // Timestamped per-answer log (IndexedDB) — basis for age-decay/analytics.
    // Fire-and-forget; never blocks recording.
    void addAttempt(dir, num, { at: Date.now(), ok: correct, ms: adjusted })
    if (validMs && answerMode === 'typing' && correct) recordTypingSpeed(ms, chars)

    const aggregated = aggregateItem(getItem(store, dir, num), correct, adjusted, hintUsed, validMs)
    const { item, grade } = scheduleItem(aggregated, correct, adjusted, hintUsed)
    saveStore(setItem(store, dir, num, item))
    return grade
  }

  return { recordFull }
}
