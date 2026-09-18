import { describe, expect, it } from 'vitest'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import type { WorldCountriesRecallHistoryAttempt } from '@/features/world-countries/learning/recallHistory'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { recallTargetIdFor, type WorldCountriesCoreRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { buildWorldCountriesTodayPlan } from './todayPlan'

const TEST_NOW = Date.UTC(2026, 7, 19, 12)
const TEST_LOCAL_DATE = '2026-08-19'
const TEST_PREVIOUS_LOCAL_DATE = '2026-08-18'
const TEST_TWO_DAYS_AGO_LOCAL_DATE = '2026-08-17'

function deriveTestHistory(
  config: { countryIds: readonly string[]; skills: readonly WorldCountriesCoreRecallSkill[] },
  attempts: readonly WorldCountriesRecallHistoryAttempt[],
) {
  return deriveWorldCountriesRecallHistory(config, attempts.map(attempt => ({
    attemptType: 'review' as const,
    ...attempt,
  })))
}

function historyFor(
  attempts: readonly { itemId: string; at: number; ok: boolean; ms?: number; evidenceKind?: 'recall' | 'recognition'; localDate?: string }[],
  countryIds: readonly string[] = ['NO'],
) {
  return deriveTestHistory({
    countryIds,
    skills: ['location-to-country', 'country-to-capital'],
  }, attempts.map(attempt => ({ ms: 100, ...attempt })))
}

function completeCoreHistory(countryIds: readonly string[] = ['NO']) {
  return deriveTestHistory(
    { countryIds, skills: ['location-to-country', 'country-to-capital'] },
    countryIds.flatMap(countryId => [
      { itemId: `world-countries:location-to-country:${countryId}`, at: 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
      { itemId: `world-countries:location-to-country:${countryId}`, at: 2, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
      { itemId: `world-countries:location-to-country:${countryId}`, at: 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-12' },
      { itemId: `world-countries:country-to-capital:${countryId}`, at: 4, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
      { itemId: `world-countries:country-to-capital:${countryId}`, at: 5, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
      { itemId: `world-countries:country-to-capital:${countryId}`, at: 6, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-12' },
    ]),
  )
}

function dueHistoryFor(countryIds: readonly string[]) {
  return deriveTestHistory(
    { countryIds, skills: ['location-to-country', 'country-to-capital'] },
    countryIds.flatMap((countryId, index) => [
      {
        itemId: `world-countries:location-to-country:${countryId}`,
        at: index + 1,
        ok: true,
        ms: 100,
        evidenceKind: 'recall' as const,
        localDate: '2026-08-10',
      },
      {
        itemId: `world-countries:location-to-country:${countryId}`,
        at: index + 100,
        ok: false,
        ms: 100,
        evidenceKind: 'recall' as const,
        localDate: '2026-08-11',
      },
    ]),
  )
}

function dueHistoryWithLatestFailureAt(
  entries: readonly Country[],
  latestFailureAtFor: (country: Country, index: number) => number,
) {
  return historyFor(
    entries.flatMap((country, index) => {
      const itemId = recallTargetIdFor(country.id, 'location-to-country')
      const latestFailureAt = latestFailureAtFor(country, index)
      return [
        { itemId, at: latestFailureAt - 1, ok: true, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
        { itemId, at: latestFailureAt, ok: false, evidenceKind: 'recall' as const, localDate: TEST_LOCAL_DATE },
      ]
    }),
    entries.map(country => country.id),
  )
}

function establishedLearningStatesFor(
  entries: readonly Pick<Country, 'subregionId'>[],
  milestoneAt: number,
) {
  return [...new Set(entries.map(country => country.subregionId))].map(subregionId => ({
    subregionId,
    countriesLearnedAt: milestoneAt,
    capitalsLearnedAt: milestoneAt,
  }))
}

function countryLayerLearningStatesFor(
  entries: readonly Pick<Country, 'subregionId'>[],
  milestoneAt: number,
) {
  return [...new Set(entries.map(country => country.subregionId))].map(subregionId => ({
    subregionId,
    countriesLearnedAt: milestoneAt,
  }))
}

function candidateId(candidate: { target: { countryId: Country['id']; skill: WorldCountriesCoreRecallSkill } }): string {
  return recallTargetIdFor(candidate.target.countryId, candidate.target.skill)
}

function historyForLocationProgress(
  entries: readonly Country[],
  options: {
    weakIds?: readonly Country['id'][]
    developingIds?: readonly Country['id'][]
    strongIds?: readonly Country['id'][]
    masteredIds?: readonly Country['id'][]
  } = {},
) {
  const weakIds = new Set(options.weakIds)
  const developingIds = new Set(options.developingIds)
  const strongIds = new Set(options.strongIds)
  const masteredIds = new Set(options.masteredIds)
  const attempts = entries.flatMap((country, index) => {
    const itemId = recallTargetIdFor(country.id, 'location-to-country')
    const firstAt = index * 10 + 1
    if (weakIds.has(country.id)) return [{ itemId, at: firstAt, ok: false, evidenceKind: 'recall' as const, localDate: TEST_PREVIOUS_LOCAL_DATE }]
    if (developingIds.has(country.id)) return [{ itemId, at: firstAt, ok: true, evidenceKind: 'recall' as const, localDate: TEST_PREVIOUS_LOCAL_DATE }]
    if (strongIds.has(country.id)) return [
      { itemId, at: firstAt, ok: true, evidenceKind: 'recall' as const, localDate: TEST_TWO_DAYS_AGO_LOCAL_DATE },
      { itemId, at: firstAt + 1, ok: true, evidenceKind: 'recall' as const, localDate: TEST_PREVIOUS_LOCAL_DATE },
    ]
    if (masteredIds.has(country.id)) return [
      { itemId, at: firstAt, ok: true, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
      { itemId, at: firstAt + 1, ok: true, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
      { itemId, at: firstAt + 2, ok: true, evidenceKind: 'recall' as const, localDate: '2026-08-12' },
    ]
    return []
  })
  return historyFor(attempts, entries.map(country => country.id))
}

describe('World Countries Today plan', () => {
  it.each([
    [1, 1, 'consolidate'],
    [2, 2, 'consolidate'],
    [3, 3, 'review'],
    [7, 7, 'review'],
    [8, 8, 'review'],
    [10, 8, 'review'],
  ])('bounds a %i-item due population to %i initial Review candidates and surfaces %s', (readyCount, expectedBlockSize, expectedOpportunityKind) => {
    const entries = countries.slice(0, readyCount)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: [...new Set(entries.map(country => country.subregionId))],
      learningStates: [...new Set(entries.map(country => country.subregionId))].map(subregionId => ({ subregionId, countriesLearnedAt: 1 })),
      history: dueHistoryFor(entries.map(country => country.id)),
      localDate: '2026-08-19',
    })

    expect(plan.dueCount).toBe(readyCount)
    expect(plan.reviewQueue).toHaveLength(expectedBlockSize)
    expect(plan.reviewOpportunity).toMatchObject({ kind: expectedOpportunityKind })
  })

  it('uses the same eight-item bound for weak-spot practice', () => {
    const entries = countries.slice(0, 10)
    const history = deriveTestHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      [],
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: [...new Set(entries.map(country => country.subregionId))],
      learningStates: establishedLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      history,
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.dueCount).toBe(0)
    expect(plan.consolidationCandidates.length).toBeGreaterThan(8)
    expect(plan.consolidationQueue).toHaveLength(8)
    expect(plan.reviewOpportunity).toMatchObject({ kind: 'consolidate' })
  })

  it.each([
    { establishedCount: 15, fragileCount: 15, expectedRatio: 1, high: false },
    { establishedCount: 16, fragileCount: 16, expectedRatio: 1, high: true },
    { establishedCount: 17, fragileCount: 17, expectedRatio: 1, high: true },
    { establishedCount: 40, fragileCount: 16, expectedRatio: 0.4, high: true },
  ])('derives high consolidation pressure from the absolute fragile count', ({ establishedCount, fragileCount, expectedRatio, high }) => {
    const entries = countries.slice(0, establishedCount)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: historyForLocationProgress(entries, {
        developingIds: entries.slice(0, fragileCount).map(country => country.id),
        strongIds: entries.slice(fragileCount).map(country => country.id),
      }),
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: establishedCount,
      fragileTargetCount: fragileCount,
      fragileRatio: expectedRatio,
      eligibleFragileTargetCount: fragileCount,
      isHigh: high,
    })
  })

  it('counts Weak and Developing as fragile while Strong remains in the denominator', () => {
    const entries = countries.slice(0, 8)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: historyForLocationProgress(entries, {
        weakIds: [entries[0]!.id],
        developingIds: entries.slice(1, 4).map(country => country.id),
        strongIds: entries.slice(4).map(country => country.id),
      }),
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 8,
      fragileTargetCount: 4,
      fragileRatio: 0.5,
      eligibleFragileTargetCount: 4,
      isHigh: false,
    })
  })

  it('excludes Mastered targets from the consolidation-pressure denominator', () => {
    const entries = countries.slice(0, 10)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: historyForLocationProgress(entries, {
        developingIds: entries.slice(0, 4).map(country => country.id),
        strongIds: entries.slice(4, 8).map(country => country.id),
        masteredIds: entries.slice(8).map(country => country.id),
      }),
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 8,
      fragileTargetCount: 4,
      fragileRatio: 0.5,
      eligibleFragileTargetCount: 4,
      isHigh: false,
    })
  })

  it('counts established unpractised targets as fragile', () => {
    const entries = countries.slice(0, 8)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: historyForLocationProgress(entries, {
        strongIds: entries.slice(4).map(country => country.id),
      }),
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 8,
      fragileTargetCount: 4,
      fragileRatio: 0.5,
      eligibleFragileTargetCount: 4,
      isHigh: false,
    })
  })

  it('does not count fragile targets still inside the cooldown toward promotion', () => {
    const entries = countries.slice(0, 16)
    const recentFailureHistory = historyFor(
      entries.slice(0, 4).map(country => ({
        itemId: recallTargetIdFor(country.id, 'location-to-country'),
        at: TEST_NOW - 60 * 1000,
        ok: false,
        evidenceKind: 'recall' as const,
        localDate: TEST_LOCAL_DATE,
      })),
      entries.map(country => country.id),
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: recentFailureHistory,
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationCandidates).toHaveLength(12)
    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 16,
      fragileTargetCount: 16,
      fragileRatio: 1,
      eligibleFragileTargetCount: 12,
      isHigh: false,
    })
  })

  it('does not count fragile targets resting after successful recall today toward promotion', () => {
    const entries = countries.slice(0, 16)
    const restingHistory = historyFor(
      entries.slice(0, 4).map(country => ({
        itemId: recallTargetIdFor(country.id, 'location-to-country'),
        at: TEST_NOW - 10 * 60 * 1000,
        ok: true,
        evidenceKind: 'recall' as const,
        localDate: TEST_LOCAL_DATE,
      })),
      entries.map(country => country.id),
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: restingHistory,
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationCandidates).toHaveLength(12)
    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 16,
      fragileTargetCount: 16,
      fragileRatio: 1,
      eligibleFragileTargetCount: 12,
      isHigh: false,
    })
  })

  it('does not promote Strengthen when Strong candidates make up part of a 16-item block', () => {
    const entries = countries.slice(0, 16)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: historyForLocationProgress(entries, {
        developingIds: entries.slice(0, 12).map(country => country.id),
        strongIds: entries.slice(12).map(country => country.id),
      }),
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationCandidates).toHaveLength(16)
    expect(plan.consolidationPressure.eligibleFragileTargetCount).toBe(12)
    expect(plan.consolidationPressure.isHigh).toBe(false)
  })

  it('promotes Strengthen when 16 eligible fragile candidates coexist with Strong candidates', () => {
    const entries = countries.slice(0, 20)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: historyForLocationProgress(entries, {
        developingIds: entries.slice(0, 16).map(country => country.id),
        strongIds: entries.slice(16).map(country => country.id),
      }),
      learningStates: countryLayerLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationCandidates).toHaveLength(20)
    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 20,
      fragileTargetCount: 16,
      fragileRatio: 0.8,
      eligibleFragileTargetCount: 16,
      isHigh: true,
    })
  })

  it('keeps pressure low when no established non-mastered targets exist', () => {
    const country = countries[0]!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: historyFor([]),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 0,
      fragileTargetCount: 0,
      fragileRatio: 0,
      eligibleFragileTargetCount: 0,
      isHigh: false,
    })
  })

  it('only includes targets whose corresponding Learning layer is established', () => {
    const establishedEntries = countries.filter(country => country.subregionId === 'northern-europe').slice(0, 2)
    const unestablishedEntries = countries.filter(country => country.subregionId === 'eastern-europe').slice(0, 2)
    const entries = [...establishedEntries, ...unestablishedEntries]
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history: historyForLocationProgress(entries, {
        developingIds: entries.map(country => country.id),
      }),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: TEST_NOW - 5 * 60 * 1000 }],
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationPressure).toEqual({
      establishedNonMasteredTargetCount: 2,
      fragileTargetCount: 2,
      fragileRatio: 1,
      eligibleFragileTargetCount: 2,
      isHigh: false,
    })
  })

  it('rests a successfully recalled non-mastered target for the current local date', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const itemId = recallTargetIdFor(country.id, 'location-to-country')
    const history = historyFor([
      { itemId, at: TEST_NOW, ok: true, ms: 100, evidenceKind: 'recall', localDate: TEST_LOCAL_DATE },
    ])
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW }],
      history,
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })
    const progress = deriveWorldCountriesRecallProgress(
      { countryIds: [country.id], skills: ['location-to-country'] },
      [...history.values()].flat(),
    )

    expect(progress.get(itemId)).toMatchObject({ mastered: false })
    expect(plan.dueCandidates).toEqual([])
    expect(plan.consolidationCandidates).toEqual([])
    expect(plan.reviewOpportunity).toBeNull()
  })

  it('offers other weak spots after the first block is successfully recalled today', () => {
    const entries = countries.slice(0, 10)
    const learningStates = establishedLearningStatesFor(entries, TEST_NOW - 5 * 60 * 1000)
    const history = deriveTestHistory({
      countryIds: entries.map(country => country.id),
      skills: ['location-to-country', 'country-to-capital'],
    }, [])
    const firstPlan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: [...new Set(entries.map(country => country.subregionId))],
      learningStates,
      history,
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })
    const completedIds = new Set(firstPlan.consolidationQueue.map(candidateId))
    const secondHistory = deriveTestHistory({
      countryIds: entries.map(country => country.id),
      skills: ['location-to-country', 'country-to-capital'],
    }, firstPlan.consolidationQueue.map((candidate, index) => ({
      itemId: candidateId(candidate),
      at: TEST_NOW + index + 1,
      ok: true,
      ms: 100,
      evidenceKind: 'recall' as const,
      localDate: TEST_LOCAL_DATE,
    })))
    const secondPlan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: [...new Set(entries.map(country => country.subregionId))],
      learningStates,
      history: secondHistory,
      now: TEST_NOW + 5 * 60 * 1000 + entries.length + 1,
      localDate: TEST_LOCAL_DATE,
    })
    const nextQueueIds = secondPlan.consolidationQueue.map(candidateId)
    const remainingEligibleIds = new Set(firstPlan.consolidationCandidates
      .map(candidateId)
      .filter(itemId => !completedIds.has(itemId)))

    expect(firstPlan.consolidationCandidates).toHaveLength(20)
    expect(firstPlan.consolidationQueue).toHaveLength(8)
    expect(secondPlan.consolidationCandidates).toHaveLength(12)
    expect(nextQueueIds).toHaveLength(8)
    expect(nextQueueIds.every(itemId => remainingEligibleIds.has(itemId))).toBe(true)
  })

  it('withholds an unresolved same-day failure from Today during the cooldown', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const itemId = recallTargetIdFor(country.id, 'location-to-country')
    const history = historyFor([
      { itemId, at: TEST_NOW - 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: TEST_LOCAL_DATE },
      { itemId, at: TEST_NOW, ok: false, ms: 100, evidenceKind: 'recall', localDate: TEST_LOCAL_DATE },
    ])
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW }],
      history,
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.dueCandidates).toEqual([])
    expect(plan.consolidationCandidates).toEqual([])
  })

  it('returns a rested target through scheduled Review on a later local date', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const itemId = recallTargetIdFor(country.id, 'location-to-country')
    const history = historyFor([
      { itemId, at: TEST_NOW, ok: true, ms: 100, evidenceKind: 'recall', localDate: TEST_LOCAL_DATE },
    ])
    const today = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW }],
      history,
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })
    const tomorrow = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW }],
      history,
      now: TEST_NOW + 24 * 60 * 60 * 1000,
      localDate: '2026-08-20',
    })

    expect(today.consolidationCandidates).toEqual([])
    expect(tomorrow.dueCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        target: { countryId: country.id, skill: 'location-to-country' },
        schedule: expect.objectContaining({ reason: 'scheduled', nextDueDate: '2026-08-20' }),
      }),
    ]))
  })

  it('withholds a latest failure from Today while it is inside the five-minute cooldown', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: 1 }],
      history: dueHistoryWithLatestFailureAt([country], () => TEST_NOW - (5 * 60 * 1000 - 1_000)),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.dueCandidates).toEqual([])
    expect(plan.consolidationCandidates).toEqual([])
  })

  it('allows a latest failure into Today at exactly five minutes old', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: 1 }],
      history: dueHistoryWithLatestFailureAt([country], () => TEST_NOW - 5 * 60 * 1000),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.dueCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: country.id, skill: 'location-to-country' } }),
    ]))
  })

  it('does not immediately consolidate a target established by a Learning milestone', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW }],
      history: historyFor([]),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationCandidates).toEqual([])
  })

  it('allows a milestone-established target into consolidation at exactly five minutes old', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW - 5 * 60 * 1000 }],
      history: historyFor([]),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.consolidationCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: country.id, skill: 'location-to-country' } }),
    ]))
  })

  it('uses the newer attempt or Learning milestone as the cooldown anchor', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const recentAttemptPlan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW - 24 * 60 * 60 * 1000 }],
      history: dueHistoryWithLatestFailureAt([country], () => TEST_NOW - (5 * 60 * 1000 - 1_000)),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })
    const recentMilestonePlan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW - (5 * 60 * 1000 - 1_000) }],
      history: historyFor([{
        itemId: recallTargetIdFor(country.id, 'location-to-country'),
        at: TEST_NOW - 24 * 60 * 60 * 1000,
        ok: true,
        evidenceKind: 'recall',
        localDate: '2026-08-18',
      }]),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(recentAttemptPlan.dueCandidates).toEqual([])
    expect(recentAttemptPlan.consolidationCandidates).toEqual([])
    expect(recentMilestonePlan.dueCandidates).toEqual([])
    expect(recentMilestonePlan.consolidationCandidates).toEqual([])
  })

  it('applies the three-item Review minimum after the cooldown filter', () => {
    const entries = countries.slice(0, 3)
    const learningStates = countryLayerLearningStatesFor(entries, 1)
    const justUnderFiveMinutes = TEST_NOW - (5 * 60 * 1000 - 1_000)
    const exactlyFiveMinutes = TEST_NOW - 5 * 60 * 1000
    const partiallyCooled = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      learningStates,
      history: dueHistoryWithLatestFailureAt(entries, (_country, index) => index === 0 ? justUnderFiveMinutes : exactlyFiveMinutes),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })
    const fullyCooled = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      learningStates,
      history: dueHistoryWithLatestFailureAt(entries, () => exactlyFiveMinutes),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(partiallyCooled.dueCandidates).toHaveLength(2)
    expect(partiallyCooled.reviewOpportunity?.kind).not.toBe('review')
    expect(fullyCooled.dueCandidates).toHaveLength(3)
    expect(fullyCooled.reviewOpportunity?.kind).toBe('review')
  })

  it.each([
    ['recognition', 'recognition' as const],
    ['legacy', undefined],
  ])('rests only for qualifying explicit recall evidence (%s)', (_label, evidenceKind) => {
    const country = countries.find(entry => entry.id === 'NO')!
    const itemId = recallTargetIdFor(country.id, 'location-to-country')
    const history = historyFor([{
      itemId,
      at: TEST_NOW - 24 * 60 * 60 * 1000,
      ok: true,
      ms: 100,
      ...(evidenceKind ? { evidenceKind } : {}),
      localDate: TEST_LOCAL_DATE,
    }])
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: country.subregionId, countriesLearnedAt: TEST_NOW - 24 * 60 * 60 * 1000 }],
      history,
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })

    expect(plan.dueCandidates[0]?.schedule.qualifyingRecallDates).toEqual([])
    expect(plan.consolidationCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: country.id, skill: 'location-to-country' } }),
    ]))
  })

  it('keeps a scoped plan inside the supplied active Country population', () => {
    const scopedHistory = deriveTestHistory({
      countryIds: ['NO', 'IN'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: false, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:location-to-country:IN', at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:location-to-country:IN', at: 3, ok: false, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11' },
    ])
    const india = countries.find(country => country.id === 'IN')!

    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [india],
      history: scopedHistory,
      effectiveCountries: [india],
      effectiveSubregionIds: [india.subregionId],
      learningStates: [{ subregionId: india.subregionId, countriesLearnedAt: 1 }],
      localDate: '2026-08-19',
    })

    expect(plan.dueCount).toBe(1)
    expect(plan.reviewQueue[0]?.country.id).toBe('IN')
  })

  it('counts only the two core skills and prioritizes latest failures', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: false, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:capital-to-country:NO', at: 3, ok: false, evidenceKind: 'recall', localDate: '2026-08-11' },
      ]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      localDate: '2026-08-19',
    })
    expect(plan.dueCount).toBe(1)
    expect(plan.dueCandidates[0]?.target.skill).toBe('location-to-country')
  })

  it('retains successful Drill evidence without making an unestablished target reviewable', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const itemId = 'world-countries:location-to-country:NO'
    const history = historyFor([
      { itemId, at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
    ])
    const progress = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO'], skills: ['location-to-country'] },
      [...history.values()].flat(),
    )
    const plan = buildWorldCountriesTodayPlan({ activeCountries: [country], history, localDate: '2026-08-19' })

    expect(progress.get(itemId)).toMatchObject({ attempts: 1, proficiency: 'developing' })
    expect(plan.introductions.get(itemId)?.introduced).toBe(true)
    expect(plan.dueCandidates).toEqual([])
    expect(plan.consolidationCandidates).toEqual([])
  })

  it('does not let successful recognition create Review eligibility for an unestablished layer', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const itemId = 'world-countries:location-to-country:NO'
    const history = historyFor([
      { itemId, at: 1, ok: true, evidenceKind: 'recognition', localDate: '2026-08-18' },
    ])
    const plan = buildWorldCountriesTodayPlan({ activeCountries: [country], history, localDate: '2026-08-19' })

    expect(plan.introductions.get(itemId)?.introduced).toBe(true)
    expect(plan.dueCandidates).toEqual([])
    expect(plan.consolidationCandidates).toEqual([])
  })

  it('does not let a latest failure bypass an unestablished layer', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const history = historyFor([
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:location-to-country:NO', at: 2, ok: false, evidenceKind: 'recall', localDate: '2026-08-19' },
    ])
    const plan = buildWorldCountriesTodayPlan({ activeCountries: [country], history, localDate: '2026-08-19' })

    expect(plan.dueCandidates).toEqual([])
    expect(plan.consolidationCandidates).toEqual([])
  })

  it('schedules the first Review from a durable Learning milestone without attempt history', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const milestoneAt = Date.UTC(2026, 7, 18, 12)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: historyFor([]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: milestoneAt }],
      now: milestoneAt + 24 * 60 * 60 * 1000,
      localDate: '2026-08-19',
    })

    expect(plan.dueCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        target: { countryId: 'NO', skill: 'location-to-country' },
        schedule: expect.objectContaining({
          introduced: true,
          reason: 'scheduled',
          latestAttemptAt: null,
          nextDueAt: milestoneAt + 24 * 60 * 60 * 1000,
        }),
      }),
    ]))
  })

  it('gates Country and Capital candidates by their established Learning layers', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const history = historyFor([
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:country-to-capital:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
    ])
    const countryOnly = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      localDate: '2026-08-19',
    })
    const bothLayers = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      localDate: '2026-08-19',
    })

    expect(countryOnly.consolidationCandidates.map(candidate => candidate.target.skill)).toEqual(['location-to-country'])
    expect(bothLayers.consolidationCandidates.map(candidate => candidate.target.skill)).toEqual([
      'location-to-country',
      'country-to-capital',
    ])
  })

  it('uses whole-layer Country mastery evidence as a non-persisted eligibility fallback', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const history = historyFor([
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: 'world-countries:location-to-country:NO', at: 3, ok: true, evidenceKind: 'recall', localDate: '2026-08-12' },
      { itemId: 'world-countries:location-to-country:NO', at: 4, ok: false, evidenceKind: 'recall', localDate: '2026-08-13' },
    ])
    const plan = buildWorldCountriesTodayPlan({ activeCountries: [country], history, localDate: '2026-08-13' })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(plan.introductions.get('world-countries:location-to-country:NO')?.source).toBe('attempt')
    expect(plan.dueCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: 'NO', skill: 'location-to-country' } }),
    ]))
  })

  it('uses whole-layer Capital mastery evidence when the combined readiness is established', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const history = historyFor([
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: 'world-countries:location-to-country:NO', at: 3, ok: true, evidenceKind: 'recall', localDate: '2026-08-12' },
      { itemId: 'world-countries:country-to-capital:NO', at: 4, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:country-to-capital:NO', at: 5, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: 'world-countries:country-to-capital:NO', at: 6, ok: true, evidenceKind: 'recall', localDate: '2026-08-12' },
      { itemId: 'world-countries:country-to-capital:NO', at: 7, ok: false, evidenceKind: 'recall', localDate: '2026-08-13' },
    ])
    const plan = buildWorldCountriesTodayPlan({ activeCountries: [country], history, localDate: '2026-08-13' })

    expect(plan.curriculumRecommendation).toBeNull()
    expect(plan.dueCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: 'NO', skill: 'country-to-capital' } }),
    ]))
  })

  it('does not unlock a layer from partial whole-layer mastery evidence', () => {
    const entries = countries.filter(entry => entry.id === 'NO' || entry.id === 'SE')
    const history = deriveTestHistory(
      { countryIds: entries.map(entry => entry.id), skills: ['location-to-country', 'country-to-capital'] },
      [
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:location-to-country:NO', at: 3, ok: false, ms: 100, evidenceKind: 'recall', localDate: '2026-08-12' },
        { itemId: 'world-countries:location-to-country:SE', at: 4, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11' },
      ],
    )
    const plan = buildWorldCountriesTodayPlan({ activeCountries: entries, history, localDate: '2026-08-12' })

    expect(plan.dueCandidates).toEqual([])
    expect(plan.consolidationCandidates).toEqual([])
  })

  it('activates retained evidence as soon as the corresponding layer becomes established', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const history = historyFor([
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:location-to-country:NO', at: 2, ok: false, evidenceKind: 'recall', localDate: '2026-08-11' },
    ])
    const unestablished = buildWorldCountriesTodayPlan({ activeCountries: [country], history, localDate: '2026-08-11' })
    const established = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      localDate: '2026-08-11',
    })

    expect(unestablished.dueCandidates).toEqual([])
    expect(established.dueCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        target: { countryId: 'NO', skill: 'location-to-country' },
        schedule: expect.objectContaining({ reason: 'latest-failure' }),
      }),
    ]))
  })

  it('keeps Capital Learning behind Country establishment rather than target introduction', () => {
    const partialCountryPractice = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
      ]),
      localDate: '2026-08-18',
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(partialCountryPractice.introductions.get('world-countries:location-to-country:NO')?.introduced).toBe(true)
    expect(partialCountryPractice.curriculumRecommendation?.track).toBe('learn-countries')
    expect(partialCountryPractice.reviewOpportunity).toBeNull()

    const countryEstablished = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: TEST_NOW - 24 * 60 * 60 * 1000 }],
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(countryEstablished.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(countryEstablished.reviewOpportunity?.kind).toBe('consolidate')
  })

  it('uses historically qualified Country recall as a non-persisted fallback for already-known Countries', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:location-to-country:NO', at: 3, ok: true, evidenceKind: 'recall', localDate: '2026-08-12' },
      ]),
      localDate: '2026-08-12',
      effectiveSubregionIds: ['northern-europe'],
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(plan.reviewOpportunity).toBeNull()
  })

  it('does not recommend Learn Countries again after a failed recall', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:location-to-country:NO', at: 3, ok: true, evidenceKind: 'recall', localDate: '2026-08-12' },
        { itemId: 'world-countries:location-to-country:NO', at: 4, ok: false, evidenceKind: 'recall', localDate: '2026-08-13' },
      ]),
      localDate: '2026-08-13',
      effectiveSubregionIds: ['northern-europe'],
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(plan.reviewOpportunity?.kind).toBe('consolidate')
    expect(plan.reviewQueue).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: 'NO', skill: 'location-to-country' } }),
    ]))
  })

  it('does not recommend Learn Capitals again after a failed Capital recall', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:location-to-country:NO', at: 3, ok: true, evidenceKind: 'recall', localDate: '2026-08-12' },
        { itemId: 'world-countries:country-to-capital:NO', at: 4, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:country-to-capital:NO', at: 5, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:country-to-capital:NO', at: 6, ok: true, evidenceKind: 'recall', localDate: '2026-08-12' },
        { itemId: 'world-countries:country-to-capital:NO', at: 7, ok: false, evidenceKind: 'recall', localDate: '2026-08-13' },
      ]),
      localDate: '2026-08-13',
      effectiveSubregionIds: ['northern-europe'],
    })

    expect(plan.curriculumRecommendation).toBeNull()
    expect(plan.reviewOpportunity?.kind).toBe('consolidate')
    expect(plan.reviewQueue).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: 'NO', skill: 'country-to-capital' } }),
    ]))
  })

  it('does not let incidental Capital practice skip Capital Learning', () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'SE')
    const history = deriveTestHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      entries.flatMap((country, index) => [
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
      ]),
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      effectiveSubregionIds: ['northern-europe'],
      localDate: '2026-08-18',
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(plan.reviewOpportunity).toBeNull()
  })

  it('keeps Capital Learning required when only some Capital targets are mastered', () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'SE')
    const norway = entries.find(country => country.id === 'NO')!
    const sweden = entries.find(country => country.id === 'SE')!
    const history = deriveTestHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      [
        ...entries.map((country, index) => ({ itemId: `world-countries:location-to-country:${country.id}`, at: index + 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' })),
        { itemId: `world-countries:country-to-capital:${norway.id}`, at: 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-16' },
        { itemId: `world-countries:country-to-capital:${norway.id}`, at: 4, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-17' },
        { itemId: `world-countries:country-to-capital:${norway.id}`, at: 5, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
        { itemId: `world-countries:country-to-capital:${sweden.id}`, at: 5, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
      ],
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      effectiveSubregionIds: ['northern-europe'],
      localDate: '2026-08-18',
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
  })

  it('derives the selected Subregion action with the same Country and Capital readiness rules', () => {
    const northern = countries.find(country => country.id === 'NO')!
    const central = countries.find(country => country.subregionId === 'central-europe')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [northern, central],
      effectiveCountries: [northern, central],
      effectiveSubregionIds: ['northern-europe', 'central-europe'],
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      history: historyFor([], [northern.id, central.id]),
      localDate: '2026-08-18',
    })

    expect(plan.curriculumRecommendation?.subregionId).toBe('northern-europe')
    expect(plan.curriculumRecommendationsBySubregion.get('northern-europe')?.track).toBe('learn-capitals')
    expect(plan.curriculumRecommendationsBySubregion.get('central-europe')?.track).toBe('learn-countries')
  })

  it('does not require redundant Capital Learning when every Capital target is mastered', () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'SE')
    const history = deriveTestHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      entries.flatMap((country, index) => [
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-16' },
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-17' },
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 5, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 7, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-16' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 9, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-17' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 11, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
      ]),
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history,
      effectiveSubregionIds: ['northern-europe'],
      localDate: '2026-08-18',
    })

    expect(plan.curriculumRecommendation).toBeNull()
    expect(plan.reviewOpportunity).toBeNull()
  })

  it('keeps the curriculum journey focus while a small due population remains below Review priority', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const southern = countries.find(country => country.subregionId === 'southern-europe')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [northern, southern],
      effectiveCountries: [northern, southern],
      effectiveSubregionIds: ['northern-europe', 'southern-europe'],
      learningStates: [{ subregionId: 'southern-europe', countriesLearnedAt: 1 }],
      history: historyFor([
        { itemId: `world-countries:location-to-country:${southern.id}`, at: 1, ok: true, localDate: '2026-08-18' },
        { itemId: `world-countries:location-to-country:${southern.id}`, at: 2, ok: false, localDate: '2026-08-19' },
      ], [northern.id, southern.id]),
      localDate: '2026-08-19',
    })

    expect(plan.reviewOpportunity?.kind).toBe('consolidate')
    expect(plan.curriculumRecommendation?.track).toBe('learn-countries')
    expect(plan.curriculumRecommendation?.subregionId).toBe('northern-europe')
    expect(plan.plannerFocusSubregionId).toBe('northern-europe')
  })

  it('biases the World Journey toward the preferred Continent without changing effective order', () => {
    const europe = countries.find(country => country.subregionId === 'central-europe')!
    const centralAfrica = countries.find(country => country.subregionId === 'central-africa')!
    const eastAfrica = countries.find(country => country.subregionId === 'east-africa')!
    const entries = [europe, centralAfrica, eastAfrica]
    const input = {
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: ['central-europe', 'central-africa', 'east-africa'] as const,
      history: historyFor([], entries.map(country => country.id)),
    }

    const ordinary = buildWorldCountriesTodayPlan(input)
    const preferred = buildWorldCountriesTodayPlan({ ...input, preferredJourneyContinent: 'africa' })

    expect(ordinary.curriculumRecommendation?.subregionId).toBe('central-europe')
    expect(preferred.curriculumRecommendation?.subregionId).toBe('central-africa')
    expect(preferred.plannerFocusSubregionId).toBe('central-africa')
    expect(preferred.curriculumRecommendationsBySubregion.get('central-africa')).toEqual(
      ordinary.curriculumRecommendationsBySubregion.get('central-africa'),
    )
    expect(preferred.curriculumRecommendationsBySubregion.get('east-africa')).toEqual(
      ordinary.curriculumRecommendationsBySubregion.get('east-africa'),
    )
  })

  it('keeps the preferred Continent recommendation in supplied effective Subregion order', () => {
    const europe = countries.find(country => country.subregionId === 'central-europe')!
    const centralAfrica = countries.find(country => country.subregionId === 'central-africa')!
    const eastAfrica = countries.find(country => country.subregionId === 'east-africa')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [europe, centralAfrica, eastAfrica],
      effectiveCountries: [europe, centralAfrica, eastAfrica],
      effectiveSubregionIds: ['central-europe', 'east-africa', 'central-africa'],
      preferredJourneyContinent: 'africa',
      history: historyFor([], [europe.id, centralAfrica.id, eastAfrica.id]),
    })

    expect(plan.curriculumRecommendation?.subregionId).toBe('east-africa')
  })

  it('keeps Review and consolidation results independent from Journey preference', () => {
    const europe = countries.find(country => country.subregionId === 'central-europe')!
    const africa = countries.find(country => country.subregionId === 'central-africa')!
    const entries = [europe, africa]
    const input = {
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: ['central-europe', 'central-africa'] as const,
      learningStates: establishedLearningStatesFor(entries, TEST_NOW),
      history: dueHistoryFor(entries.map(country => country.id)),
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    }
    const ordinary = buildWorldCountriesTodayPlan(input)
    const preferred = buildWorldCountriesTodayPlan({ ...input, preferredJourneyContinent: 'africa' })

    expect(preferred.dueCandidates.map(candidateId)).toEqual(ordinary.dueCandidates.map(candidateId))
    expect(preferred.consolidationCandidates.map(candidateId)).toEqual(ordinary.consolidationCandidates.map(candidateId))
    expect(preferred.reviewOpportunity?.kind).toBe(ordinary.reviewOpportunity?.kind)
  })

  it('falls back to the ordinary World recommendation when the preferred Continent is complete', () => {
    const europe = countries.find(country => country.subregionId === 'central-europe')!
    const africa = countries.find(country => country.subregionId === 'central-africa')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [europe, africa],
      effectiveCountries: [europe, africa],
      effectiveSubregionIds: ['central-europe', 'central-africa'],
      preferredJourneyContinent: 'africa',
      learningStates: [{ subregionId: africa.subregionId, countriesLearnedAt: TEST_NOW, capitalsLearnedAt: TEST_NOW }],
      history: completeCoreHistory([africa.id]),
    })

    expect(plan.curriculumRecommendationsBySubregion.get(africa.subregionId)).toBeNull()
    expect(plan.curriculumRecommendation?.subregionId).toBe('central-europe')
  })

  it('does not use the first review candidate when the bounded block spans Subregions', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const southern = countries.find(country => country.subregionId === 'southern-europe')!
    const history = historyFor([
      ...[northern, southern].flatMap(country => [
        { itemId: `world-countries:location-to-country:${country.id}`, at: country.id === northern.id ? 20 : 1, ok: true, localDate: '2026-08-18' },
        { itemId: `world-countries:location-to-country:${country.id}`, at: country.id === northern.id ? 21 : 2, ok: false, localDate: '2026-08-19' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: country.id === northern.id ? 30 : 3, ok: true, localDate: '2026-08-19' },
      ]),
    ], [northern.id, southern.id])
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [northern, southern],
      effectiveCountries: [southern, northern],
      effectiveSubregionIds: ['northern-europe', 'southern-europe'],
      learningStates: [
        { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
        { subregionId: 'southern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      ],
      history,
      localDate: '2026-08-19',
    })

    expect(plan.curriculumRecommendation).toBeNull()
    expect(plan.reviewOpportunity?.kind).toBe('review')
    expect(plan.reviewQueue.length).toBeGreaterThan(1)
    expect(plan.reviewQueue.some(candidate => candidate.country.subregionId === 'southern-europe')).toBe(true)
    expect(plan.plannerFocusSubregionId).toBe('northern-europe')
  })

  it('derives due Review candidates, Journey Learning, and fallback consolidation independently', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const due = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, localDate: '2026-08-18' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: false, localDate: '2026-08-19' },
      ]),
      localDate: '2026-08-19',
    })
    expect(due.reviewOpportunity?.kind).toBe('consolidate')
    expect(due.curriculumRecommendation).toBeNull()

    const learning = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: historyFor([]),
      localDate: '2026-08-19',
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(learning.curriculumRecommendation?.track).toBe('learn-countries')
    expect(learning.reviewOpportunity).toBeNull()

    const consolidation = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: historyFor([]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: TEST_NOW - 5 * 60 * 1000, capitalsLearnedAt: TEST_NOW - 5 * 60 * 1000 }],
      now: TEST_NOW,
      localDate: TEST_LOCAL_DATE,
    })
    expect(consolidation.dueCount).toBe(0)
    expect(consolidation.curriculumRecommendation).toBeNull()
    expect(consolidation.reviewOpportunity?.kind).toBe('consolidate')

    const complete = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: completeCoreHistory(),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      localDate: '2026-08-11',
    })
    expect(complete.scopeComplete).toBe(true)
    expect(complete.plannerFocusSubregionId).toBeNull()
    expect(complete.reviewOpportunity).toBeNull()
  })

  it('exposes caught-up-but-incomplete consolidation and excludes complete targets', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const now = Date.UTC(2026, 7, 18, 12)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: deriveTestHistory({
        countryIds: ['NO'],
        skills: ['location-to-country', 'country-to-capital'],
      }, [
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-16' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-17' },
        { itemId: 'world-countries:location-to-country:NO', at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      ]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: now - 5 * 60 * 1000, capitalsLearnedAt: now - 5 * 60 * 1000 }],
      now,
      localDate: '2026-08-18',
    })

    expect(plan.dueCount).toBe(0)
    expect(plan.scopeComplete).toBe(false)
    expect(plan.incompleteCountryCount).toBe(1)
    expect(plan.consolidationCandidates).toHaveLength(1)
    expect(plan.consolidationCandidates[0]?.target.skill).toBe('country-to-capital')
    expect(plan.consolidationQueue).toHaveLength(1)
    expect(plan.reviewOpportunity).toMatchObject({ kind: 'consolidate' })
  })

  it('keeps consolidation candidates inside the supplied Continent population', () => {
    const norway = countries.find(entry => entry.id === 'NO')!
    const india = countries.find(entry => entry.id === 'IN')!
    const history = deriveTestHistory({
      countryIds: ['NO', 'IN'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:country-to-capital:NO', at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:location-to-country:IN', at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:country-to-capital:IN', at: 4, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
    ])
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [norway],
      effectiveCountries: [norway],
      effectiveSubregionIds: [norway.subregionId],
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      localDate: '2026-08-18',
    })

    expect(plan.consolidationCandidates.every(candidate => candidate.country.continent === 'Europe')).toBe(true)
    expect(plan.consolidationCandidates.some(candidate => candidate.country.id === india.id)).toBe(false)
  })
})
