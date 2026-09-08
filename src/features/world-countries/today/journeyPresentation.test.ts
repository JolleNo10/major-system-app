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
  })

  it('shows Country practice before the Country milestone is complete', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor([{ itemId: 'world-countries:location-to-country:NO', at: 1, ok: false }]),
    })

    expect(journey.currentStageId).toBe('practice-countries')
    expect(journey.stages[0]?.status).toBe('complete')
    expect(journey.stages[1]?.status).toBe('current')
  })

  it('presents Capitals as additive after Country Learning', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor([]),
    })

    expect(journey.currentStageId).toBe('add-capitals')
    expect(journey.countriesLearned).toBe(true)
    expect(journey.stages[2]?.status).toBe('complete')
    expect(journey.stages[3]?.status).toBe('current')
  })

  it('distinguishes Capital practice from a completed guided milestone', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor([{ itemId: 'world-countries:country-to-capital:NO', at: 1, ok: false }]),
    })

    expect(journey.currentStageId).toBe('put-it-together')
    expect(journey.stages[3]?.status).toBe('complete')
    expect(journey.stages[4]?.status).toBe('current')
  })

  it('reaches Master the region only after both guided milestones and core recall', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true },
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true },
        { itemId: 'world-countries:country-to-capital:NO', at: 4, ok: true },
      ]),
    })

    expect(journey.currentStageId).toBe('master-region')
    expect(journey.stages.slice(0, 5).every(stage => stage.status === 'complete')).toBe(true)
    expect(journey.stages[5]?.status).toBe('current')
  })
})
