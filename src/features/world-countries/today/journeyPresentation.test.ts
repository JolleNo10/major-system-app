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

  it('marks Countries established and allows Capitals when Country recall is not yet mastered', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor([{ itemId: 'world-countries:location-to-country:NO', at: 1, ok: false }]),
    })

    expect(journey.currentStageId).toBe('add-capitals')
    expect(journey.stages[1]?.status).toBe('complete')
    expect(journey.stages[2]).toMatchObject({ id: 'countries-established', status: 'complete' })
    expect(journey.stages[3]?.status).toBe('current')
  })

  it('keeps Countries established complete when Country recall is mastered', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor(countryRecallAttempts()),
    })

    expect(journey.currentStageId).toBe('add-capitals')
    expect(journey.countryRecallMastered).toBe(true)
    expect(journey.countriesEstablished).toBe(true)
    expect(journey.stages[2]?.status).toBe('complete')
    expect(journey.stages[3]?.status).toBe('current')
  })

  it('uses mastered Country recall as a non-persisted readiness fallback', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor(countryRecallAttempts()),
    })

    expect(journey.countriesLearned).toBe(false)
    expect(journey.countriesEstablished).toBe(true)
    expect(journey.currentStageId).toBe('add-capitals')
    expect(journey.stages[2]).toMatchObject({ id: 'countries-established', status: 'complete' })
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

  it('does not complete Add the capitals after incidental Capital practice', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor([
        ...countryRecallAttempts(),
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true },
      ]),
    })

    expect(journey.capitalsEstablished).toBe(false)
    expect(journey.currentStageId).toBe('add-capitals')
    expect(journey.stages[3]?.status).toBe('current')
  })

  it('uses the Capital milestone to move into combined recall', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor([...countryRecallAttempts(), { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true }]),
    })

    expect(journey.capitalsEstablished).toBe(true)
    expect(journey.currentStageId).toBe('put-it-together')
  })

  it('uses fully mastered Capital recall as a non-persisted fallback', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor([
        ...countryRecallAttempts(),
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true },
        { itemId: 'world-countries:country-to-capital:NO', at: 4, ok: true },
      ]),
    })

    expect(journey.capitalsLearned).toBe(false)
    expect(journey.capitalsEstablished).toBe(true)
    expect(journey.currentStageId).toBe('master-region')
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

  it('describes journey details in learner-facing language', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor([
        ...countryRecallAttempts(),
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: false },
      ]),
    })
    const details = journey.stages.map(stage => stage.detail)
    const detailText = details.join(' ')

    expect(detailText).toContain('countries are learned and recall is strong')
    expect(detailText).toContain('capitals are learned; recall can keep strengthening')
    expect(detailText).toContain('Practice countries and capitals together')
    expect(detailText).not.toMatch(/milestone|gate|derived|scheduler|spaced|targeted/i)
  })

  it('treats complete core recall as the terminal presentation even without milestone metadata', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor(completeRecallAttempts()),
    })

    expect(journey.complete).toBe(true)
    expect(journey.currentStageId).toBe('master-region')
    expect(journey.stages.every(stage => stage.status === 'complete')).toBe(true)
  })
})
