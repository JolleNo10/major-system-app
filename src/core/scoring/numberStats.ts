import type { Direction } from '@/core/types'
import { loadStore, getItem, medianMs, type ItemRecord } from '@/core/scoring/itemStore'
import { SLOW_MS, DEFAULT_EASE, MIN_EASE } from '@/core/scoring/scoring'

// All-time per-number weakness ranking for one direction.
// "Worst" is biased toward RECENT performance, not lifetime history:
//   - easePenalty (SM-2 ease) — recent difficulty; drops on recent wrongs/slowness,
//     recovers as you answer well. Already the signal pickWeighted drills by.
//   - normLatency — median of the rolling last-10 latencies (recall-adjusted).
//   - residual — lifetime wrongRate, but DECAYED by the current correct streak so
//     old mistakes fade as you relearn a number (and snap back on the next miss).
// This keeps ~80% of the weight on recent behaviour vs the old 60% lifetime wrongRate.
const STREAK_THRESHOLD = 2      // reps that count as "currently solid" (for the 🔥 cue)
const DECAY_PER_REP = 0.8       // residual halves ~every 3 consecutive correct answers

export interface NumberStat {
  num: string
  correct: number
  wrong: number
  total: number
  median: number | null
  weakness: number   // 0..1, higher = worse
  tested: boolean
  onStreak: boolean  // currently on a STREAK_THRESHOLD+ correct run
}

// Single per-item weakness score (0..1, higher = worse), the one definition
// used everywhere "weak" is measured — the Stats ranking, Weak Spots, and the
// pickWeighted draw. Recency-biased: SM-2 ease penalty (recent difficulty) +
// rolling recall latency + a lifetime wrongRate residual that decays with the
// current correct streak so old mistakes fade as a number is relearned.
export function itemWeakness(item: ItemRecord): number {
  const total = item.correct + item.wrong
  const wrongRate = total > 0 ? item.wrong / total : 0
  const median = medianMs(item.latencies)
  const normLatency = median ? Math.min(1, median / SLOW_MS['multiple-choice']) : 0
  const easePenalty = Math.max(0, Math.min(1,
    (DEFAULT_EASE - (item.ease ?? DEFAULT_EASE)) / (DEFAULT_EASE - MIN_EASE)))
  const residual = wrongRate * Math.pow(DECAY_PER_REP, item.reps)
  return easePenalty * 0.55 + normLatency * 0.25 + residual * 0.2
}

export function rankByWeakness(dir: Direction, nums: string[]): NumberStat[] {
  const store = loadStore()

  const stats: NumberStat[] = nums.map(num => {
    const item = getItem(store, dir, num)
    const total = item.correct + item.wrong

    return {
      num,
      correct: item.correct,
      wrong: item.wrong,
      total,
      median: medianMs(item.latencies),
      weakness: itemWeakness(item),
      tested: total > 0,
      onStreak: item.reps >= STREAK_THRESHOLD,
    }
  })

  // Tested first, worst (highest weakness) first; more attempts breaks ties.
  // Untested go last in numeric order — a coverage map, not "worst".
  return stats.sort((a, b) => {
    if (a.tested !== b.tested) return a.tested ? -1 : 1
    if (!a.tested) return a.num.localeCompare(b.num)
    if (b.weakness !== a.weakness) return b.weakness - a.weakness
    if (b.total !== a.total) return b.total - a.total
    return a.num.localeCompare(b.num)
  })
}
