import { describe, it, expect } from 'vitest'
import { gradeAnswer, applySm2 } from './sm2'
import { type ItemRecord } from './itemStore'

const base: ItemRecord = {
  correct: 0, wrong: 0, latencies: [], hintCount: 0,
  ease: 2.5, intervalDays: 0, dueAt: 0, lastSeenAt: 0, reps: 0,
}

describe('gradeAnswer', () => {
  it('grades a wrong answer 2', () => {
    expect(gradeAnswer(false, 500, 'multiple-choice')).toBe(2)
  })
  it('grades fast/mid/slow correct answers 5/4/3', () => {
    expect(gradeAnswer(true, 1000, 'multiple-choice')).toBe(5) // <= FAST 1200
    expect(gradeAnswer(true, 1600, 'multiple-choice')).toBe(4) // between
    expect(gradeAnswer(true, 2500, 'multiple-choice')).toBe(3) // >= SLOW 2000
  })
})

describe('applySm2', () => {
  it('resets reps/interval and lowers ease on a lapse (grade < 3)', () => {
    const r = applySm2({ ...base, reps: 4, intervalDays: 20, ease: 2.5 }, 2)
    expect(r.reps).toBe(0)
    expect(r.intervalDays).toBe(0)
    expect(r.ease).toBeCloseTo(2.3)
  })

  it('progresses intervals 1 → 3 → interval*ease on successive fast passes', () => {
    const a = applySm2(base, 5)
    expect(a.reps).toBe(1)
    expect(a.intervalDays).toBe(1)
    expect(a.ease).toBeCloseTo(2.6)

    const b = applySm2(a, 5)
    expect(b.reps).toBe(2)
    expect(b.intervalDays).toBe(3)

    const c = applySm2(b, 5)
    expect(c.reps).toBe(3)
    expect(c.intervalDays).toBe(Math.round(3 * b.ease))
  })

  it('does not raise ease above start on a slow (grade 3) pass', () => {
    const r = applySm2(base, 3)
    expect(r.ease).toBeCloseTo(2.36)
    expect(r.intervalDays).toBe(1)
  })

  it('never lets ease fall below 1.3', () => {
    let r = { ...base, ease: 1.4 }
    r = applySm2(r, 2)
    expect(r.ease).toBeGreaterThanOrEqual(1.3)
  })
})
