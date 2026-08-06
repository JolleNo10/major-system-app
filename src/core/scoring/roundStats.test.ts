import { describe, it, expect } from 'vitest'
import { applyRoundAttempt } from '@/core/scoring/roundStats'

describe('applyRoundAttempt', () => {
  it('creates a fresh entry and records a correct answer', () => {
    const next = applyRoundAttempt({}, '07', { ok: true, rawMs: 1200, adjustedMs: 1000, hinted: false })
    expect(next['07']).toEqual({
      correct: 1,
      wrong: 0,
      lastMs: 1000,
      latencies: [1000],
      hintCount: 0,
      attempts: [{ ok: true, recallMs: 1000, hinted: false }],
    })
  })

  it('accumulates correct/wrong and hint counts across attempts', () => {
    let s = applyRoundAttempt({}, '07', { ok: true, rawMs: 900, adjustedMs: 800, hinted: false })
    s = applyRoundAttempt(s, '07', { ok: false, rawMs: 1500, adjustedMs: 1400, hinted: true })
    expect(s['07'].correct).toBe(1)
    expect(s['07'].wrong).toBe(1)
    expect(s['07'].hintCount).toBe(1)
    expect(s['07'].lastMs).toBe(1400)
    expect(s['07'].attempts).toHaveLength(2)
  })

  it('excludes outlier/zero latencies from the latencies array but still records the attempt', () => {
    const next = applyRoundAttempt({}, '07', { ok: true, rawMs: 0, adjustedMs: 500, hinted: false })
    expect(next['07'].latencies).toEqual([])
    expect(next['07'].attempts).toHaveLength(1)
    expect(next['07'].lastMs).toBe(500)
  })

  it('keeps only the last 5 attempts', () => {
    let s: ReturnType<typeof applyRoundAttempt> = {}
    for (let i = 0; i < 7; i++) {
      s = applyRoundAttempt(s, '07', { ok: true, rawMs: 1000, adjustedMs: 1000, hinted: false })
    }
    expect(s['07'].attempts).toHaveLength(5)
  })

  it('does not mutate the previous map', () => {
    const prev = {}
    applyRoundAttempt(prev, '07', { ok: true, rawMs: 1000, adjustedMs: 1000, hinted: false })
    expect(prev).toEqual({})
  })
})
