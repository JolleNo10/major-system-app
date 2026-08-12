import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesRecallProgress } from './recallProgress'
import { recallTargetIdFor } from './recallTargets'
import { createWorldCountriesLearningReadinessByCountry, deriveWorldCountriesLearningReadiness, getLearningReadinessBySubregion, getLearningReadinessBySubregionWithDrillEvidence, getLearningReadinessForCountry, WORLD_COUNTRIES_LEARNING_READINESS_COLORS, WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES } from './learningReadiness'

describe('World Countries Learning Readiness', () => {
  it('keeps the canonical three-state palette and labels together', () => {
    expect(WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES).toEqual([
      { state: 'NOT_LEARNED', label: 'Not learned', color: '#52525b' },
      { state: 'COUNTRIES_LEARNED', label: 'Countries learned', color: '#71717a' },
      { state: 'COUNTRIES_AND_CAPITALS_LEARNED', label: 'Countries + Capitals learned', color: '#a1a1aa' },
    ])
    expect(WORLD_COUNTRIES_LEARNING_READINESS_COLORS).toEqual({ NOT_LEARNED: '#52525b', COUNTRIES_LEARNED: '#71717a', COUNTRIES_AND_CAPITALS_LEARNED: '#a1a1aa' })
  })

  it.each([
    [undefined, undefined, 'NOT_LEARNED'],
    [123, undefined, 'COUNTRIES_LEARNED'],
    [123, 456, 'COUNTRIES_AND_CAPITALS_LEARNED'],
    [undefined, 456, 'NOT_LEARNED'],
  ] as const)('derives %s/%s as %s', (countriesLearnedAt, capitalsLearnedAt, expected) => {
    expect(deriveWorldCountriesLearningReadiness({ subregionId: 'northern-europe', ...(countriesLearnedAt === undefined ? {} : { countriesLearnedAt }), ...(capitalsLearnedAt === undefined ? {} : { capitalsLearnedAt }) })).toBe(expected)
  })

  it('uses one readiness state for every Country in a Subregion', () => {
    const states = [{ subregionId: 'northern-europe' as const, countriesLearnedAt: 123 }]
    const entries = [{ id: 'NO', subregionId: 'northern-europe' as const }, { id: 'SE', subregionId: 'northern-europe' as const }]
    expect(createWorldCountriesLearningReadinessByCountry(entries, states)).toEqual(new Map([['NO', 'COUNTRIES_LEARNED'], ['SE', 'COUNTRIES_LEARNED']]))
  })

  it('keeps a Capitals-first row Not learned until Countries is learned', () => {
    const state = { subregionId: 'northern-europe' as const, capitalsLearnedAt: 456 }
    expect(getLearningReadinessForCountry({ subregionId: 'northern-europe' }, getLearningReadinessBySubregion([state]))).toBe('NOT_LEARNED')
  })

  it('promotes a Subregion to Countries learned when every Country is Developing or better in location Drill', () => {
    const entries = [
      { id: 'NO', subregionId: 'northern-europe' as const },
      { id: 'SE', subregionId: 'northern-europe' as const },
    ]
    const progress = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO', 'SE'], skills: ['location-to-country'] },
      entries.map((entry, index) => ({
        itemId: recallTargetIdFor(entry.id, 'location-to-country'),
        at: index + 1,
        ok: true,
        ms: 500,
        evidenceKind: 'recognition' as const,
      })),
    )

    expect(getLearningReadinessBySubregionWithDrillEvidence(entries, [], progress).get('northern-europe')).toBe('COUNTRIES_LEARNED')
  })

  it('does not promote a Subregion while a Country is below Developing', () => {
    const entries = [
      { id: 'NO', subregionId: 'northern-europe' as const },
      { id: 'SE', subregionId: 'northern-europe' as const },
    ]
    const progress = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO', 'SE'], skills: ['location-to-country'] },
      [{
        itemId: recallTargetIdFor('NO', 'location-to-country'),
        at: 1,
        ok: true,
        ms: 500,
        evidenceKind: 'recognition',
      }],
    )

    expect(getLearningReadinessBySubregionWithDrillEvidence(entries, [], progress).get('northern-europe')).toBe('NOT_LEARNED')
  })
})
