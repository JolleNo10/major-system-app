import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesReviewSchedule } from '@/features/world-countries/learning/reviewSchedule'
import {
  classifyWorldCountriesTodayReviewReason,
  summarizeWorldCountriesTodayReviewReasons,
  worldCountriesTodayReviewReasonLabel,
} from './reviewReason'
import type { WorldCountriesTodayReviewCandidate } from './todayPlan'

function candidate(
  countryId: string,
  schedule: WorldCountriesTodayReviewCandidate['schedule'],
): WorldCountriesTodayReviewCandidate {
  const country = countries.find(entry => entry.id === countryId)!
  return { country, target: { countryId, skill: 'location-to-country' }, schedule }
}

const recentMistake = deriveWorldCountriesReviewSchedule([
  { at: 1, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-01' },
  { at: 2, ok: false, ms: 1, evidenceKind: 'recall', localDate: '2026-08-02' },
], { localDate: '2026-08-02' })

const mistakeFollowUp = deriveWorldCountriesReviewSchedule([
  { at: 1, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-01' },
  { at: 2, ok: false, ms: 1, evidenceKind: 'recall', localDate: '2026-08-02' },
  { at: 3, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-02' },
], { localDate: '2026-08-03' })

const repeatedDifficulty = deriveWorldCountriesReviewSchedule([
  { at: 1, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-01' },
  { at: 2, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-02' },
  { at: 3, ok: false, ms: 1, evidenceKind: 'recall', localDate: '2026-08-03' },
  { at: 4, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-04' },
  { at: 5, ok: false, ms: 1, evidenceKind: 'recall', localDate: '2026-08-05' },
  { at: 6, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-05' },
], { localDate: '2026-08-06' })

describe('World Countries Today review reasons', () => {
  it('uses the specified semantic precedence and user-facing labels', () => {
    const schedules = [
      [repeatedDifficulty, 'repeated-difficulty', 'Repeated difficulty · shorter follow-up'],
      [recentMistake, 'recent-mistake', 'Recent mistake'],
      [mistakeFollowUp, 'mistake-follow-up', 'Mistake follow-up'],
      [deriveWorldCountriesReviewSchedule([{ at: 1, ok: true, ms: 1, evidenceKind: 'recognition' }], { localDate: '2026-08-19' }), 'needs-first-recall', 'Needs first recall'],
      [deriveWorldCountriesReviewSchedule([], { now: 1 + 24 * 60 * 60 * 1000, milestoneAt: 1 }), 'first-review-after-learning', 'First review after Learning'],
      [deriveWorldCountriesReviewSchedule([{ at: 1, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-01' }], { localDate: '2026-08-03' }), 'spaced-review', 'Spaced review · 1 day overdue'],
    ] as const

    for (const [schedule, reason, label] of schedules) {
      const actualReason = classifyWorldCountriesTodayReviewReason(candidate('NO', schedule))
      expect(actualReason).toBe(reason)
      expect(worldCountriesTodayReviewReasonLabel(actualReason, schedule.overdueDays)).toBe(label)
    }
  })

  it('groups mistake reasons and keeps repeated difficulty visible in the summary', () => {
    const summary = summarizeWorldCountriesTodayReviewReasons([
      candidate('NO', recentMistake),
      candidate('SE', mistakeFollowUp),
      candidate('FI', repeatedDifficulty),
      candidate('DK', deriveWorldCountriesReviewSchedule([{ at: 1, ok: true, ms: 1, evidenceKind: 'recognition' }], { localDate: '2026-08-19' })),
    ])

    expect(summary).toEqual({
      mistakes: 3,
      firstRecall: 1,
      firstReviewAfterLearning: 0,
      spaced: 0,
      repeated: 1,
    })
  })
})
