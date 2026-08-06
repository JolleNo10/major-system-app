import { describe, it, expect, beforeEach } from 'vitest'
import { rankByWeakness, itemWeakness } from '@/core/scoring/numberStats'
import type { ItemRecord } from '@/core/scoring/itemStore'

function mockStore(data: Record<string, unknown>) {
  const json = JSON.stringify(data)
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (k === 'major-item-data' ? json : null),
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage
}

const rec = (o: Partial<Record<string, unknown>>) => ({
  correct: 0, wrong: 0, latencies: [], hintCount: 0,
  ease: 2.5, intervalDays: 0, dueAt: 0, lastSeenAt: 1, reps: 0, ...o,
})

describe('rankByWeakness', () => {
  beforeEach(() => {
    mockStore({
      'enc:20': rec({ correct: 2, wrong: 3, latencies: [2500], ease: 1.5 }), // weak: wrong + slow + low ease
      'enc:10': rec({ correct: 8, wrong: 0, latencies: [900], ease: 2.5 }),  // strong
    })
  })

  it('ranks the weak number first, strong next, untested last', () => {
    const ranked = rankByWeakness('enc', ['10', '20', '30'])
    expect(ranked.map(r => r.num)).toEqual(['20', '10', '30'])
    expect(ranked[0].weakness).toBeGreaterThan(ranked[1].weakness)
    expect(ranked[2].tested).toBe(false)
  })

  it('decays the lifetime wrong-rate residual with the current streak', () => {
    mockStore({
      'enc:40': rec({ correct: 6, wrong: 4, latencies: [1000], ease: 2.5, reps: 0 }),
      'enc:41': rec({ correct: 6, wrong: 4, latencies: [1000], ease: 2.5, reps: 6 }), // same history, on a streak
    })
    const [a] = rankByWeakness('enc', ['40'])
    const [b] = rankByWeakness('enc', ['41'])
    expect(b.weakness).toBeLessThan(a.weakness)
    expect(b.onStreak).toBe(true)
  })
})

const item = (o: Partial<ItemRecord>): ItemRecord => ({
  correct: 0, wrong: 0, latencies: [], hintCount: 0,
  ease: 2.5, intervalDays: 0, dueAt: 0, lastSeenAt: 1, reps: 0, ...o,
})

describe('itemWeakness', () => {
  it('is 0 for a fresh/perfect item and positive for a struggling one', () => {
    expect(itemWeakness(item({}))).toBe(0)
    expect(itemWeakness(item({ correct: 1, wrong: 4, latencies: [2500], ease: 1.5 }))).toBeGreaterThan(0)
  })

  it('penalises low ease, slow recall, and lifetime wrong-rate', () => {
    const easy = item({ correct: 10, wrong: 0, latencies: [800], ease: 2.5 })
    const hard = item({ correct: 3, wrong: 7, latencies: [2500], ease: 1.3 })
    expect(itemWeakness(hard)).toBeGreaterThan(itemWeakness(easy))
  })

  it('stays within 0..1', () => {
    const worst = item({ correct: 0, wrong: 10, latencies: [30000], ease: 1.3 })
    const w = itemWeakness(worst)
    expect(w).toBeGreaterThanOrEqual(0)
    expect(w).toBeLessThanOrEqual(1)
  })
})
