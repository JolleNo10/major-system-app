import type { Direction } from '../types'
import { loadStore, getItem, medianMs, SLOW_MS } from '../data/itemStore'

// All-time per-number weakness ranking for one direction.
// "Worst" is biased toward RECENT performance, not lifetime history:
//   - easePenalty (SM-2 ease) — recent difficulty; drops on recent wrongs/slowness,
//     recovers as you answer well. Already the signal pickWeighted drills by.
//   - normLatency — median of the rolling last-10 latencies (recall-adjusted).
//   - residual — lifetime wrongRate, but DECAYED by the current correct streak so
//     old mistakes fade as you relearn a number (and snap back on the next miss).
// This keeps ~80% of the weight on recent behaviour vs the old 60% lifetime wrongRate.
const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3
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

export function rankByWeakness(dir: Direction, nums: string[]): NumberStat[] {
  const store = loadStore()
  const slowThreshold = SLOW_MS['multiple-choice']

  const stats: NumberStat[] = nums.map(num => {
    const item = getItem(store, dir, num)
    const total = item.correct + item.wrong
    const median = medianMs(item.latencies)
    const wrongRate = total > 0 ? item.wrong / total : 0
    const normLatency = median ? Math.min(1, median / slowThreshold) : 0
    const easePenalty = Math.max(0, Math.min(1,
      (DEFAULT_EASE - (item.ease ?? DEFAULT_EASE)) / (DEFAULT_EASE - MIN_EASE)))
    // Lifetime wrongRate decayed by demonstrated recent recall: forgets old
    // mistakes as reps accrue, resets to full weight the moment reps drops to 0.
    const residual = wrongRate * Math.pow(DECAY_PER_REP, item.reps)

    return {
      num,
      correct: item.correct,
      wrong: item.wrong,
      total,
      median,
      weakness: easePenalty * 0.55 + normLatency * 0.25 + residual * 0.2,
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
