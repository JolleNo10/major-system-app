import { describe, it, expect } from 'vitest'
import { isMastered } from './roundMastery'
import type { RoundStat, RoundAttempt } from '../components/RoundStatsPanel'

const FAST = 1680

function stat(attempts: RoundAttempt[]): RoundStat {
  return { correct: 0, wrong: 0, latencies: [], hintCount: 0, attempts }
}

describe('isMastered', () => {
  it('is false for an undefined stat', () => {
    expect(isMastered(undefined, FAST)).toBe(false)
  })

  it('is true after 2 trailing fast, un-hinted, correct answers', () => {
    expect(isMastered(stat([
      { ok: true, recallMs: 900, hinted: false },
      { ok: true, recallMs: 1000, hinted: false },
    ]), FAST)).toBe(true)
  })

  it('breaks the streak on a hint', () => {
    expect(isMastered(stat([
      { ok: true, recallMs: 900, hinted: false },
      { ok: true, recallMs: 900, hinted: true },
    ]), FAST)).toBe(false)
  })

  it('breaks the streak on a too-slow answer', () => {
    expect(isMastered(stat([
      { ok: true, recallMs: 900, hinted: false },
      { ok: true, recallMs: 5000, hinted: false },
    ]), FAST)).toBe(false)
  })

  it('breaks the streak on a wrong answer', () => {
    expect(isMastered(stat([
      { ok: true, recallMs: 900, hinted: false },
      { ok: false, recallMs: 900, hinted: false },
    ]), FAST)).toBe(false)
  })

  it('needs at least 2 reps', () => {
    expect(isMastered(stat([{ ok: true, recallMs: 900, hinted: false }]), FAST)).toBe(false)
  })
})
