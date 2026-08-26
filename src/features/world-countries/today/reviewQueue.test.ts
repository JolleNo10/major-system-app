import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesReviewSchedule } from '@/features/world-countries/learning/reviewSchedule'
import { recallTargetIdFor } from '@/features/world-countries/learning/recallTargets'
import {
  createWorldCountriesTodayReviewQueue,
  getCurrentWorldCountriesTodayReviewPrompt,
  isWorldCountriesTodayReviewQueueComplete,
  submitWorldCountriesTodayReviewPrompt,
} from './reviewQueue'
import { interleaveWorldCountriesTodayReviewCandidates } from './reviewInterleaving'
import type { WorldCountriesTodayReviewCandidate } from './todayPlan'

function candidates(count: number): WorldCountriesTodayReviewCandidate[] {
  return Array.from({ length: count }, (_, index) => {
    const country = countries[index]
    const skill = 'location-to-country' as const
    return {
      country,
      target: { countryId: country.id, skill },
      schedule: deriveWorldCountriesReviewSchedule([{ at: 1, ok: false, ms: 1 }], { localDate: '2026-08-19', milestoneAt: 1 }),
    }
  })
}

describe('World Countries Today review queue', () => {
  it('inserts one retry only after two other prompts', () => {
    const initial = createWorldCountriesTodayReviewQueue(candidates(3))
    const afterFirst = submitWorldCountriesTodayReviewPrompt(initial, 'incorrect')
    expect(getCurrentWorldCountriesTodayReviewPrompt(afterFirst)?.candidate.country.id).toBe(countries[1].id)
    const afterSecond = submitWorldCountriesTodayReviewPrompt(afterFirst, 'correct')
    expect(getCurrentWorldCountriesTodayReviewPrompt(afterSecond)?.candidate.country.id).toBe(countries[2].id)
    const afterThird = submitWorldCountriesTodayReviewPrompt(afterSecond, 'correct')
    expect(getCurrentWorldCountriesTodayReviewPrompt(afterThird)?.candidate.country.id).toBe(countries[0].id)
    expect(getCurrentWorldCountriesTodayReviewPrompt(afterThird)?.kind).toBe('retry')
  })

  it('does not create a retry when the prompt is too near the end', () => {
    const initial = createWorldCountriesTodayReviewQueue(candidates(2))
    const next = submitWorldCountriesTodayReviewPrompt(initial, 'incorrect')
    expect(next.prompts).toHaveLength(2)
    expect(isWorldCountriesTodayReviewQueueComplete(submitWorldCountriesTodayReviewPrompt(next, 'skip'))).toBe(true)
  })

  it('resolves retry success and keeps ordinary target identity', () => {
    const initial = createWorldCountriesTodayReviewQueue(candidates(3))
    const afterFirst = submitWorldCountriesTodayReviewPrompt(initial, 'incorrect')
    const afterSecond = submitWorldCountriesTodayReviewPrompt(afterFirst, 'correct')
    const afterThird = submitWorldCountriesTodayReviewPrompt(afterSecond, 'correct')
    const complete = submitWorldCountriesTodayReviewPrompt(afterThird, 'correct')
    expect(complete.recoveredOnRetry).toBe(1)
    expect(complete.unresolvedTargetIds).not.toContain(recallTargetIdFor(countries[0].id, 'location-to-country'))
  })

  it('keeps delayed retries working after the initial candidates are interleaved', () => {
    const initial = createWorldCountriesTodayReviewQueue(
      interleaveWorldCountriesTodayReviewCandidates(candidates(3)),
    )
    const afterFirst = submitWorldCountriesTodayReviewPrompt(initial, 'incorrect')
    const afterSecond = submitWorldCountriesTodayReviewPrompt(afterFirst, 'correct')
    const afterThird = submitWorldCountriesTodayReviewPrompt(afterSecond, 'correct')

    expect(getCurrentWorldCountriesTodayReviewPrompt(afterThird)?.kind).toBe('retry')
    expect(afterThird.prompts).toHaveLength(4)
  })
})
