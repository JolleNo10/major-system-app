import { describe, it, expect } from 'vitest'
import { paceFromTimings, PACE_FAST_MS, PACE_SLOW_MS } from '@/features/pi/anchors/anchorPace'

const t = (ms: number, at = ms) => ({ at, ms })

describe('paceFromTimings', () => {
  it('returns null with no samples', () => {
    expect(paceFromTimings([])).toBeNull()
  })

  it('fast when the median is at or under the fast threshold', () => {
    expect(paceFromTimings([t(1000), t(PACE_FAST_MS), t(2000)])).toBe('fast')
  })

  it('ok when the median sits between the thresholds', () => {
    expect(paceFromTimings([t(4000), t(5000), t(4500)])).toBe('ok')
  })

  it('slow when the median exceeds the slow threshold', () => {
    expect(paceFromTimings([t(PACE_SLOW_MS + 1)])).toBe('slow')
  })

  it('only weighs the last three timings, ordered by time', () => {
    // Four samples; the oldest (a huge stall) must drop out of the window.
    const samples = [t(20_000, 1), t(1000, 2), t(1200, 3), t(900, 4)]
    expect(paceFromTimings(samples)).toBe('fast')
  })
})
