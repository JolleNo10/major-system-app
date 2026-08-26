import { describe, expect, it } from 'vitest'
import {
  addWorldCountriesCalendarDays,
  deriveWorldCountriesReviewSchedule,
  WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS,
} from './reviewSchedule'

function attempt(at: number, ok: boolean, localDate?: string, evidenceKind: 'recall' | 'recognition' = 'recall') {
  return { at, ok, ms: 100, evidenceKind, ...(localDate === undefined ? {} : { localDate }) }
}

describe('World Countries Today review scheduling', () => {
  it('does not introduce failure-only history', () => {
    expect(deriveWorldCountriesReviewSchedule([attempt(1, false)], { localDate: '2026-08-19' })).toMatchObject({
      introduced: false,
      due: false,
      reason: 'not-introduced',
    })
  })

  it('makes recognition and legacy success introduced but due until typed recall', () => {
    expect(deriveWorldCountriesReviewSchedule([attempt(1, true, '2026-08-18', 'recognition')], { localDate: '2026-08-19' })).toMatchObject({
      introduced: true,
      due: true,
      reason: 'missing-recall-success',
      priorityTier: 2,
    })
    expect(deriveWorldCountriesReviewSchedule([{ at: 1, ok: true, ms: 100 }], { localDate: '2026-08-19' })).toMatchObject({
      introduced: true,
      due: true,
      reason: 'missing-recall-success',
    })
  })

  it('gives a latest failure immediate priority', () => {
    expect(deriveWorldCountriesReviewSchedule([
      attempt(1, true, '2026-08-10'),
      attempt(2, true, '2026-08-11'),
      attempt(3, false, '2026-08-12'),
    ], { localDate: '2026-08-19' })).toMatchObject({
      due: true,
      reason: 'latest-failure',
      priorityTier: 1,
    })
  })

  it('counts same-day recall successes once and uses calendar-day intervals', () => {
    const sameDay = deriveWorldCountriesReviewSchedule([
      attempt(1, true, '2026-08-10'),
      attempt(2, true, '2026-08-10'),
    ], { localDate: '2026-08-10' })
    expect(sameDay.qualifyingRecallDates).toEqual(['2026-08-10'])
    expect(sameDay.nextDueDate).toBe('2026-08-11')

    const twoDates = deriveWorldCountriesReviewSchedule([
      attempt(1, true, '2026-08-31'),
      attempt(2, true, '2026-09-01'),
    ], { localDate: '2026-09-03' })
    expect(twoDates.nextDueDate).toBe('2026-09-04')
    expect(addWorldCountriesCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('requires a valid local date to advance spacing', () => {
    expect(deriveWorldCountriesReviewSchedule([
      attempt(1, true, 'not-a-date'),
    ], { localDate: '2026-08-19' })).toMatchObject({
      introduced: true,
      due: true,
      reason: 'missing-recall-success',
    })
  })

  it('seeds a no-attempt milestone target after 24 elapsed hours', () => {
    const milestoneAt = Date.UTC(2026, 7, 18, 12)
    expect(deriveWorldCountriesReviewSchedule([], { now: milestoneAt + 23 * 60 * 60 * 1000 })).toMatchObject({
      introduced: false,
      due: false,
    })
    expect(deriveWorldCountriesReviewSchedule([], { now: milestoneAt + 24 * 60 * 60 * 1000, milestoneAt })).toMatchObject({
      introduced: true,
      due: true,
      reason: 'scheduled',
      priorityTier: 3,
    })
  })

  it('keeps the fixed ladder and advances once per clean recall day', () => {
    const intervals = WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS.map((intervalDays, index) => {
      const attempts = Array.from({ length: index + 1 }, (_, dayIndex) => attempt(
        dayIndex + 1,
        true,
        addWorldCountriesCalendarDays('2026-08-01', dayIndex),
      ))
      return deriveWorldCountriesReviewSchedule(attempts, { localDate: '2026-09-01' }).intervalDays
    })
    expect(intervals).toEqual([...WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS])
  })

  it('regresses one level for an isolated lapse and same-day recovery', () => {
    const schedule = deriveWorldCountriesReviewSchedule([
      ...Array.from({ length: 5 }, (_, index) => attempt(index + 1, true, addWorldCountriesCalendarDays('2026-08-01', index))),
      attempt(6, false, '2026-08-06'),
      attempt(7, true, '2026-08-06'),
    ], { localDate: '2026-08-20' })

    expect(schedule).toMatchObject({
      difficulty: 'lapse',
      spacingLevel: 3,
      intervalDays: 14,
      nextDueDate: '2026-08-20',
    })
  })

  it('regresses two levels for repeated difficulty before recovery clears it', () => {
    const schedule = deriveWorldCountriesReviewSchedule([
      ...Array.from({ length: 4 }, (_, index) => attempt(index + 1, true, addWorldCountriesCalendarDays('2026-08-01', index))),
      attempt(5, false, '2026-08-05'),
      attempt(6, true, '2026-08-06'),
      attempt(7, false, '2026-08-07'),
    ], { localDate: '2026-08-07' })

    expect(schedule).toMatchObject({
      due: true,
      reason: 'latest-failure',
      difficulty: 'repeated',
      spacingLevel: 1,
      intervalDays: 3,
    })
  })

  it('clears difficulty after two clean recall days and treats a later lapse as isolated', () => {
    const schedule = deriveWorldCountriesReviewSchedule([
      attempt(1, true, '2026-08-01'),
      attempt(2, false, '2026-08-02'),
      attempt(3, true, '2026-08-03'),
      attempt(4, true, '2026-08-04'),
      attempt(5, false, '2026-08-05'),
    ], { localDate: '2026-08-05' })

    expect(schedule).toMatchObject({
      difficulty: 'lapse',
      spacingLevel: 1,
      intervalDays: 3,
    })
  })

  it('counts several failures and a same-day recovery as one lapse day', () => {
    const schedule = deriveWorldCountriesReviewSchedule([
      attempt(1, true, '2026-08-01'),
      attempt(2, true, '2026-08-02'),
      attempt(3, true, '2026-08-03'),
      attempt(4, false, '2026-08-04'),
      attempt(5, false, '2026-08-04'),
      attempt(6, true, '2026-08-04'),
    ], { localDate: '2026-08-04' })

    expect(schedule).toMatchObject({ difficulty: 'lapse', spacingLevel: 1, intervalDays: 3 })
  })

  it('does not turn undated failures into dated difficulty events', () => {
    const schedule = deriveWorldCountriesReviewSchedule([
      attempt(1, true, '2026-08-01'),
      attempt(2, false),
    ], { localDate: '2026-08-02' })

    expect(schedule).toMatchObject({
      difficulty: 'normal',
      spacingLevel: 0,
      intervalDays: 1,
      reason: 'latest-failure',
    })
  })
})
