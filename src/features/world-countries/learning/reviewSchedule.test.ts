import { describe, expect, it } from 'vitest'
import { addWorldCountriesCalendarDays, deriveWorldCountriesReviewSchedule } from './reviewSchedule'

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
})
