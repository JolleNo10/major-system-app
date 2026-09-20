import { describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { recallTargetIdFor, type WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
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
  skill: WorldCountriesRecallSkill,
  ok: boolean,
) {
  return {
    itemId: recallTargetIdFor(countryId, skill),
    at: 1,
    ok,
    ms: 500,
    evidenceKind: 'recognition' as const,
    attemptType: 'drill' as const,
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

    const scope = resolveDrillProficiencyScope({
      continent: 'Europe',
      selection: ['weak', 'developing'],
      recallProgress: progress,
      activity: { kind: 'drill', mode: 'countries' },
      entries: [sweden, norway],
    })

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

    const scope = resolveDrillProficiencyScope({
      continent: 'Europe',
      selection: ['weak'],
      recallProgress: progress,
      activity: { kind: 'practice', mode: 'capitals' },
      entries: [norway, sweden],
    })

    expect(scope.countryIds).toEqual(['SE'])
    expect(scope.counts).toEqual({ weak: 1, developing: 1 })
  })

  it('uses Capital to Country proficiency for Countries from Capitals Practice', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE'],
      skills: ['location-to-country', 'capital-to-country'],
    }, [
      progressFor('NO', 'location-to-country', false),
      progressFor('SE', 'location-to-country', false),
      progressFor('NO', 'capital-to-country', true),
      progressFor('SE', 'capital-to-country', false),
    ])

    const scope = resolveDrillProficiencyScope({
      continent: 'Europe',
      selection: ['weak'],
      recallProgress: progress,
      activity: { kind: 'practice', mode: 'countries-from-capitals' },
      entries: [norway, sweden],
    })

    expect(scope.countryIds).toEqual(['SE'])
  })

  it('gives no proficiency reading to a Country that has not finished Learning', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE'],
      skills: ['location-to-country'],
    }, [
      progressFor('NO', 'location-to-country', false),
      progressFor('SE', 'location-to-country', false),
    ])

    const scope = resolveDrillProficiencyScope({
      continent: 'Europe',
      selection: ['weak'],
      recallProgress: progress,
      activity: { kind: 'drill', mode: 'countries' },
      entries: [norway, sweden],
      readinessByCountry: new Map([['NO', 'COUNTRIES_AND_CAPITALS_LEARNED'], ['SE', 'COUNTRIES_LEARNED']] as const),
    })

    expect(scope.counts).toEqual({ weak: 1, developing: 0 })
    expect(scope.countryIds).toEqual(['NO'])
  })

  it('searches the whole active population when no Continent is open', () => {
    const india = {
      id: 'IN', country: 'India', capital: 'New Delhi', continent: 'Asia' as const,
      subregionId: 'south-asia' as const, subregion: 'South Asia',
    }
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'IN'],
      skills: ['location-to-country'],
    }, [
      progressFor('NO', 'location-to-country', false),
      progressFor('IN', 'location-to-country', false),
    ])

    const scope = resolveDrillProficiencyScope({
      continent: null,
      selection: ['weak'],
      recallProgress: progress,
      activity: { kind: 'drill', mode: 'countries' },
      entries: [norway, india],
    })

    expect(scope.counts.weak).toBe(2)
    expect([...scope.countryIds].sort()).toEqual(['IN', 'NO'])
  })

  it('does not classify Countries without relevant evidence', () => {
    const scope = resolveDrillProficiencyScope({
      continent: 'Europe',
      selection: ['weak', 'developing'],
      recallProgress: deriveWorldCountriesRecallProgress({ countryIds: ['NO'], skills: ['location-to-country'] }, []),
      activity: { kind: 'practice', mode: 'locate-countries' },
      entries: [norway],
    })

    expect(scope.counts).toEqual({ weak: 0, developing: 0 })
    expect(scope.countryIds).toEqual([])
  })

  it('uses shape-to-country as the Country from Shape proficiency perspective', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE'],
      skills: ['shape-to-country'],
    }, [progressFor('NO', 'shape-to-country', false)])

    const scope = resolveDrillProficiencyScope({
      continent: 'Europe',
      selection: ['weak'],
      recallProgress: progress,
      activity: { kind: 'practice', mode: 'country-from-shape' },
      entries: [norway, sweden],
    })

    expect(scope.countryIds).toEqual(['NO'])
  })
})
