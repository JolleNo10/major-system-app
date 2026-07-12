import { RECALL_FAST_MS } from '../data/typingSpeed'
import type { RoundStat } from '../components/RoundStatsPanel'

// "Known well" this round = answered correctly + fast enough + un-hinted on the
// last MASTERY_REPS attempts in a row. The speed bar is adjustable in Settings
// (masteryLatencyFactor). A wrong or too-slow answer resets the streak.
// Selection already excludes the immediately-previous number, so consecutive
// attempts of a number always have another question in between (not pure
// short-term memory).

export const MASTERY_REPS = 2

// Effective "fast enough" recall threshold (ms) for the given tolerance factor.
export function masteryFastMs(factor: number): number {
  return RECALL_FAST_MS * factor
}

export function isMastered(stat: RoundStat | undefined, fastMs: number): boolean {
  if (!stat) return false
  const a = stat.attempts
  let reps = 0
  for (let i = a.length - 1; i >= 0; i--) {
    const x = a[i]
    if (x.ok && !x.hinted && x.recallMs <= fastMs) reps++
    else break
  }
  return reps >= MASTERY_REPS
}

export function masteryProgress(
  pool: string[],
  stats: Record<string, RoundStat>,
  fastMs: number,
): { mastered: number; total: number; masteredSet: Set<string> } {
  const masteredSet = new Set<string>()
  for (const n of pool) {
    if (isMastered(stats[n], fastMs)) masteredSet.add(n)
  }
  return { mastered: masteredSet.size, total: pool.length, masteredSet }
}
