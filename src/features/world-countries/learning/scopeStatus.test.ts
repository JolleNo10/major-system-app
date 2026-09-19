import { describe, expect, it } from 'vitest'
import type { CountryId } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress } from './recallProgress'
import { WORLD_COUNTRIES_CORE_RECALL_SKILLS, recallTargetIdFor } from './recallTargets'
import type { WorldCountriesLearningReadiness } from './learningReadiness'
import {
  WORLD_COUNTRIES_SCOPE_STATUS_TIERS,
  deriveWorldCountriesScopeStatus,
  deriveWorldCountriesScopeStatusFromCounts,
  type WorldCountriesScopeStatusTier,
} from './scopeStatus'

function counts(
  partial: Partial<Record<WorldCountriesScopeStatusTier, number>>,
): Record<WorldCountriesScopeStatusTier, number> {
  return {
    ...Object.fromEntries(WORLD_COUNTRIES_SCOPE_STATUS_TIERS.map(tier => [tier, 0])),
    ...partial,
  } as Record<WorldCountriesScopeStatusTier, number>
}

describe('deriveWorldCountriesScopeStatus', () => {
  it('reports the highest rung the scope has reached, not its mastery share', () => {
    // One mastered Country outranks the 53 that are further back, which is
    // the whole point: the headline used to read "Mastery 0%" here.
    const status = deriveWorldCountriesScopeStatusFromCounts(
      counts({ complete: 1, strong: 3, NOT_LEARNED: 50 }),
      54,
    )
    expect(status.label).toBe('Mastered')
    expect(status.percent).toBe(2)
    expect(status.countLabel).toBe('1 / 54 Countries fully mastered')
  })

  it('reports a mid-ladder rung when nothing above it has been reached', () => {
    const status = deriveWorldCountriesScopeStatusFromCounts(
      counts({ strong: 2, developing: 8, NOT_LEARNED: 40 }),
      50,
    )
    expect(status.label).toBe('Strong')
    expect(status.percent).toBe(4)
    expect(status.countLabel).toBe('2 / 50 Countries strong')
  })

  it('promotes a full recall rung to the next rung at zero', () => {
    const status = deriveWorldCountriesScopeStatusFromCounts(counts({ strong: 54 }), 54)
    expect(status.label).toBe('Mastered')
    expect(status.percent).toBe(0)
    expect(status.countLabel).toBe('0 / 54 Countries fully mastered')
  })

  it('keeps the top rung at 100% rather than promoting past it', () => {
    const status = deriveWorldCountriesScopeStatusFromCounts(counts({ complete: 54 }), 54)
    expect(status.label).toBe('Mastered')
    expect(status.percent).toBe(100)
    expect(status.countLabel).toBe('54 / 54 Countries fully mastered')
  })

  it('reports an untouched scope as Not learned with no percentage', () => {
    const status = deriveWorldCountriesScopeStatusFromCounts(counts({ NOT_LEARNED: 14 }), 14)
    expect(status.label).toBe('Not learned')
    expect(status.percent).toBeNull()
    expect(status.countLabel).toBe('0 / 14 Countries learned')
  })

  it('reports the Learned rung with no percentage, full or partial', () => {
    // Learning rungs are milestones rather than a health share, so they never
    // promote: a fully learned scope reads "Learned", not "Early recall 0%".
    const partial = deriveWorldCountriesScopeStatusFromCounts(
      counts({ COUNTRIES_LEARNED: 12, NOT_LEARNED: 36 }),
      48,
    )
    expect(partial.label).toBe('Learned')
    expect(partial.percent).toBeNull()
    expect(partial.countLabel).toBe('12 / 48 Countries learned')

    const full = deriveWorldCountriesScopeStatusFromCounts(counts({ COUNTRIES_LEARNED: 48 }), 48)
    expect(full.label).toBe('Learned')
    expect(full.percent).toBeNull()
    expect(full.countLabel).toBe('48 / 48 Countries learned')
  })

  it('treats early recall as a percentage rung once Capitals are learned too', () => {
    const status = deriveWorldCountriesScopeStatusFromCounts(
      counts({ unpractised: 5, COUNTRIES_LEARNED: 10, NOT_LEARNED: 35 }),
      50,
    )
    expect(status.label).toBe('Early recall')
    expect(status.percent).toBe(10)
    expect(status.countLabel).toBe('5 / 50 Countries in early recall')

    const full = deriveWorldCountriesScopeStatusFromCounts(counts({ unpractised: 50 }), 50)
    expect(full.label).toBe('Weak')
    expect(full.percent).toBe(0)
  })

  it('never renders a reached rung as 0%', () => {
    // Rounding 1 of 400 down to 0% would be indistinguishable from the empty
    // next rung the promotion rule reports.
    const status = deriveWorldCountriesScopeStatusFromCounts(
      counts({ complete: 1, NOT_LEARNED: 399 }),
      400,
    )
    expect(status.percent).toBe(1)
  })

  it('reports an empty scope as Not learned without dividing by zero', () => {
    const status = deriveWorldCountriesScopeStatusFromCounts(counts({}), 0)
    expect(status.label).toBe('Not learned')
    expect(status.percent).toBeNull()
    expect(status.countLabel).toBe('0 / 0 Countries learned')
  })
})

describe('deriveWorldCountriesScopeStatus over Country evidence', () => {
  function masteredAttempts(countryId: CountryId) {
    return (['location-to-country', 'country-to-capital'] as const).flatMap((skill, skillIndex) =>
      [0, 1, 2, 3].map(day => ({
        itemId: recallTargetIdFor(countryId, skill),
        at: skillIndex * 100 + day + 1,
        ok: true,
        ms: 500,
        evidenceKind: 'recall' as const,
        attemptType: 'review' as const,
        localDate: `2026-08-1${day}`,
      })))
  }

  it('holds a Country on its Learning rung no matter how strong its recall evidence is', () => {
    // Recall health is gated behind the durable Learning ladder, so evidence
    // alone must not promote a Country that has not been learned.
    const recallProgress = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO'], skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS },
      masteredAttempts('NO'),
    )
    const progressByCountry = new Map([['NO' as CountryId, deriveWorldCountriesCountryProgress('NO', recallProgress)]])
    const readiness = new Map<CountryId, WorldCountriesLearningReadiness>([['NO', 'NOT_LEARNED']])

    const status = deriveWorldCountriesScopeStatus(['NO'], readiness, progressByCountry)

    expect(status.label).toBe('Not learned')
    expect(status.percent).toBeNull()
  })

  it('reads recall health once the Country has learned both tracks', () => {
    const recallProgress = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO'], skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS },
      masteredAttempts('NO'),
    )
    const progressByCountry = new Map([['NO' as CountryId, deriveWorldCountriesCountryProgress('NO', recallProgress)]])
    const readiness = new Map<CountryId, WorldCountriesLearningReadiness>([['NO', 'COUNTRIES_AND_CAPITALS_LEARNED']])

    const status = deriveWorldCountriesScopeStatus(['NO'], readiness, progressByCountry)

    expect(status.tier).not.toBe('NOT_LEARNED')
    expect(status.percent).not.toBeNull()
  })

  it('treats a Country with no derived progress as its Learning rung', () => {
    const readiness = new Map<CountryId, WorldCountriesLearningReadiness>([
      ['NO', 'COUNTRIES_LEARNED'],
      ['SE', 'NOT_LEARNED'],
    ])

    const status = deriveWorldCountriesScopeStatus(['NO', 'SE'], readiness, new Map())

    expect(status.label).toBe('Learned')
    expect(status.countLabel).toBe('1 / 2 Countries learned')
  })

  it('counts each Country once when a scope repeats an id', () => {
    const readiness = new Map<CountryId, WorldCountriesLearningReadiness>([['NO', 'COUNTRIES_LEARNED']])

    const status = deriveWorldCountriesScopeStatus(['NO', 'NO'], readiness, new Map())

    expect(status.totalCountries).toBe(1)
    expect(status.countLabel).toBe('1 / 1 Countries learned')
  })
})
