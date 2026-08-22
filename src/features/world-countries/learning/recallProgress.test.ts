import { describe, expect, it } from 'vitest'
import {
  deriveCountryRecallProgress,
  deriveWorldCountriesRecallProgress,
  deriveWorldCountriesCountryProgress,
} from './recallProgress'
import { recallTargetIdFor, WORLD_COUNTRIES_RECALL_SKILLS } from './recallTargets'

function attempt(
  countryId: string,
  skill: (typeof WORLD_COUNTRIES_RECALL_SKILLS)[number],
  at: number,
  ok: boolean,
  localDate?: string,
  evidenceKind: 'recall' | 'recognition' = 'recall',
) {
  return {
    itemId: recallTargetIdFor(countryId, skill),
    at,
    ok,
    ms: 500,
    ...(localDate ? { localDate } : {}),
    ...(evidenceKind ? { evidenceKind } : {}),
  }
}

describe('World Countries recall progress', () => {
  it('derives independent evidence for each atomic skill', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      attempt('NO', 'location-to-country', 1, false, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-11'),
    ])

    expect(progress.get(recallTargetIdFor('NO', 'location-to-country'))?.wrong).toBe(1)
    expect(progress.get(recallTargetIdFor('NO', 'country-to-capital'))?.mastered).toBe(true)
    const country = deriveCountryRecallProgress('NO', ['location-to-country', 'country-to-capital'], progress)
    expect(country.coreMasteredSkills).toBe(1)
    expect(country.complete).toBe(false)
  })

  it('requires explicit free recall on two recorded calendar dates for mastery', () => {
    const sameDay = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-10'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(sameDay.proficiency).toBe('strong')
    expect(sameDay.mastered).toBe(false)

    const boundary = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(boundary.proficiency).toBe('mastered')
    expect(boundary.mastered).toBe(true)
  })

  it('lets recognition improve proficiency without establishing mastery', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10', 'recognition'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11', 'recognition'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12', 'recognition'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
  })

  it('treats legacy successful attempts as positive but not qualifying recall evidence', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 1, ok: true, ms: 500 },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 2, ok: true, ms: 500 },
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
  })

  it('starts a new mastery boundary after any incorrect attempt', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, false, '2026-08-15'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-16'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('developing')
    expect(progress.mastered).toBe(false)
  })

  it('keeps mastery after later successes and recovers only with two new dates', () => {
    const mastered = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-11', 'recognition'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(mastered.proficiency).toBe('mastered')

    const failed = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, false, '2026-08-12', 'recognition'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-14'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(failed.proficiency).toBe('mastered')
  })

  it('counts successful evidence between qualifying dates and preserves response-time statistics separately', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      { ...attempt('NO', 'country-to-capital', 1, true, '2026-08-10'), ms: 1 },
      { ...attempt('NO', 'country-to-capital', 2, true, '2026-08-10'), ms: 5000 },
      { ...attempt('NO', 'country-to-capital', 3, true, '2026-08-11'), ms: 1000 },
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('mastered')
    expect(progress.medianMs).toBe(1000)
  })

  it('separates core Country completeness from additional skill progress', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10'),
      attempt('NO', 'location-to-country', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-11'),
      attempt('NO', 'capital-to-country', 5, false, '2026-08-12'),
    ])

    const country = deriveWorldCountriesCountryProgress('NO', progress)
    expect(country.coreState).toBe('complete')
    expect(country.complete).toBe(true)
    expect(country.additionalMasteredSkills).toBe(0)
    expect(country.additionalSkillCount).toBe(2)
    expect(country.skills.get('capital-to-country')?.proficiency).toBe('weak')
  })

  it('reports additional mastery without changing core completion', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, [
      ...[
        ['location-to-country', 1], ['location-to-country', 2],
        ['country-to-capital', 3], ['country-to-capital', 4],
        ['capital-to-country', 5], ['capital-to-country', 6],
        ['shape-to-country', 7], ['shape-to-country', 8],
      ].map(([skill, at], index) => attempt(
        'NO', skill as (typeof WORLD_COUNTRIES_RECALL_SKILLS)[number], at as number,
        true, index % 2 ? '2026-08-11' : '2026-08-10',
      )),
    ])

    const country = deriveWorldCountriesCountryProgress('NO', progress)
    expect(country.coreState).toBe('complete')
    expect(country.additionalMasteredSkills).toBe(2)
    expect(country.additionalMasteryRatio).toBe(1)
  })

  it('derives Country core bands independently from additional skills', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10'),
      attempt('NO', 'location-to-country', 2, true, '2026-08-11'),
    ])

    const country = deriveWorldCountriesCountryProgress('NO', progress)
    expect(country.coreState).toBe('developing')
    expect(country.complete).toBe(false)
    expect(country.skills.get('capital-to-country')?.proficiency).toBe('unpractised')
  })

  it('derives the requested Country aggregation without recursively averaging scopes', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO', 'SE'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [])
    const no = deriveWorldCountriesCountryProgress('NO', progress)
    const se = deriveWorldCountriesCountryProgress('SE', progress)
    expect(no.complete).toBe(false)
    expect(se.complete).toBe(false)
  })

  it('creates only atomic IDs for combined skills', () => {
    const progress = deriveWorldCountriesRecallProgress({ countryIds: ['NO', 'SE'], skills: ['location-to-country', 'country-to-capital'] }, [])
    expect([...progress.keys()].sort()).toEqual([
      recallTargetIdFor('NO', 'country-to-capital'),
      recallTargetIdFor('NO', 'location-to-country'),
      recallTargetIdFor('SE', 'country-to-capital'),
      recallTargetIdFor('SE', 'location-to-country'),
    ].sort())
  })
})
