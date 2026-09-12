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
  it('starts with Countries current and Region learned separate from Mastery', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor([]),
    })

    expect(journey.currentStageId).toBe('countries')
    expect(journey.stages).toEqual([
      expect.objectContaining({ id: 'countries', status: 'current' }),
      expect.objectContaining({ id: 'capitals', status: 'upcoming' }),
      expect.objectContaining({ id: 'region-learned', status: 'upcoming' }),
    ])
    expect(journey.regionLearned).toBe(false)
    expect(journey.masteryStatus).toBe('building')
    expect(journey.coreRecallComplete).toBe(false)
  })

  it('keeps Countries current while Country recall is in progress', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor([{ itemId: 'world-countries:location-to-country:NO', at: 1, ok: false }]),
    })

    expect(journey.currentStageId).toBe('countries')
    expect(journey.stages[0]?.status).toBe('current')
    expect(journey.stages[1]?.status).toBe('upcoming')
  })

  it('makes Capitals current once Countries are established', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor([{ itemId: 'world-countries:location-to-country:NO', at: 1, ok: false }]),
    })

    expect(journey.currentStageId).toBe('capitals')
    expect(journey.stages[0]?.status).toBe('complete')
    expect(journey.stages[1]?.status).toBe('current')
    expect(journey.stages[2]?.status).toBe('upcoming')
    expect(journey.regionLearned).toBe(false)
  })

  it('keeps Countries established complete when Country recall is mastered', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1 },
      recallProgress: progressFor(countryRecallAttempts()),
    })

    expect(journey.currentStageId).toBe('capitals')
    expect(journey.countryRecallMastered).toBe(true)
    expect(journey.countriesEstablished).toBe(true)
    expect(journey.stages[0]?.status).toBe('complete')
    expect(journey.stages[1]?.status).toBe('current')
  })

  it('uses historically qualified Country recall as a non-persisted readiness fallback', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor(countryRecallAttempts()),
    })

    expect(journey.countriesLearned).toBe(false)
    expect(journey.countriesEstablished).toBe(true)
    expect(journey.currentStageId).toBe('capitals')
    expect(journey.stages[0]).toMatchObject({ id: 'countries', status: 'complete' })
  })

  it('keeps both fallback-established layers complete after a later mistake', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor([
        ...completeRecallAttempts(),
        { itemId: 'world-countries:country-to-capital:NO', at: 5, ok: false },
      ]),
    })

    expect(journey.currentStageId).toBe(null)
    expect(journey.regionLearned).toBe(true)
    expect(journey.masteryStatus).toBe('building')
    expect(journey.countriesLearned).toBe(false)
    expect(journey.capitalsLearned).toBe(false)
    expect(journey.stages.every(stage => stage.status === 'complete')).toBe(true)
    expect(journey.capitalRecallMastered).toBe(true)
    expect(journey.coreRecallComplete).toBe(false)
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

    expect(journey.currentStageId).toBe('capitals')
    expect(journey.stages[1]?.status).toBe('current')
    expect(journey.stages[2]?.status).toBe('upcoming')
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
    expect(journey.currentStageId).toBe('capitals')
    expect(journey.stages[1]?.status).toBe('current')
  })

  it('marks Region learned after both learning layers are established', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor([...countryRecallAttempts(), { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true }]),
    })

    expect(journey.capitalsEstablished).toBe(true)
    expect(journey.currentStageId).toBe(null)
    expect(journey.regionLearned).toBe(true)
    expect(journey.coreRecallComplete).toBe(false)
    expect(journey.stages[0]?.status).toBe('complete')
    expect(journey.stages[1]?.status).toBe('complete')
    expect(journey.stages[2]).toMatchObject({ id: 'region-learned', status: 'complete' })
    expect(journey.masteryStatus).toBe('building')
  })

  it('uses historically qualified Capital recall as a non-persisted fallback', () => {
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
    expect(journey.currentStageId).toBe(null)
    expect(journey.regionLearned).toBe(true)
    expect(journey.masteryStatus).toBe('mastered')
    expect(journey.coreRecallComplete).toBe(true)
  })

  it('keeps Region learned complete while core recall develops', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor([
        ...countryRecallAttempts(),
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: false },
      ]),
    })

    expect(journey.currentStageId).toBe(null)
    expect(journey.regionLearned).toBe(true)
    expect(journey.masteryStatus).toBe('building')
    expect(journey.countriesLearned).toBe(true)
    expect(journey.capitalsLearned).toBe(true)
    expect(journey.stages.every(stage => stage.status === 'complete')).toBe(true)
  })

  it('reaches Mastered only after both core recall skills are complete', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      learningState: { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      recallProgress: progressFor(completeRecallAttempts()),
    })

    expect(journey.currentStageId).toBe(null)
    expect(journey.regionLearned).toBe(true)
    expect(journey.masteryStatus).toBe('mastered')
    expect(journey.coreRecallComplete).toBe(true)
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

    expect(detailText).toContain('capitals are learned; recall can keep strengthening')
    expect(detailText).toContain('mastery builds through Review')
    expect(detailText).not.toMatch(/milestone|gate|derived|scheduler|spaced|targeted/i)
  })

  it('treats complete core recall as the terminal presentation even without milestone metadata', () => {
    const journey = deriveWorldCountriesJourneyPresentation({
      subregionId: 'northern-europe',
      entries: norway,
      recallProgress: progressFor(completeRecallAttempts()),
    })

    expect(journey.coreRecallComplete).toBe(true)
    expect(journey.currentStageId).toBe(null)
    expect(journey.regionLearned).toBe(true)
    expect(journey.masteryStatus).toBe('mastered')
    expect(journey.stages.every(stage => stage.status === 'complete')).toBe(true)
  })
})
