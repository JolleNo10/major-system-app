import type { AnswerMode } from '../types'
import { readJSON, safeSet } from '../utils/storage'
import { getAllAttempts } from './attemptStore'
import { medianMs } from './itemStore'
import { PI_PAIRS } from './piDigits'

// Pi drill (number-quiz only) metrics. Two persisted shapes:
//   - session summaries → localStorage (one row per completed run, capped)
//   - per-position attempts → IndexedDB, under "pi:<position>" keys (attemptStore)
// Word-chain is not tracked.

const SESSIONS_KEY = 'major-pi-sessions'
const SESSIONS_CAP = 50
const PI_KEY_PREFIX = 'pi:'

export interface PiSession {
  at: number
  anchor: number          // first pair (1-indexed) of the selected range
  pairs: number           // pairs in the range
  correctPairs: number
  reach: number           // consecutive correct pairs from the sequence start (hero metric)
  totalMs: number
  pairsPerSec: number
  accuracy: number        // 0–100
  answerMode: AnswerMode
  answerSize: 1 | 10
}

export interface PiPositionStat {
  pos: number             // 1-indexed π position
  pair: string            // the π pair value at that position
  correct: number
  wrong: number
  total: number
  median: number | null
}

export function loadPiSessions(): PiSession[] {
  return readJSON<PiSession[]>(SESSIONS_KEY, [])
}

export function addPiSession(session: PiSession): void {
  const sessions = [...loadPiSessions(), session].slice(-SESSIONS_CAP)
  safeSet(SESSIONS_KEY, JSON.stringify(sessions))
}

// Best reach across all runs (any anchor).
export function bestReach(sessions: PiSession[]): number {
  return sessions.reduce((max, s) => Math.max(max, s.reach), 0)
}

// Best reach among runs that started at π #1 — drives the "= N digits of π" headline.
export function bestFromStartReach(sessions: PiSession[]): number {
  return sessions.reduce((max, s) => (s.anchor === 1 ? Math.max(max, s.reach) : max), 0)
}

// Aggregate per-position performance from the IndexedDB attempt log, worst-first.
export async function rankPiPositions(): Promise<PiPositionStat[]> {
  const attempts = (await getAllAttempts()).filter(a => a.key.startsWith(PI_KEY_PREFIX))

  const byPos = new Map<number, { correct: number; wrong: number; latencies: number[] }>()
  for (const a of attempts) {
    const pos = parseInt(a.key.slice(PI_KEY_PREFIX.length), 10)
    if (!Number.isFinite(pos)) continue
    let g = byPos.get(pos)
    if (!g) { g = { correct: 0, wrong: 0, latencies: [] }; byPos.set(pos, g) }
    if (a.ok) g.correct++; else g.wrong++
    g.latencies.push(a.ms)
  }

  const stats: PiPositionStat[] = [...byPos.entries()].map(([pos, g]) => {
    const total = g.correct + g.wrong
    return {
      pos,
      pair: PI_PAIRS[pos - 1] ?? '??',
      correct: g.correct,
      wrong: g.wrong,
      total,
      median: medianMs(g.latencies),
    }
  })

  // Worst-first: higher wrong-rate first, ties broken by more attempts then position.
  stats.sort((a, b) => {
    const ra = a.total ? a.wrong / a.total : 0
    const rb = b.total ? b.wrong / b.total : 0
    if (rb !== ra) return rb - ra
    if (b.total !== a.total) return b.total - a.total
    return a.pos - b.pos
  })
  return stats
}
