import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesRecallProgress } from './recallProgress'
import { recallTargetIdFor } from './recallTargets'
import { createWorldCountriesLearningPattern, createWorldCountriesLearningPatternsByCountry, createWorldCountriesLearningReadinessByCountry, deriveWorldCountriesLearningReadiness, getLearningReadinessBySubregion, getLearningReadinessBySubregionWithDrillEvidence, getLearningReadinessForCountry, isWorldCountriesCapitalLayerEstablished, isWorldCountriesCapitalRecallMastered, isWorldCountriesCountryLayerEstablished, isWorldCountriesCountryRecallMastered, WORLD_COUNTRIES_LEARNING_BASE, WORLD_COUNTRIES_LEARNING_PATTERN_BASE, WORLD_COUNTRIES_LEARNING_PATTERN_LINE, WORLD_COUNTRIES_LEARNING_PATTERN_PITCH, WORLD_COUNTRIES_LEARNING_PATTERN_WIDTH, WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES, WORLD_COUNTRIES_LEARNING_READINESS_STATES } from './learningReadiness'

describe('World Countries Learning Readiness', () => {
  it('keeps the canonical three-state labels and shared base together', () => {
    expect(WORLD_COUNTRIES_LEARNING_READINESS_STATES).toEqual(['NOT_LEARNED', 'COUNTRIES_LEARNED', 'COUNTRIES_AND_CAPITALS_LEARNED'])
    expect(WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES).toEqual([
      { state: 'NOT_LEARNED', label: 'Not learned', color: '#5A5E66' },
      expect.objectContaining({ state: 'COUNTRIES_LEARNED', label: 'Countries learned', color: '#5A5E66', swatchStyle: expect.objectContaining({ backgroundColor: '#5A5E66', backgroundImage: expect.stringContaining('rgba(62, 55, 25, 0.46)'), backgroundSize: '11px 11px' }) }),
    ])
  })

  it('shares the Not learned base with subtle pattern lines', () => {
    expect(WORLD_COUNTRIES_LEARNING_PATTERN_BASE).toBe(WORLD_COUNTRIES_LEARNING_BASE)
    expect(WORLD_COUNTRIES_LEARNING_PATTERN_LINE).toBe('#3E3719')
    expect(createWorldCountriesLearningPattern('diagonal')).toMatchObject({ kind: 'diagonal', baseColor: '#5A5E66', lineColor: '#3E3719', lineOpacity: 0.46, lineWidth: WORLD_COUNTRIES_LEARNING_PATTERN_WIDTH, pitch: WORLD_COUNTRIES_LEARNING_PATTERN_PITCH })
  })

  it('maps Learning Readiness to the matching pattern and leaves Not learned solid', () => {
    const entries = [
      { id: 'NO', subregionId: 'northern-europe' as const },
      { id: 'SE', subregionId: 'northern-europe' as const },
      { id: 'FI', subregionId: 'northern-europe' as const },
    ]
    expect(createWorldCountriesLearningPatternsByCountry(entries, new Map([
      ['NO', 'NOT_LEARNED'],
      ['SE', 'COUNTRIES_LEARNED'],
      ['FI', 'COUNTRIES_AND_CAPITALS_LEARNED'],
    ]))).toEqual(new Map([
      ['SE', expect.objectContaining({ kind: 'diagonal', baseColor: '#5A5E66', lineColor: '#3E3719', lineOpacity: 0.46 })],
    ]))
    expect(createWorldCountriesLearningPatternsByCountry(entries, new Map([
      ['FI', 'COUNTRIES_AND_CAPITALS_LEARNED'],
    ])).has('FI')).toBe(false)
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

  it('only treats complete Country recall as the already-known curriculum fallback', () => {
    const entries = [{ id: 'NO', subregionId: 'northern-europe' as const }]
    const partial = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO'], skills: ['location-to-country'] },
      [{ itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' }],
    )
    const complete = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO'], skills: ['location-to-country'] },
      [
        { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 2, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
      ],
    )

    expect(isWorldCountriesCountryRecallMastered(entries, 'northern-europe', partial)).toBe(false)
    expect(isWorldCountriesCountryRecallMastered(entries, 'northern-europe', complete)).toBe(true)
    expect(isWorldCountriesCountryLayerEstablished(entries, 'northern-europe', undefined, partial)).toBe(false)
    expect(isWorldCountriesCountryLayerEstablished(entries, 'northern-europe', { subregionId: 'northern-europe', countriesLearnedAt: 1 }, partial)).toBe(true)
  })

  it('keeps the Country fallback established after a later recall failure', () => {
    const entries = [{ id: 'NO', subregionId: 'northern-europe' as const }]
    const progress = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO'], skills: ['location-to-country'] },
      [
        { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 2, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 3, ok: false, ms: 500, evidenceKind: 'recall', localDate: '2026-08-12' },
      ],
    )

    expect(progress.get(recallTargetIdFor('NO', 'location-to-country'))?.proficiency).toBe('strong')
    expect(isWorldCountriesCountryRecallMastered(entries, 'northern-europe', progress)).toBe(true)
    expect(isWorldCountriesCountryLayerEstablished(entries, 'northern-europe', undefined, progress)).toBe(true)
  })

  it('only treats complete Capital recall as the already-known curriculum fallback', () => {
    const entries = [
      { id: 'NO', subregionId: 'northern-europe' as const },
      { id: 'SE', subregionId: 'northern-europe' as const },
    ]
    const incidental = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO', 'SE'], skills: ['country-to-capital'] },
      entries.map((entry, index) => ({
        itemId: recallTargetIdFor(entry.id, 'country-to-capital'),
        at: index + 1,
        ok: true,
        ms: 500,
        evidenceKind: 'recall' as const,
        localDate: '2026-08-10',
      })),
    )
    const mastered = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO', 'SE'], skills: ['country-to-capital'] },
      entries.flatMap((entry, index) => [
        { itemId: recallTargetIdFor(entry.id, 'country-to-capital'), at: index + 1, ok: true, ms: 500, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
        { itemId: recallTargetIdFor(entry.id, 'country-to-capital'), at: index + 3, ok: true, ms: 500, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
      ]),
    )

    expect(isWorldCountriesCapitalRecallMastered(entries, 'northern-europe', incidental)).toBe(false)
    expect(isWorldCountriesCapitalRecallMastered(entries, 'northern-europe', mastered)).toBe(true)
    expect(isWorldCountriesCapitalLayerEstablished(entries, 'northern-europe', undefined, incidental)).toBe(false)
    expect(isWorldCountriesCapitalLayerEstablished(entries, 'northern-europe', { subregionId: 'northern-europe', capitalsLearnedAt: 1 }, incidental)).toBe(true)
    expect(isWorldCountriesCapitalLayerEstablished(entries, 'northern-europe', undefined, mastered)).toBe(true)
  })

  it('keeps the Capital fallback established after a later recall failure', () => {
    const entries = [{ id: 'NO', subregionId: 'northern-europe' as const }]
    const progress = deriveWorldCountriesRecallProgress(
      { countryIds: ['NO'], skills: ['country-to-capital'] },
      [
        { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 2, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 3, ok: false, ms: 500, evidenceKind: 'recall', localDate: '2026-08-12' },
      ],
    )

    expect(progress.get(recallTargetIdFor('NO', 'country-to-capital'))?.proficiency).toBe('strong')
    expect(isWorldCountriesCapitalRecallMastered(entries, 'northern-europe', progress)).toBe(true)
    expect(isWorldCountriesCapitalLayerEstablished(entries, 'northern-europe', undefined, progress)).toBe(true)
  })

})
