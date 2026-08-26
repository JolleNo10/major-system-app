import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesReviewSchedule } from '@/features/world-countries/learning/reviewSchedule'
import type { WorldCountriesCoreRecallSkill } from '@/features/world-countries/learning/recallTargets'
import {
  interleaveWorldCountriesTodayReviewCandidates,
} from './reviewInterleaving'
import type { WorldCountriesTodayReviewCandidate } from './todayPlan'

function candidate(
  countryId: string,
  skill: WorldCountriesCoreRecallSkill = 'location-to-country',
  tier: 1 | 2 | 3 = 1,
): WorldCountriesTodayReviewCandidate {
  const country = countries.find(entry => entry.id === countryId)!
  const schedule = tier === 1
    ? deriveWorldCountriesReviewSchedule([{ at: 1, ok: false, ms: 1 }], { milestoneAt: 1 })
    : tier === 2
      ? deriveWorldCountriesReviewSchedule([{ at: 1, ok: true, ms: 1, evidenceKind: 'recognition' }], { localDate: '2026-08-19' })
      : deriveWorldCountriesReviewSchedule([{ at: 1, ok: true, ms: 1, evidenceKind: 'recall', localDate: '2026-08-01' }], { localDate: '2026-08-19' })
  return { country, target: { countryId, skill }, schedule }
}

describe('World Countries Today review interleaving', () => {
  it('represents twelve distinct Countries when more than twelve are due in one tier', () => {
    const queue = interleaveWorldCountriesTodayReviewCandidates(
      countries.slice(0, 14).map(country => candidate(country.id)),
    )

    expect(queue).toHaveLength(12)
    expect(new Set(queue.map(entry => entry.country.id)).size).toBe(12)
  })

  it('consumes a complete higher-priority tier before entering a lower one', () => {
    const input = [
      candidate('NO', 'location-to-country', 1),
      candidate('SE', 'country-to-capital', 1),
      candidate('FI', 'location-to-country', 1),
      ...countries.slice(3, 15).map(country => candidate(country.id, 'location-to-country', 2)),
    ]

    const queue = interleaveWorldCountriesTodayReviewCandidates(input)
    expect(queue.slice(0, 3).every(entry => entry.schedule.priorityTier === 1)).toBe(true)
    expect(queue).toHaveLength(12)
  })

  it('separates the same Country skills while unseen Countries remain', () => {
    const input = countries.slice(0, 6).flatMap(country => [
      candidate(country.id, 'location-to-country'),
      candidate(country.id, 'country-to-capital'),
    ])
    const queue = interleaveWorldCountriesTodayReviewCandidates(input)

    expect(queue.slice(0, 6).map(entry => entry.country.id)).toEqual(
      countries.slice(0, 6).map(country => country.id),
    )
    expect(queue.slice(0, 6).map(entry => entry.target.skill)).toEqual([
      'location-to-country',
      'country-to-capital',
      'location-to-country',
      'country-to-capital',
      'location-to-country',
      'country-to-capital',
    ])
  })

  it('prefers a different skill when an unseen Country offers one', () => {
    const queue = interleaveWorldCountriesTodayReviewCandidates([
      candidate('NO', 'location-to-country'),
      candidate('SE', 'location-to-country'),
      candidate('FI', 'country-to-capital'),
    ])

    expect(queue.map(entry => entry.country.id)).toEqual(['NO', 'FI', 'SE'])
  })

  it('prefers a different Subregion after skill alternatives tie', () => {
    const queue = interleaveWorldCountriesTodayReviewCandidates([
      candidate('NO'),
      candidate('SE'),
      candidate('DE'),
    ])

    expect(queue.map(entry => entry.country.id)).toEqual(['NO', 'DE', 'SE'])
  })

  it('is deterministic and falls back when diversity is impossible', () => {
    const input = [candidate('NO'), candidate('NO', 'country-to-capital')]
    const first = interleaveWorldCountriesTodayReviewCandidates(input)
    const second = interleaveWorldCountriesTodayReviewCandidates(input)

    expect(first).toEqual(second)
    expect(first.map(entry => entry.target.skill)).toEqual([
      'location-to-country',
      'country-to-capital',
    ])
  })
})
