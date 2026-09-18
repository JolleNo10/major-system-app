import { describe, expect, it } from 'vitest'
import {
  deriveCountryRecallProgress,
  deriveWorldCountriesRecallProgress,
  deriveWorldCountriesCountryProgress,
} from './recallProgress'
import { deriveWorldCountriesAtomicProgress } from './recallMastery'
import { recallTargetIdFor, WORLD_COUNTRIES_RECALL_SKILLS } from './recallTargets'

function attempt(
  countryId: string,
  skill: (typeof WORLD_COUNTRIES_RECALL_SKILLS)[number],
  at: number,
  ok: boolean,
  localDate?: string,
  evidenceKind: 'recall' | 'recognition' = 'recall',
  attemptType: 'learning' | 'review' | 'strengthen' | 'drill' | 'legacy' = 'review',
) {
  return {
    itemId: recallTargetIdFor(countryId, skill),
    at,
    ok,
    ms: 500,
    ...(localDate ? { localDate } : {}),
    ...(evidenceKind ? { evidenceKind } : {}),
    attemptType,
  }
}

describe('World Countries recall progress', () => {
  it('reports no attempts as Unpractised', () => {
    const progress = deriveWorldCountriesRecallProgress({ countryIds: ['NO'], skills: ['location-to-country'] }, [])
      .get(recallTargetIdFor('NO', 'location-to-country'))!
    expect(progress.proficiency).toBe('unpractised')
  })

  it('keeps one or many Learning successes at Weak', () => {
    const one = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'location-to-country'), [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10', 'recall', 'learning'),
    ])
    const many = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'location-to-country'), [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10', 'recall', 'learning'),
      attempt('NO', 'location-to-country', 2, true, '2026-08-11', 'recall', 'learning'),
      attempt('NO', 'location-to-country', 3, true, '2026-08-12', 'recall', 'learning'),
    ])
    expect(one.proficiency).toBe('weak')
    expect(many.proficiency).toBe('weak')
    expect(many.mastered).toBe(false)
  })

  it('keeps Learning failures, retries, and repair repetitions at Weak', () => {
    const progress = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'location-to-country'), [
      attempt('NO', 'location-to-country', 1, false, '2026-08-10', 'recall', 'learning'),
      attempt('NO', 'location-to-country', 2, true, '2026-08-10', 'recall', 'learning'),
      attempt('NO', 'location-to-country', 3, false, '2026-08-11', 'recall', 'learning'),
      attempt('NO', 'location-to-country', 4, true, '2026-08-11', 'recall', 'learning'),
    ])
    expect(progress.proficiency).toBe('weak')
    expect(progress.mastered).toBe(false)
  })

  it.each([
    ['review', 'review'],
    ['strengthen', 'strengthen'],
    ['drill', 'drill'],
  ] as const)('allows a first %s success without Learning', (_label, attemptType) => {
    const progress = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'country-to-capital'), [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10', 'recall', attemptType),
    ])
    expect(progress.proficiency).toBe('developing')
  })

  it('does not let Learning advance or downgrade performance proficiency', () => {
    const performanceFirst = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'country-to-capital'), [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11', 'recall', 'learning'),
      attempt('NO', 'country-to-capital', 3, false, '2026-08-12', 'recall', 'learning'),
    ])
    const strongThenRelearn = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'country-to-capital'), [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12', 'recall', 'learning'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13', 'recall', 'learning'),
    ])
    expect(performanceFirst.proficiency).toBe('developing')
    expect(strongThenRelearn.proficiency).toBe('strong')
  })

  it('uses further performance evidence for Strong and three performance recall dates for Mastered', () => {
    const strong = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'country-to-capital'), [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11', 'recall', 'review'),
    ])
    const mastered = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'country-to-capital'), [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11', 'recall', 'strengthen'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12', 'recall', 'drill'),
    ])
    expect(strong.proficiency).toBe('strong')
    expect(mastered.proficiency).toBe('mastered')
    expect(mastered.hasEverMastered).toBe(true)
  })

  it('keeps missing evidence kind positive but ineligible for mastery', () => {
    const progress = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'country-to-capital'), [
      { at: 1, ok: true, ms: 500, localDate: '2026-08-10', attemptType: 'review' },
      { at: 2, ok: true, ms: 500, localDate: '2026-08-11', attemptType: 'review' },
      { at: 3, ok: true, ms: 500, localDate: '2026-08-12', attemptType: 'review' },
    ])
    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
  })

  it('does not let a later Learning failure clear current or historical mastery', () => {
    const progress = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'country-to-capital'), [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12', 'recall', 'review'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13', 'recall', 'learning'),
    ])
    expect(progress.proficiency).toBe('mastered')
    expect(progress.mastered).toBe(true)
    expect(progress.hasEverMastered).toBe(true)
  })

  it('treats later legacy clusters as performance evidence for core skills', () => {
    const developing = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'location-to-country'), [
      { at: 1, ok: true, ms: 500, localDate: '2026-08-10', evidenceKind: 'recall', attemptType: 'legacy' },
      { at: 2, ok: true, ms: 500, localDate: '2026-08-11', evidenceKind: 'recall', attemptType: 'legacy' },
    ])
    const strong = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'location-to-country'), [
      { at: 1, ok: true, ms: 500, localDate: '2026-08-10', evidenceKind: 'recall', attemptType: 'legacy' },
      { at: 2, ok: true, ms: 500, localDate: '2026-08-11', evidenceKind: 'recall', attemptType: 'legacy' },
      { at: 3, ok: true, ms: 500, localDate: '2026-08-12', evidenceKind: 'recall', attemptType: 'legacy' },
    ])
    expect(developing.proficiency).toBe('developing')
    expect(strong.proficiency).toBe('strong')
  })

  it('uses only later qualifying legacy recall dates for mastery', () => {
    const progress = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'location-to-country'), [
      { at: 1, ok: true, ms: 500, localDate: '2026-08-10', evidenceKind: 'recall', attemptType: 'legacy' },
      { at: 2, ok: true, ms: 500, localDate: '2026-08-11', evidenceKind: 'recall', attemptType: 'legacy' },
      { at: 3, ok: true, ms: 500, localDate: '2026-08-12', evidenceKind: 'recall', attemptType: 'legacy' },
      { at: 4, ok: true, ms: 500, localDate: '2026-08-13', evidenceKind: 'recall', attemptType: 'legacy' },
    ])
    expect(progress.proficiency).toBe('mastered')
    expect(progress.hasEverMastered).toBe(true)
  })

  it('uses timestamp dates to group missing-localDate legacy evidence but not to qualify mastery', () => {
    const progress = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'location-to-country'), [
      { at: Date.parse('2026-08-10T10:00:00Z'), ok: true, ms: 500, evidenceKind: 'recall', attemptType: 'legacy' },
      { at: Date.parse('2026-08-11T10:00:00Z'), ok: true, ms: 500, evidenceKind: 'recall', attemptType: 'legacy' },
      { at: Date.parse('2026-08-12T10:00:00Z'), ok: true, ms: 500, evidenceKind: 'recall', attemptType: 'legacy' },
    ])
    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
  })

  it('keeps additional-skill legacy evidence on ordinary performance semantics', () => {
    const progress = deriveWorldCountriesAtomicProgress(recallTargetIdFor('NO', 'capital-to-country'), [
      { at: 1, ok: true, ms: 500, localDate: '2026-08-10', attemptType: 'legacy' },
      { at: 2, ok: true, ms: 500, localDate: '2026-08-10', attemptType: 'legacy' },
    ])
    expect(progress.proficiency).toBe('strong')
  })

  it('derives independent evidence for each atomic skill', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      attempt('NO', 'location-to-country', 1, false, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-12'),
    ])

    expect(progress.get(recallTargetIdFor('NO', 'location-to-country'))?.wrong).toBe(1)
    expect(progress.get(recallTargetIdFor('NO', 'country-to-capital'))?.mastered).toBe(true)
    const country = deriveCountryRecallProgress('NO', ['location-to-country', 'country-to-capital'], progress)
    expect(country.coreMasteredSkills).toBe(1)
    expect(country.complete).toBe(false)
  })

  it('requires explicit free recall on three recorded calendar dates for mastery', () => {
    const sameDay = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-10'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(sameDay.proficiency).toBe('strong')
    expect(sameDay.mastered).toBe(false)
    expect(sameDay.hasEverMastered).toBe(false)

    const developing = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(developing.proficiency).toBe('developing')
    expect(developing.mastered).toBe(false)
    expect(developing.hasEverMastered).toBe(false)

    const strong = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(strong.proficiency).toBe('strong')
    expect(strong.mastered).toBe(false)
    expect(strong.hasEverMastered).toBe(false)

    const mastered = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(mastered.proficiency).toBe('mastered')
    expect(mastered.mastered).toBe(true)
    expect(mastered.hasEverMastered).toBe(true)
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
    expect(progress.hasEverMastered).toBe(false)
  })

  it('treats the first legacy cluster as acquisition evidence', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 1, ok: true, ms: 500, attemptType: 'legacy', localDate: '2026-08-10', evidenceKind: 'recall' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 2, ok: true, ms: 500, attemptType: 'legacy', localDate: '2026-08-10', evidenceKind: 'recall' },
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('weak')
    expect(progress.mastered).toBe(false)
    expect(progress.hasEverMastered).toBe(false)
  })

  it('degrades an isolated lapse from Mastered to Strong and starts a new mastery boundary', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-15'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
  })

  it('collapses repeated failures on one local date into one proficiency lapse', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-15'),
      attempt('NO', 'country-to-capital', 5, false, '2026-08-15'),
      attempt('NO', 'country-to-capital', 6, false, '2026-08-15'),
      attempt('NO', 'country-to-capital', 7, true, '2026-08-15'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
  })

  it('steps repeated difficulty from Strong through Developing to Weak', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-13'),
      attempt('NO', 'country-to-capital', 6, false, '2026-08-14'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('developing')

    const weak = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 6, false, '2026-08-14'),
      attempt('NO', 'country-to-capital', 7, false, '2026-08-15'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(weak.proficiency).toBe('weak')
  })

  it('does not instantly restore Mastered after a same-session retry', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-13'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
    expect(progress.hasEverMastered).toBe(true)
  })

  it('retains historical mastery evidence while current mastery regresses after a failure', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
    expect(progress.hasEverMastered).toBe(true)
  })

  it('does not combine recall evidence across a failure for historical mastery', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['location-to-country'],
    }, [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10'),
      attempt('NO', 'location-to-country', 2, false, '2026-08-11'),
      attempt('NO', 'location-to-country', 3, true, '2026-08-12'),
    ]).get(recallTargetIdFor('NO', 'location-to-country'))!

    expect(progress.mastered).toBe(false)
    expect(progress.hasEverMastered).toBe(false)
  })

  it('restores Mastered after an isolated lapse only on a later qualifying date', () => {
    const sameDayRetry = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-13'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(sameDayRetry.proficiency).toBe('strong')
    expect(sameDayRetry.mastered).toBe(false)
    expect(sameDayRetry.hasEverMastered).toBe(true)

    const recovered = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-13'),
      attempt('NO', 'country-to-capital', 6, true, '2026-08-14'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(recovered.proficiency).toBe('mastered')
    expect(recovered.mastered).toBe(true)
    expect(recovered.hasEverMastered).toBe(true)
  })

  it('cancels accelerated recovery after a repeated lapse before restoration', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, false, '2026-08-14'),
      attempt('NO', 'country-to-capital', 6, true, '2026-08-15'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('developing')
    expect(progress.mastered).toBe(false)
    expect(progress.hasEverMastered).toBe(true)

    const rebuilt = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, false, '2026-08-13'),
      attempt('NO', 'country-to-capital', 5, false, '2026-08-14'),
      attempt('NO', 'country-to-capital', 6, true, '2026-08-15'),
      attempt('NO', 'country-to-capital', 7, true, '2026-08-16'),
      attempt('NO', 'country-to-capital', 8, true, '2026-08-17'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!
    expect(rebuilt.proficiency).toBe('mastered')
  })

  it('does not use accelerated recovery when a mastered lapse has no valid local date', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      attempt('NO', 'country-to-capital', 1, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 2, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 3, true, '2026-08-12'),
      { ...attempt('NO', 'country-to-capital', 4, false), localDate: 'not-a-date' },
      attempt('NO', 'country-to-capital', 5, true, '2026-08-13'),
    ]).get(recallTargetIdFor('NO', 'country-to-capital'))!

    expect(progress.proficiency).toBe('strong')
    expect(progress.mastered).toBe(false)
    expect(progress.hasEverMastered).toBe(true)
  })

  it('degrades only the atomic skill that was answered incorrectly', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      attempt('NO', 'location-to-country', 1, true, '2026-08-10'),
      attempt('NO', 'location-to-country', 2, true, '2026-08-11'),
      attempt('NO', 'location-to-country', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 6, true, '2026-08-12'),
      attempt('NO', 'location-to-country', 7, false, '2026-08-13'),
    ])

    expect(progress.get(recallTargetIdFor('NO', 'location-to-country'))?.proficiency).toBe('strong')
    expect(progress.get(recallTargetIdFor('NO', 'country-to-capital'))?.proficiency).toBe('mastered')
  })

  it('counts successful evidence between qualifying dates and preserves response-time statistics separately', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['country-to-capital'],
    }, [
      { ...attempt('NO', 'country-to-capital', 1, true, '2026-08-10'), ms: 1 },
      { ...attempt('NO', 'country-to-capital', 2, true, '2026-08-11'), ms: 5000 },
      { ...attempt('NO', 'country-to-capital', 3, true, '2026-08-12'), ms: 1000 },
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
      attempt('NO', 'location-to-country', 3, true, '2026-08-12'),
      attempt('NO', 'country-to-capital', 4, true, '2026-08-10'),
      attempt('NO', 'country-to-capital', 5, true, '2026-08-11'),
      attempt('NO', 'country-to-capital', 6, true, '2026-08-12'),
      attempt('NO', 'capital-to-country', 7, false, '2026-08-13'),
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
        ['location-to-country', 1], ['location-to-country', 2], ['location-to-country', 3],
        ['country-to-capital', 4], ['country-to-capital', 5], ['country-to-capital', 6],
        ['capital-to-country', 7], ['capital-to-country', 8], ['capital-to-country', 9],
        ['shape-to-country', 10], ['shape-to-country', 11], ['shape-to-country', 12],
      ].map(([skill, at], index) => attempt(
        'NO', skill as (typeof WORLD_COUNTRIES_RECALL_SKILLS)[number], at as number,
        true, `2026-08-${String(10 + (index % 3)).padStart(2, '0')}`,
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
