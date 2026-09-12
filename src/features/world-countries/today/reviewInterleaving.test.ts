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
  it('represents eight distinct Countries when more than eight are due in one tier', () => {
    const queue = interleaveWorldCountriesTodayReviewCandidates(
      countries.slice(0, 14).map(country => candidate(country.id)),
    )

    expect(queue).toHaveLength(8)
    expect(new Set(queue.map(entry => entry.country.id)).size).toBe(8)
  })

  it('consumes a complete higher-priority tier before entering a lower one', () => {
    const input = [
      candidate('NO', 'location-to-country', 1),
      candidate('SE', 'country-to-capital', 1),
      candidate('FI', 'location-to-country', 1),
      ...['KE', 'GH', 'JP', 'TH', 'AU', 'BR', 'CA'].map(countryId => candidate(countryId, 'location-to-country', 2)),
    ]

    const queue = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)
    expect(queue.slice(0, 3).every(entry => entry.schedule.priorityTier === 1)).toBe(true)
    expect(queue).toHaveLength(8)
  })

  it('separates the same Country skills while unseen Countries remain', () => {
    const input = countries.slice(0, 6).flatMap(country => [
      candidate(country.id, 'location-to-country'),
      candidate(country.id, 'country-to-capital'),
    ])
    const queue = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)

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
    ], 8, () => 0)

    expect(queue.map(entry => entry.country.id)).toEqual(['NO', 'FI', 'SE'])
  })

  it('prefers a different Subregion after skill alternatives tie', () => {
    const queue = interleaveWorldCountriesTodayReviewCandidates([
      candidate('NO'),
      candidate('SE'),
      candidate('DE'),
    ], 8, () => 0)

    expect(queue.map(entry => entry.country.id)).toEqual(['NO', 'DE', 'SE'])
  })

  it('prefers a different Continent when equally urgent alternatives exist', () => {
    const input = ['FR', 'DE', 'NO', 'KE', 'GH', 'JP', 'TH', 'AU']
      .map(countryId => candidate(countryId))
    const queue = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)

    expect(queue).toHaveLength(8)
    expect(queue.every((entry, index) => index === 0 || entry.country.continent !== queue[index - 1].country.continent)).toBe(true)
  })

  it('keeps every selected candidate unique and in the supplied candidate set', () => {
    const input = ['FR', 'DE', 'NO', 'KE', 'GH', 'JP', 'TH', 'AU', 'BR', 'CA']
      .map(countryId => candidate(countryId))
    const queue = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)

    expect(queue).toHaveLength(8)
    expect(new Set(queue.map(entry => entry.country.id)).size).toBe(queue.length)
    expect(queue.every(entry => input.includes(entry))).toBe(true)
  })

  it('continues normally when all candidates share one Continent', () => {
    const input = ['NO', 'SE', 'DE', 'FR', 'IT', 'ES', 'GR']
      .map(countryId => candidate(countryId))
    const queue = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)

    expect(queue).toHaveLength(input.length)
    expect(new Set(queue.map(entry => entry.country.continent))).toEqual(new Set(['Europe']))
  })

  it('uses supplied randomness for equivalent choices without changing membership or urgency', () => {
    const input = ['FR', 'DE', 'NO', 'KE', 'GH', 'JP', 'TH', 'AU']
      .map(countryId => candidate(countryId))
    const first = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)
    const second = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0.999)

    expect(second.map(entry => entry.country.id)).not.toEqual(first.map(entry => entry.country.id))
    expect(new Set(second.map(entry => entry.country.id))).toEqual(new Set(first.map(entry => entry.country.id)))
    expect(new Set(second.map(entry => entry.schedule.priorityTier))).toEqual(new Set([1]))
  })

  it('falls back when diversity is impossible', () => {
    const input = [candidate('NO'), candidate('NO', 'country-to-capital')]
    const first = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)
    const second = interleaveWorldCountriesTodayReviewCandidates(input, 8, () => 0)

    expect(first).toEqual(second)
    expect(first.map(entry => entry.target.skill)).toEqual([
      'location-to-country',
      'country-to-capital',
    ])
  })
})
