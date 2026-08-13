import { describe, it, expect } from 'vitest'
import {
  makeRoundConfig, calcInterval, initRoundState, selectNext, recordAnswer, roundProgress,
  type RoundState,
} from '@/core/scoring/roundScheduler'

const SETTINGS = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }
const FAST = 100  // well under fastMs
const SLOW = 999_999
const cfg20 = makeRoundConfig(20, SETTINGS)

// Answer `key` correctly & fast until it can't advance further, letting `gap`
// questions pass between each recall (so spacing requirements are met).
function correctFast(state: RoundState, key: string) {
  return recordAnswer(state, key, { correct: true, recallMs: FAST, hinted: false }, cfg20)
}
function advanceSeq(state: RoundState, n: number): RoundState {
  // Burn n sequence steps on a throwaway key so spacing accrues for `key`.
  let s = state
  for (let i = 0; i < n; i++) s = recordAnswer(s, `_pad${i}`, { correct: true, recallMs: FAST, hinted: false }, cfg20)
  return s
}

describe('makeRoundConfig', () => {
  it('reproduces the spec baseline weights at share 0.5', () => {
    expect(cfg20.needByLevel).toEqual([2.0, 1.5, 1.0, 0.7])
    expect(cfg20.needUnseen).toBeCloseTo(2.2)
  })
  it('flattens need weights toward 1 at share 0', () => {
    const c = makeRoundConfig(20, { ...SETTINGS, sessionUnmasteredShare: 0 })
    expect(c.needByLevel).toEqual([1, 1, 1, 1])
    expect(c.needUnseen).toBeCloseTo(1)
  })
  it('derives a batch-relative minimum gap (clamped 1..5)', () => {
    expect(makeRoundConfig(10, SETTINGS).minimumGap).toBe(2) // round(1.5)=2
    expect(makeRoundConfig(50, SETTINGS).minimumGap).toBe(5) // round(7.5)=8 → clamp 5
    expect(makeRoundConfig(4, SETTINGS).minimumGap).toBe(1)  // round(0.6)=1
  })
  it('interval factors grow with mastery level', () => {
    expect(calcInterval(0, cfg20)).toBe(2) // 0 → clamped up to min
    expect(calcInterval(1, cfg20)).toBe(5) // 0.25*20
    expect(calcInterval(2, cfg20)).toBe(15) // 0.75*20
    expect(calcInterval(3, cfg20)).toBe(30) // 1.5*20
  })
})

describe('recordAnswer mastery progression', () => {
  it('first correct answer reaches level 1', () => {
    const s = correctFast(initRoundState(), 'A')
    expect(s.q['A'].masteryLevel).toBe(1)
    expect(s.seq).toBe(1)
  })

  it('a too-quick repeat does NOT advance to level 2 (needs spacing)', () => {
    let s = correctFast(initRoundState(), 'A')        // → level 1, targetInterval 5
    s = correctFast(s, 'A')                            // distance 1 < 5 → no advance
    expect(s.q['A'].masteryLevel).toBe(1)
  })

  it('a correct recall after sufficient spacing advances to level 2 (mastered)', () => {
    let s = correctFast(initRoundState(), 'A')        // level 1 at seq 0
    s = advanceSeq(s, 5)                               // 5 other questions
    s = correctFast(s, 'A')                            // distance ≥ 5 → advance
    expect(s.q['A'].masteryLevel).toBe(2)
  })

  it('a slow answer does not advance mastery (speed gate)', () => {
    let s = correctFast(initRoundState(), 'A')        // level 1
    s = advanceSeq(s, 5)
    s = recordAnswer(s, 'A', { correct: true, recallMs: SLOW, hinted: false }, cfg20)
    expect(s.q['A'].masteryLevel).toBe(1)
  })

  it('a hinted answer does not advance mastery', () => {
    let s = recordAnswer(initRoundState(), 'A', { correct: true, recallMs: FAST, hinted: true }, cfg20)
    expect(s.q['A'].masteryLevel).toBe(0)
  })

  it('a wrong answer regresses one level and shortens the interval', () => {
    let s = correctFast(initRoundState(), 'A')        // level 1, interval 5
    s = advanceSeq(s, 5)
    s = correctFast(s, 'A')                            // level 2, interval 15
    s = recordAnswer(s, 'A', { correct: false, recallMs: FAST, hinted: false }, cfg20)
    expect(s.q['A'].masteryLevel).toBe(1)
    expect(s.q['A'].targetInterval).toBe(8) // round(15 * 0.5)
    expect(s.q['A'].consecutiveCorrect).toBe(0)
  })

  it('caps mastery at level 3 (confirmed)', () => {
    let s = correctFast(initRoundState(), 'A')
    for (let i = 0; i < 5; i++) { s = advanceSeq(s, 40); s = correctFast(s, 'A') }
    expect(s.q['A'].masteryLevel).toBe(3)
  })
})

describe('selectNext', () => {
  it('returns the only key for a single-item batch', () => {
    const cfg = makeRoundConfig(1, SETTINGS)
    const s = recordAnswer(initRoundState(), 'A', { correct: true, recallMs: FAST, hinted: false }, cfg)
    expect(selectNext(s, ['A'], cfg)).toBe('A')
  })

  it('never picks a key inside the hard anti-repeat gap when alternatives exist', () => {
    const keys = ['A', 'B', 'C', 'D', 'E']
    let s = initRoundState()
    let prev: string | null = null
    for (let i = 0; i < 300; i++) {
      const k = selectNext(s, keys, cfg20)
      expect(k).not.toBe(prev) // minimumGap ≥ 1 forbids immediate repeat
      s = recordAnswer(s, k, { correct: true, recallMs: FAST, hinted: false }, cfg20)
      prev = k
    }
  })

  it('does not immediately repeat a just-answered item in a small batch', () => {
    const keys = ['A', 'B', 'C']
    const cfg = makeRoundConfig(keys.length, SETTINGS)
    let s = initRoundState()
    const first = selectNext(s, keys, cfg, () => 0)
    s = recordAnswer(s, first, { correct: false, recallMs: FAST, hinted: false }, cfg)

    expect(selectNext(s, keys, cfg, () => 0.1)).not.toBe(first)
  })

  it('does not select a zero-weight item when random sampling starts at zero', () => {
    const keys = ['A', 'B', 'C']
    const cfg = makeRoundConfig(keys.length, SETTINGS)
    let s = initRoundState()
    const first = selectNext(s, keys, cfg, () => 0)
    s = recordAnswer(s, first, { correct: false, recallMs: FAST, hinted: false }, cfg)

    expect(selectNext(s, keys, cfg, () => 0)).not.toBe(first)
  })

  it('introduces all unseen questions quickly (avg coverage well under 2× batch)', () => {
    const keys = Array.from({ length: 10 }, (_, i) => `Q${i}`)
    const cfg = makeRoundConfig(10, SETTINGS)
    let totalDraws = 0
    const trials = 500
    for (let t = 0; t < trials; t++) {
      let s = initRoundState()
      const seen = new Set<string>()
      let draws = 0
      while (seen.size < keys.length && draws < 200) {
        const k = selectNext(s, keys, cfg)
        seen.add(k)
        s = recordAnswer(s, k, { correct: true, recallMs: FAST, hinted: false }, cfg)
        draws++
      }
      totalDraws += draws
    }
    expect(totalDraws / trials).toBeLessThan(20) // full 10-item coverage in < 2× batch on average
  })
})

describe('roundProgress', () => {
  it('reports continuous mastery and per-level counts', () => {
    let s = initRoundState()
    s = correctFast(s, 'A')            // level 1
    s = advanceSeq(s, 5); s = correctFast(s, 'A') // level 2
    // B stays unseen (level 0)
    const p = roundProgress(s, ['A', 'B'], cfg20)
    expect(p.levelOf('A')).toBe(2)
    expect(p.masteredSet.has('A')).toBe(true)
    expect(p.mastered).toBe(1)
    expect(p.total).toBe(2)
    expect(p.all).toBe(false)
    expect(p.pct).toBeCloseTo(0.5) // (1 + 0) / 2
  })

  it('all=true once every question is mastered', () => {
    let s = initRoundState()
    for (const k of ['A', 'B']) {
      s = correctFast(s, k)
      s = advanceSeq(s, 5)
      s = correctFast(s, k)
    }
    const p = roundProgress(s, ['A', 'B'], cfg20)
    expect(p.all).toBe(true)
  })
})
