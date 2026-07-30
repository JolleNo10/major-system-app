import { OUTLIER_MS } from '../data/scoring'

// Per-round, in-memory stats for a single number/card. Ephemeral (not persisted)
// — SM-2 owns the durable per-item record; this drives the round mastery UI.

export interface RoundAttempt {
  ok: boolean       // correct
  recallMs: number  // recall-adjusted latency (typing time removed)
  hinted: boolean   // a hint was used
}

export interface RoundStat {
  correct: number
  wrong: number
  lastMs?: number         // recall-adjusted (typing time removed)
  latencies: number[]     // this round only, recall-adjusted
  hintCount: number       // this round only
  attempts: RoundAttempt[] // last ~5 attempts this round (for mastery)
}

const EMPTY: RoundStat = { correct: 0, wrong: 0, latencies: [], hintCount: 0, attempts: [] }

// Fold one answer into the round-stats map. `rawMs` gates outlier latencies;
// `adjustedMs` is the recall-adjusted value stored for display/mastery.
export function applyRoundAttempt(
  prev: Record<string, RoundStat>,
  num: string,
  attempt: { ok: boolean; rawMs: number; adjustedMs: number; hinted: boolean },
): Record<string, RoundStat> {
  const { ok, rawMs, adjustedMs, hinted } = attempt
  const entry = prev[num] ?? EMPTY
  const validMs = rawMs > 0 && rawMs < OUTLIER_MS
  return {
    ...prev,
    [num]: {
      ...entry,
      correct: entry.correct + (ok ? 1 : 0),
      wrong: entry.wrong + (ok ? 0 : 1),
      lastMs: adjustedMs,
      latencies: validMs ? [...entry.latencies, adjustedMs] : entry.latencies,
      hintCount: entry.hintCount + (hinted ? 1 : 0),
      attempts: [...entry.attempts, { ok, recallMs: adjustedMs, hinted }].slice(-5),
    },
  }
}
