import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  deriveWorldCountriesCountryProgress,
  deriveWorldCountriesRecallProgress,
} from './recallProgress'
import {
  deriveWorldCountriesScopeProgress,
  deriveWorldCountriesSubregionProgress,
  deriveWorldCountriesWorldProgress,
} from './scopeProgress'
import { recallTargetIdFor, WORLD_COUNTRIES_RECALL_SKILLS } from './recallTargets'

function attempt(
  countryId: string,
  skill: (typeof WORLD_COUNTRIES_RECALL_SKILLS)[number],
  at: number,
  ok: boolean,
  localDate: string,
) {
  return {
    itemId: recallTargetIdFor(countryId, skill),
    at,
    ok,
    ms: 500,
    evidenceKind: 'recall' as const,
    localDate,
  }
}

describe('World Countries scope progress', () => {
  it('counts current Countries directly instead of averaging child percentages', () => {
    const attempts = [
      ...(['NO', 'SE'].flatMap((countryId, countryIndex) => [
        attempt(countryId, 'location-to-country', countryIndex * 10 + 1, true, '2026-08-10'),
        attempt(countryId, 'location-to-country', countryIndex * 10 + 2, true, '2026-08-11'),
        attempt(countryId, 'country-to-capital', countryIndex * 10 + 3, true, '2026-08-10'),
        attempt(countryId, 'country-to-capital', countryIndex * 10 + 4, true, '2026-08-11'),
      ])),
      attempt('DK', 'location-to-country', 30, true, '2026-08-10'),
      attempt('DK', 'country-to-capital', 31, false, '2026-08-10'),
      attempt('FI', 'location-to-country', 40, false, '2026-08-10'),
    ]
    const itemProgress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE', 'DK', 'FI'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, attempts)
    const countryProgress = new Map(
      ['NO', 'SE', 'DK', 'FI'].map(countryId => [
        countryId,
        deriveWorldCountriesCountryProgress(countryId, itemProgress),
      ]),
    )

    const progress = deriveWorldCountriesScopeProgress(
      'continent:europe',
      ['NO', 'SE', 'DK', 'FI'],
      countryProgress,
    )

    expect(progress).toMatchObject({
      scopeId: 'continent:europe',
      totalCountries: 4,
      completeCountries: 2,
      completionRatio: 0.5,
      countryStateCounts: {
        unpractised: 0,
        weak: 2,
        developing: 0,
        strong: 0,
        complete: 2,
      },
    })
  })

  it('does not let additional skill weakness change core completion counts', () => {
    const attempts = [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10'),
      attempt('NO', 'location-to-country', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-11'),
      attempt('NO', 'capital-to-country', 5, false, '2026-08-12'),
    ]
    const itemProgress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, attempts)
    const progress = deriveWorldCountriesScopeProgress('subregion:northern-europe', ['NO'], new Map([
      ['NO', deriveWorldCountriesCountryProgress('NO', itemProgress)],
    ]))

    expect(progress.completeCountries).toBe(1)
    expect(progress.additionalMasteredSkills).toBe(0)
  })

  it('does not let mastered Capital → Country evidence complete a Country', () => {
    const itemProgress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, [
      attempt('NO', 'capital-to-country', 1, true, '2026-08-10'),
      attempt('NO', 'capital-to-country', 2, true, '2026-08-11'),
    ])

    const progress = deriveWorldCountriesWorldProgress(itemProgress, countries.filter(country => country.id === 'NO'))

    expect(progress.completeCountries).toBe(0)
    expect(progress.countryStateCounts.unpractised).toBe(1)
    expect(progress.countryStateCounts.complete).toBe(0)
  })

  it('uses canonical Subregion membership for the scope denominator', () => {
    const progress = deriveWorldCountriesSubregionProgress('northern-europe', new Map())

    expect(progress.scopeId).toBe('subregion:northern-europe')
    expect(progress.totalCountries).toBeGreaterThan(0)
    expect(progress.completeCountries).toBe(0)
    expect(progress.countryStateCounts.unpractised).toBe(progress.totalCountries)
  })

  it('uses the active World population for every mastery count', () => {
    const attempts = [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10'),
      attempt('NO', 'location-to-country', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-11'),
      attempt('SE', 'location-to-country', 5, false, '2026-08-10'),
      attempt('DK', 'location-to-country', 6, true, '2026-08-10'),
      attempt('DK', 'location-to-country', 7, true, '2026-08-11'),
      attempt('DK', 'country-to-capital', 8, true, '2026-08-10'),
      attempt('DK', 'country-to-capital', 9, true, '2026-08-11'),
    ]
    const itemProgress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE', 'DK'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, attempts)
    const activeEntries = countries.filter(country => country.id === 'NO' || country.id === 'SE')

    const progress = deriveWorldCountriesWorldProgress(itemProgress, activeEntries)

    expect(progress).toMatchObject({
      scopeId: 'world',
      totalCountries: 2,
      completeCountries: 1,
      completionRatio: 0.5,
      complete: false,
      countryStateCounts: {
        unpractised: 0,
        weak: 1,
        developing: 0,
        strong: 0,
        complete: 1,
      },
    })
    expect(Object.values(progress.countryStateCounts).reduce((sum, count) => sum + count, 0)).toBe(2)
  })
})
