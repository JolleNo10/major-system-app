import type { AnswerMode } from '../types'
import { readJSON, safeSet } from '../utils/storage'
import { addAttemptRaw, getAllAttempts } from './attemptStore'
import { medianMs } from './itemStore'
import { PI_PAIRS } from './piDigits'

// Pi drill (number-quiz only) metrics. Two persisted shapes:
//   - session summaries → localStorage (one row per completed run, capped)
//   - per-position attempts → IndexedDB, under "pi:<position>" keys (attemptStore)
// Word-chain is not tracked.
//
// The Train tab adds a third signal: per-boundary "chaining" attempts under
// "pi-chain:<segIdx>" keys — the first pair of segment segIdx+1, logged only
// when crossed during a chain drill. Distinct namespace, same store/pruning.

const SESSIONS_KEY = 'major-pi-sessions'
const SESSIONS_CAP = 50
const PI_KEY_PREFIX = 'pi:'
const PI_CHAIN_PREFIX = 'pi-chain:'

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

// ── Train tab: segment- and boundary-level weakness ─────────────────────────

export interface PiSegmentStat {
  seg: number             // 0-indexed segment
  anchor: number          // 1-indexed π position of the segment's first pair
  wrong: number
  total: number
  wrongRate: number       // 0..1
  median: number | null
  tested: boolean
}

export interface PiBoundaryStat {
  boundary: number        // 0-indexed segment you finish; you chain into boundary+1
  fromAnchor: number      // 1-indexed π position of the finished segment's first pair
  nextPos: number         // 1-indexed π position of the target (first pair of next segment)
  nextPair: string        // the π pair value at nextPos
  wrong: number
  total: number
  wrongRate: number       // 0..1
  median: number | null
  tested: boolean
}

// Shared worst-first ordering. Three tiers: genuinely weak (tested, misses) →
// untested ("new") → tested-clean. Within a tier, higher wrong-rate then slower
// then more attempts; untested/clean fall back to natural index order.
function compareWeakness(
  a: { wrongRate: number; median: number | null; total: number; tested: boolean; idx: number },
  b: { wrongRate: number; median: number | null; total: number; tested: boolean; idx: number },
): number {
  const tier = (s: typeof a) => (!s.tested ? 1 : s.wrongRate > 0 ? 0 : 2)
  const ta = tier(a), tb = tier(b)
  if (ta !== tb) return ta - tb
  if (b.wrongRate !== a.wrongRate) return b.wrongRate - a.wrongRate
  const ma = a.median ?? 0, mb = b.median ?? 0
  if (mb !== ma) return mb - ma
  if (b.total !== a.total) return b.total - a.total
  return a.idx - b.idx
}

// Roll the per-position attempt log up into per-segment weakness, worst-first.
// Covers every segment within maxPairs, including untested ones (cold start).
export async function rankPiSegments(maxPairs: number): Promise<PiSegmentStat[]> {
  const attempts = (await getAllAttempts()).filter(a => a.key.startsWith(PI_KEY_PREFIX))

  const byPos = new Map<number, { wrong: number; total: number; latencies: number[] }>()
  for (const a of attempts) {
    const pos = parseInt(a.key.slice(PI_KEY_PREFIX.length), 10)
    if (!Number.isFinite(pos)) continue
    let g = byPos.get(pos)
    if (!g) { g = { wrong: 0, total: 0, latencies: [] }; byPos.set(pos, g) }
    g.total++
    if (!a.ok) g.wrong++
    g.latencies.push(a.ms)
  }

  const maxSegs = Math.floor(maxPairs / PAIRS_PER_SEGMENT)
  const stats: PiSegmentStat[] = []
  for (let seg = 0; seg < maxSegs; seg++) {
    let wrong = 0, total = 0
    const latencies: number[] = []
    for (let i = 0; i < PAIRS_PER_SEGMENT; i++) {
      const g = byPos.get(seg * PAIRS_PER_SEGMENT + i + 1)
      if (g) { wrong += g.wrong; total += g.total; latencies.push(...g.latencies) }
    }
    stats.push({
      seg,
      anchor: seg * PAIRS_PER_SEGMENT + 1,
      wrong, total,
      wrongRate: total ? wrong / total : 0,
      median: medianMs(latencies),
      tested: total > 0,
    })
  }

  stats.sort((a, b) => compareWeakness({ ...a, idx: a.seg }, { ...b, idx: b.seg }))
  return stats
}

// Rank the segment boundaries by chaining weakness from the pi-chain log,
// worst-first. Covers every boundary that has a next segment within maxPairs.
export async function rankPiBoundaries(maxPairs: number): Promise<PiBoundaryStat[]> {
  const attempts = (await getAllAttempts()).filter(a => a.key.startsWith(PI_CHAIN_PREFIX))

  const byB = new Map<number, { wrong: number; total: number; latencies: number[] }>()
  for (const a of attempts) {
    const b = parseInt(a.key.slice(PI_CHAIN_PREFIX.length), 10)
    if (!Number.isFinite(b)) continue
    let g = byB.get(b)
    if (!g) { g = { wrong: 0, total: 0, latencies: [] }; byB.set(b, g) }
    g.total++
    if (!a.ok) g.wrong++
    g.latencies.push(a.ms)
  }

  const maxSegs = Math.floor(maxPairs / PAIRS_PER_SEGMENT)
  const stats: PiBoundaryStat[] = []
  for (let boundary = 0; boundary < maxSegs - 1; boundary++) {
    const g = byB.get(boundary)
    const total = g?.total ?? 0
    const nextPos = (boundary + 1) * PAIRS_PER_SEGMENT + 1
    stats.push({
      boundary,
      fromAnchor: boundary * PAIRS_PER_SEGMENT + 1,
      nextPos,
      nextPair: PI_PAIRS[nextPos - 1] ?? '??',
      wrong: g?.wrong ?? 0,
      total,
      wrongRate: total ? (g!.wrong / total) : 0,
      median: medianMs(g?.latencies ?? []),
      tested: total > 0,
    })
  }

  stats.sort((a, b) => compareWeakness({ ...a, idx: a.boundary }, { ...b, idx: b.boundary }))
  return stats
}

// Log one chaining attempt: the first pair of segment boundary+1, crossed from
// segment boundary during a chain drill.
export function recordPiChain(boundary: number, ok: boolean, ms: number): Promise<void> {
  return addAttemptRaw(`${PI_CHAIN_PREFIX}${boundary}`, { at: Date.now(), ok, ms })
}
