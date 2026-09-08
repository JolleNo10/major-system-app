import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { deriveWorldCountriesJourneyPresentation } from './journeyPresentation'

const norway = countries.filter(country => country.id === 'NO')

function progressFor(attempts: readonly { itemId: string; at: number; ok: boolean }[]) {
  return deriveWorldCountriesRecallProgress(
    { countryIds: ['NO'], skills: ['location-to-country', 'country-to-capital'] },
    attempts.map((attempt, index) => ({ ...attempt, ms: 100, localDate: `2026-08-${10 + index}`, evidenceKind: 'recall' as const })),
  )
}

function countryRecallAttempts() {
  return [
    { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true },
    { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true },
  ]
}

function completeRecallAttempts() {
  return [
    ...countryRecallAttempts(),
    { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true },
    { itemId: 'world-countries:country-to-capital:NO', at: 4, ok: true },
  ]
}

describe('World Countries learner journey presentation', () => {
  it('starts at Meet the countries without inventing durable journey state', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor([]),
    })

    expect(journey.currentStageId).toBe('meet-countries')
    expect(journey.stages[0]).toMatchObject({ id: 'meet-countries', status: 'current' })
    expect(journey.stages[1]?.status).toBe('upcoming')
    expect(journey.complete).toBe(false)
  })

  it('shows Country practice while Country recall is in progress', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor([{ itemId: 'world-countries:location-to-country:NO', at: 1, ok: false }]),
    })

    expect(journey.currentStageId).toBe('practice-countries')
    expect(journey.stages[0]?.status).toBe('complete')
    expect(journey.stages[1]?.status).toBe('current')
  })

  it('makes Master the countries current when Country Learning is complete but recall is not mastered', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor([{ itemId: 'world-countries:location-to-country:NO', at: 1, ok: false }]),
    })

    expect(journey.currentStageId).toBe('master-countries')
    expect(journey.stages[1]?.status).toBe('complete')
    expect(journey.stages[2]?.status).toBe('current')
    expect(journey.stages[3]?.status).toBe('upcoming')
  })

  it('moves to Add the capitals only after Country recall is mastered', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor(countryRecallAttempts()),
    })

    expect(journey.currentStageId).toBe('add-capitals')
    expect(journey.countryRecallMastered).toBe(true)
    expect(journey.stages[2]?.status).toBe('complete')
    expect(journey.stages[3]?.status).toBe('current')
  })

  it('keeps Add the capitals current after a failed Capital attempt without its milestone', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor([
        ...countryRecallAttempts(),
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: false },
      ]),
    })

    expect(journey.currentStageId).toBe('add-capitals')
    expect(journey.stages[3]?.status).toBe('current')
    expect(journey.stages[4]?.status).toBe('upcoming')
  })

  it('shows Put it all together while Capital Learning is complete but combined recall develops', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor([
        ...countryRecallAttempts(),
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: false },
      ]),
    })

    expect(journey.currentStageId).toBe('put-it-together')
    expect(journey.stages[3]?.status).toBe('complete')
    expect(journey.stages[4]?.status).toBe('current')
    expect(journey.stages[5]?.status).toBe('upcoming')
  })

  it('reaches a meaningful completed final state after both milestones and core mastery', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor(completeRecallAttempts()),
    })

    expect(journey.currentStageId).toBe('master-region')
    expect(journey.complete).toBe(true)
    expect(journey.stages.every(stage => stage.status === 'complete')).toBe(true)
  })
})
