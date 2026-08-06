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
//   learned — every pair in the segment is "clean", i.e. its most recent TWO
//             answers were both correct (or its single answer was correct on the
//             first flawless pass). Judged on recency, not lifetime: an old miss
//             is forgiven as soon as the pair is re-answered correctly twice, so
//             amber→green is regained by re-proving just the missed pairs. A
//             fresh miss still demotes to weak (resistant to lucky guesses).
//   weak    — touched (≥1 answered pair) but short of that bar;
//   new     — untested.
export type PiSegmentStatus = 'new' | 'weak' | 'learned'

// Per-segment rollup backing both the status dot and its hover tooltip.
export interface PiSegmentSummary {
  status: PiSegmentStatus
  touched: number   // pairs with ≥1 recorded answer (0..10)
  clean: number     // pairs whose last CLEAN_RECENT answers were all correct (0..10)
  correct: number   // total correct answers across the segment's pairs
  wrong: number     // total wrong answers
}

// How many of a pair's most-recent answers must be correct for it to count as
// clean. First-pass single correct answers also qualify (fewer than this many
// attempts, none wrong), so a first flawless recite still turns the segment green.
const CLEAN_RECENT = 2

export async function piSegmentSummaries(maxPairs: number): Promise<PiSegmentSummary[]> {
  const attempts = (await getAllAttempts()).filter(a => a.key.startsWith(PI_KEY_PREFIX))

  // Keep each position's attempts in chronological order so we can look at the
  // most recent few (the store returns rows in insertion order; sort on `at`
  // defensively in case that ever changes).
  const byPos = new Map<number, boolean[]>()
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
    const pos = parseInt(a.key.slice(PI_KEY_PREFIX.length), 10)
    if (!Number.isFinite(pos)) continue
    let g = byPos.get(pos)
    if (!g) { g = []; byPos.set(pos, g) }
    g.push(a.ok)
  }

  // A pair is clean when its last CLEAN_RECENT answers are all correct (or it has
  // fewer than that many answers and none of them were wrong).
  const isClean = (oks: boolean[] | undefined): boolean =>
    !!oks && oks.length > 0 && oks.slice(-CLEAN_RECENT).every(Boolean)

  const maxSegs = Math.floor(maxPairs / PAIRS_PER_SEGMENT)
  const summaries: PiSegmentSummary[] = []
  for (let seg = 0; seg < maxSegs; seg++) {
    let touched = 0, clean = 0, correct = 0, wrong = 0
    for (let i = 0; i < PAIRS_PER_SEGMENT; i++) {
      const oks = byPos.get(seg * PAIRS_PER_SEGMENT + i + 1)
      if (oks && oks.length) touched++
      if (isClean(oks)) clean++
      for (const ok of oks ?? []) ok ? correct++ : wrong++
    }
    const status: PiSegmentStatus =
      touched === 0 ? 'new' : clean === PAIRS_PER_SEGMENT ? 'learned' : 'weak'
    summaries.push({ status, touched, clean, correct, wrong })
  }
  return summaries
}

export async function piSegmentStatuses(maxPairs: number): Promise<PiSegmentStatus[]> {
  return (await piSegmentSummaries(maxPairs)).map(s => s.status)
}

// Human-readable one-liner for a segment's status dot tooltip (Recite grid),
// mirroring the Anchors pace bead's "label — timings" hover detail.
export function describeSegment(s: PiSegmentSummary, memoed: boolean): string {
  if (s.status === 'new') {
    return memoed ? 'memorised in study — not yet recited' : 'not yet recited'
  }
  const answers = s.correct + s.wrong
  const pct = answers ? Math.round((s.correct / answers) * 100) : 0
  const head = s.status === 'learned' ? 'learned' : 'practising'
  const solid = s.status === 'learned'
    ? `all ${PAIRS_PER_SEGMENT} pairs solid`
    : `${s.clean}/${PAIRS_PER_SEGMENT} pairs solid`
  return `${head} · ${solid} · ${answers} answer${answers === 1 ? '' : 's'}, ${pct}% correct`
}
