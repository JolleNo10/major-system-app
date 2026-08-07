import { describe, it, expect, beforeEach } from 'vitest'
import { pickWeighted } from '@/core/scoring/quiz'

// Empty item store → every number gets the same flat baseline weight, so the only
// thing steering the draw is the mastered/unmastered pool split we're testing.
function mockEmptyStore() {
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage
}

const NUMS = ['01', '02', '03', '04', '05']

describe('pickWeighted two-pool selection', () => {
  beforeEach(mockEmptyStore)

  it('returns the only available item', () => {
    expect(pickWeighted('enc', ['07'], new Set())).toBe('07')
  })

  it('with share=1 never draws a mastered item while any unmastered remain', () => {
    const mastered = new Set(['01', '02', '03', '04']) // 4 of 5 mastered
    for (let i = 0; i < 200; i++) {
      expect(pickWeighted('enc', NUMS, mastered, 1)).toBe('05')
    }
  })

  it('with share=0 always draws from the mastered pool when the set is mixed', () => {
    const mastered = new Set(['01', '02'])
    for (let i = 0; i < 200; i++) {
      expect(mastered.has(pickWeighted('enc', NUMS, mastered, 0))).toBe(true)
    }
  })

  it('falls back to the full set when everything is mastered', () => {
    const mastered = new Set(NUMS)
    for (let i = 0; i < 50; i++) {
      expect(NUMS).toContain(pickWeighted('enc', NUMS, mastered, 1))
    }
  })

  it('draws only unmastered when nothing is mastered', () => {
    for (let i = 0; i < 50; i++) {
      expect(NUMS).toContain(pickWeighted('enc', NUMS, new Set(), 0.5))
    }
  })

  it('the last unmastered item keeps appearing even when most are mastered (≈ share)', () => {
    const mastered = new Set(['01', '02', '03', '04']) // 4 of 5 mastered
    let hits = 0
    const runs = 2000
    for (let i = 0; i < runs; i++) {
      if (pickWeighted('enc', NUMS, mastered, 0.5) === '05') hits++
    }
    // At 50/50 the single unmastered item should command ~half of all draws,
    // nothing like the tiny 1/5 share a count-based weighting would give it.
    expect(hits / runs).toBeGreaterThan(0.4)
    expect(hits / runs).toBeLessThan(0.6)
  })
})
