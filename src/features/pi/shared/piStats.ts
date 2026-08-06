import type { AnswerMode } from '@/core/types'
import { readJSON, safeSet } from '@/core/storage'
import { getAllAttempts } from '@/core/scoring/attemptStore'
import { medianMs } from '@/core/scoring/itemStore'
import { PI_PAIRS } from '@/features/pi/shared/piDigits'

// Pi drill (number-quiz only) metrics. Two persisted shapes:
//   - session summaries → localStorage (one row per completed run, capped)
//   - per-position attempts → IndexedDB, under "pi:<position>" keys (attemptStore)
// Word-chain is not tracked.

const SESSIONS_KEY = 'major-pi-sessions'
const SESSIONS_CAP = 50
const PI_KEY_PREFIX = 'pi:'

export const PAIRS_PER_SEGMENT = 10

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

// ── Full recite vs practice ─────────────────────────────────────────────────
// The ultimate goal is reciting π from #1 onward. A run that *starts* at π #1
// (anchor === 1) is a "full recite" (the progress that counts); every other
// run is practice. Classification is a read-time filter on the anchor — no
// stored flag. See ADR 0004 / the Recite tab.

export function isFullRecite(s: PiSession): boolean {
  return s.anchor === 1
}

export function fullReciteSessions(sessions: PiSession[]): PiSession[] {
  return sessions.filter(isFullRecite)
}

export function practiceSessions(sessions: PiSession[]): PiSession[] {
  return sessions.filter(s => !isFullRecite(s))
}

// The full-recite run that set the current from-π#1 record: max reach, earliest
// run wins ties (it got there first). null if there are no full recites yet.
export function fromStartRecordRun(sessions: PiSession[]): PiSession | null {
  let best: PiSession | null = null
  for (const s of sessions) {
    if (!isFullRecite(s)) continue
    if (!best || s.reach > best.reach || (s.reach === best.reach && s.at < best.at)) best = s
  }
  return best
}

// Would a from-π#1 run with this clean reach beat the standing record among
// `priorSessions`? Strictly greater (a tie doesn't count), and reach must be
// non-zero (missing the first pair is never a record).
export function isFromStartRecord(priorSessions: PiSession[], reach: number): boolean {
  return reach > 0 && reach > bestFromStartReach(priorSessions)
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

// ── Per-segment learning status (progress dots) ─────────────────────────────

// Derived from the pi:<position> attempt log, indexed by segment:
//   learned — every pair in the segment has ≥1 correct answer in the retained
//             window AND the segment has no recorded misses (a later miss
//             demotes it back to weak);
//   weak    — touched (≥1 answered pair) but short of that bar;
//   new     — untested.
export type PiSegmentStatus = 'new' | 'weak' | 'learned'

export async function piSegmentStatuses(maxPairs: number): Promise<PiSegmentStatus[]> {
  const attempts = (await getAllAttempts()).filter(a => a.key.startsWith(PI_KEY_PREFIX))

  const byPos = new Map<number, { correct: number; wrong: number }>()
  for (const a of attempts) {
    const pos = parseInt(a.key.slice(PI_KEY_PREFIX.length), 10)
    if (!Number.isFinite(pos)) continue
    let g = byPos.get(pos)
    if (!g) { g = { correct: 0, wrong: 0 }; byPos.set(pos, g) }
    if (a.ok) g.correct++; else g.wrong++
  }

  const maxSegs = Math.floor(maxPairs / PAIRS_PER_SEGMENT)
  const statuses: PiSegmentStatus[] = []
  for (let seg = 0; seg < maxSegs; seg++) {
    let total = 0, wrong = 0, covered = 0
    for (let i = 0; i < PAIRS_PER_SEGMENT; i++) {
      const g = byPos.get(seg * PAIRS_PER_SEGMENT + i + 1)
      if (!g) continue
      total += g.correct + g.wrong
      wrong += g.wrong
      if (g.correct > 0) covered++
    }
    if (total === 0) statuses.push('new')
    else if (covered === PAIRS_PER_SEGMENT && wrong === 0) statuses.push('learned')
    else statuses.push('weak')
  }
  return statuses
}
