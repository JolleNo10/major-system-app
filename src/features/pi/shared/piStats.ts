import type { AnswerMode } from '@/core/types'
import { readJSON, safeSet } from '@/core/storage'
import { getAllAttempts, addAttemptRaw } from '@/core/scoring/attemptStore'
import { medianMs } from '@/core/scoring/itemStore'
import { HISTORY_HALFLIFE_DAYS } from '@/core/scoring/scoring'
import { PI_PAIRS } from '@/features/pi/shared/piDigits'
import { segmentResultsFromRun } from '@/features/pi/maintain/piMaintain'

// Pi drill (number-quiz only) metrics. Two persisted shapes:
//   - session summaries → localStorage (one row per completed run, capped)
//   - per-position attempts → IndexedDB, under "pi:<position>" keys (attemptStore)
// Word-chain is not tracked.

const SESSIONS_KEY = 'major-pi-sessions'
const SESSIONS_CAP = 50
const PI_KEY_PREFIX = 'pi:'
// Per-segment "try" log (one row per whole-segment recite run). Distinct from
// the per-pair `pi:<pos>` log so the two metrics don't collide.
const PI_SEGMENT_KEY_PREFIX = 'piseg:'

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

// ── Per-segment recitation status (progress dots) ───────────────────────────

// A "try" is one recite run that covered the WHOLE segment (all
// PAIRS_PER_SEGMENT pairs); it's correct only if every pair in that run was
// right. Tries are logged going forward under `piseg:<seg>` keys — separate
// from the per-pair `pi:<pos>` log (which still feeds weak-position stats).
//
// Status, indexed by segment:
//   learned — the last RECENT_TRIES tries were ALL correct (2/2 → green);
//   weak    — tried at least once but short of that bar;
//   new     — never fully recited.
// The tooltip's "% correct" is an exponentially age-decayed ratio (recent tries
// dominate, old ones fade) so a stale perfect streak can't mask recent slips.
export type PiSegmentStatus = 'new' | 'weak' | 'learned'

// How many of the most-recent tries must all be correct for a green segment.
const RECENT_TRIES = 2

// Per-segment rollup backing both the status dot and its hover tooltip.
export interface PiSegmentSummary {
  status: PiSegmentStatus
  recentClean: number   // correct tries among the last RECENT_TRIES (0..RECENT_TRIES)
  tries: number         // total recorded tries (full-segment recite runs)
  correctPct: number    // age-decayed % of tries that were fully correct (0..100)
}

// Record one segment "try" per segment a completed recite run fully covered.
// `correctness[i]` is the outcome of the run's i-th pair (π position anchor+i);
// only segments whose full 10-pair span sits inside the run get a try.
export function recordSegmentTries(anchor: number, correctness: boolean[]): void {
  const at = Date.now()
  for (const { seg, ok } of segmentResultsFromRun(anchor, correctness)) {
    void addAttemptRaw(`${PI_SEGMENT_KEY_PREFIX}${seg}`, { at, ok, ms: 0 })
  }
}

export async function piSegmentSummaries(maxPairs: number): Promise<PiSegmentSummary[]> {
  const attempts = (await getAllAttempts()).filter(a => a.key.startsWith(PI_SEGMENT_KEY_PREFIX))

  // Group each segment's tries in chronological order (the store returns rows in
  // insertion order; sort on `at` defensively in case that ever changes).
  const bySeg = new Map<number, { at: number; ok: boolean }[]>()
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
    const seg = parseInt(a.key.slice(PI_SEGMENT_KEY_PREFIX.length), 10)
    if (!Number.isFinite(seg)) continue
    let g = bySeg.get(seg)
    if (!g) { g = []; bySeg.set(seg, g) }
    g.push({ at: a.at, ok: a.ok })
  }

  const now = Date.now()
  const halfLifeMs = HISTORY_HALFLIFE_DAYS * 86_400_000
  const maxSegs = Math.floor(maxPairs / PAIRS_PER_SEGMENT)
  const summaries: PiSegmentSummary[] = []
  for (let seg = 0; seg < maxSegs; seg++) {
    const rows = bySeg.get(seg) ?? []
    const tries = rows.length
    const recentClean = rows.slice(-RECENT_TRIES).filter(r => r.ok).length
    // Exponential half-life: each try weighted 0.5^(age / half-life), so recent
    // tries dominate the % and old ones fade toward zero weight.
    let wSum = 0, wOk = 0
    for (const r of rows) {
      const w = Math.pow(0.5, (now - r.at) / halfLifeMs)
      wSum += w
      if (r.ok) wOk += w
    }
    const correctPct = wSum ? Math.round((wOk / wSum) * 100) : 0
    const status: PiSegmentStatus =
      tries === 0 ? 'new' : recentClean >= RECENT_TRIES ? 'learned' : 'weak'
    summaries.push({ status, recentClean, tries, correctPct })
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
  const head = s.status === 'learned' ? 'learned' : 'practising'
  const count = `${s.tries} tr${s.tries === 1 ? 'y' : 'ies'}`
  return `${head} · ${s.recentClean}/${RECENT_TRIES} recent tries · ${count}, ${s.correctPct}% correct`
}
