import { describe, expect, it } from 'vitest'
import {
  deriveWorldCountriesCountryProgress,
  deriveWorldCountriesRecallProgress,
} from './recallProgress'
import {
  deriveWorldCountriesScopeProgress,
  deriveWorldCountriesSubregionProgress,
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

  it('uses canonical Subregion membership for the scope denominator', () => {
    const progress = deriveWorldCountriesSubregionProgress('northern-europe', new Map())

    expect(progress.scopeId).toBe('subregion:northern-europe')
    expect(progress.totalCountries).toBeGreaterThan(0)
    expect(progress.completeCountries).toBe(0)
    expect(progress.countryStateCounts.unpractised).toBe(progress.totalCountries)
  })
})
