import { describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { recallTargetIdFor } from '@/features/world-countries/learning/recallTargets'
import { resolveDrillProficiencyScope } from './drillProficiencyScope'

const norway: Country = {
  id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}
const sweden: Country = {
  id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}

function progressFor(
  countryId: Country['id'],
  skill: 'location-to-country' | 'country-to-capital',
  ok: boolean,
) {
  return {
    itemId: recallTargetIdFor(countryId, skill),
    at: 1,
    ok,
    ms: 500,
    evidenceKind: 'recognition' as const,
  }
}

describe('World Countries Drill proficiency scope', () => {
  it('uses the current Drill perspective and returns the selected union in geography order', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      progressFor('NO', 'location-to-country', false),
      progressFor('SE', 'location-to-country', true),
      progressFor('NO', 'country-to-capital', true),
      progressFor('SE', 'country-to-capital', false),
    ])

    const scope = resolveDrillProficiencyScope(
      'Europe',
      ['weak', 'developing'],
      progress,
      { kind: 'drill', mode: 'countries' },
      [sweden, norway],
    )

    expect(scope.counts).toEqual({ weak: 1, developing: 1 })
    expect(scope.countryIds).toEqual(['SE', 'NO'])
  })

  it('uses Country to Capital proficiency for Capitals Practice', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      progressFor('NO', 'location-to-country', false),
      progressFor('SE', 'location-to-country', false),
      progressFor('NO', 'country-to-capital', true),
      progressFor('SE', 'country-to-capital', false),
    ])

    const scope = resolveDrillProficiencyScope(
      'Europe',
      ['weak'],
      progress,
      { kind: 'practice', mode: 'capitals' },
      [norway, sweden],
    )

    expect(scope.countryIds).toEqual(['SE'])
    expect(scope.counts).toEqual({ weak: 1, developing: 1 })
  })

  it('does not classify Countries without relevant evidence', () => {
    const scope = resolveDrillProficiencyScope(
      'Europe',
      ['weak', 'developing'],
      deriveWorldCountriesRecallProgress({ countryIds: ['NO'], skills: ['location-to-country'] }, []),
      { kind: 'practice', mode: 'locate-countries' },
      [norway],
    )

    expect(scope.counts).toEqual({ weak: 0, developing: 0 })
    expect(scope.countryIds).toEqual([])
  })
})
