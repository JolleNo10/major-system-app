import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { buildWorldCountriesTodayPlan } from './todayPlan'

function historyFor(
  attempts: readonly { itemId: string; at: number; ok: boolean; evidenceKind?: 'recall' | 'recognition'; localDate?: string }[],
  countryIds: readonly string[] = ['NO'],
) {
  return deriveWorldCountriesRecallHistory({
    countryIds,
    skills: ['location-to-country', 'country-to-capital'],
  }, attempts.map(attempt => ({ ms: 100, ...attempt })))
}

function completeCoreHistory(countryIds: readonly string[] = ['NO']) {
  return deriveWorldCountriesRecallHistory(
    { countryIds, skills: ['location-to-country', 'country-to-capital'] },
    countryIds.flatMap(countryId => [
      { itemId: `world-countries:location-to-country:${countryId}`, at: 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
      { itemId: `world-countries:location-to-country:${countryId}`, at: 2, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
      { itemId: `world-countries:country-to-capital:${countryId}`, at: 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
      { itemId: `world-countries:country-to-capital:${countryId}`, at: 4, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
    ]),
  )
}

function dueHistoryFor(countryIds: readonly string[]) {
  return deriveWorldCountriesRecallHistory(
    { countryIds, skills: ['location-to-country', 'country-to-capital'] },
    countryIds.flatMap((countryId, index) => [
      {
        itemId: `world-countries:location-to-country:${countryId}`,
        at: index + 1,
        ok: true,
        ms: 100,
        evidenceKind: 'recall' as const,
        localDate: '2026-08-10',
      },
      {
        itemId: `world-countries:location-to-country:${countryId}`,
        at: index + 100,
        ok: false,
        ms: 100,
        evidenceKind: 'recall' as const,
        localDate: '2026-08-11',
      },
    ]),
  )
}

describe('World Countries Today plan', () => {
  it.each([
    [1, 1],
    [7, 7],
    [8, 8],
    [10, 8],
  ])('bounds a %i-item due population to %i initial Review candidates', (readyCount, expectedBlockSize) => {
    const entries = countries.slice(0, readyCount)
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: [...new Set(entries.map(country => country.subregionId))],
      history: dueHistoryFor(entries.map(country => country.id)),
      localDate: '2026-08-19',
    })

    expect(plan.dueCount).toBe(readyCount)
    expect(plan.reviewQueue).toHaveLength(expectedBlockSize)
    expect(plan.reviewOpportunity).toMatchObject({ kind: 'review' })
  })

  it('uses the same eight-item bound for weak-spot practice', () => {
    const entries = countries.slice(0, 10)
    const history = deriveWorldCountriesRecallHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      entries.flatMap((country, index) => [
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-19' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 100, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-19' },
      ]),
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      effectiveCountries: entries,
      effectiveSubregionIds: [...new Set(entries.map(country => country.subregionId))],
      learningStates: [...new Set(entries.map(country => country.subregionId))].map(subregionId => ({ subregionId, countriesLearnedAt: 1, capitalsLearnedAt: 2 })),
      history,
      localDate: '2026-08-19',
    })

    expect(plan.dueCount).toBe(0)
    expect(plan.consolidationCandidates.length).toBeGreaterThan(8)
    expect(plan.consolidationQueue).toHaveLength(8)
    expect(plan.reviewOpportunity).toMatchObject({ kind: 'consolidate' })
  })

  it('keeps a scoped plan inside the supplied active Country population', () => {
    const scopedHistory = deriveWorldCountriesRecallHistory({
      countryIds: ['NO', 'IN'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: false, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:location-to-country:IN', at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: 'world-countries:location-to-country:IN', at: 3, ok: false, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11' },
    ])
    const india = countries.find(country => country.id === 'IN')!

    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [india],
      history: scopedHistory,
      effectiveCountries: [india],
      effectiveSubregionIds: [india.subregionId],
      localDate: '2026-08-19',
    })

    expect(plan.dueCount).toBe(1)
    expect(plan.reviewQueue[0]?.country.id).toBe('IN')
  })

  it('counts only the two core skills and prioritizes latest failures', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: false, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:capital-to-country:NO', at: 3, ok: false, evidenceKind: 'recall', localDate: '2026-08-11' },
      ]),
      localDate: '2026-08-19',
    })
    expect(plan.dueCount).toBe(1)
    expect(plan.dueCandidates[0]?.target.skill).toBe('location-to-country')
  })

  it('keeps Capital Learning behind Country establishment rather than target introduction', () => {
    const partialCountryPractice = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
      ]),
      localDate: '2026-08-18',
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(partialCountryPractice.introductions.get('world-countries:location-to-country:NO')?.introduced).toBe(true)
    expect(partialCountryPractice.curriculumRecommendation?.track).toBe('learn-countries')
    expect(partialCountryPractice.reviewOpportunity?.kind).toBe('consolidate')

    const countryEstablished = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
      ]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      localDate: '2026-08-18',
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(countryEstablished.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(countryEstablished.reviewOpportunity?.kind).toBe('consolidate')
  })

  it('uses historically qualified Country recall as a non-persisted fallback for already-known Countries', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
      ]),
      localDate: '2026-08-11',
      effectiveSubregionIds: ['northern-europe'],
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(plan.reviewOpportunity).toBeNull()
  })

  it('does not recommend Learn Countries again after a failed recall', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:location-to-country:NO', at: 3, ok: false, evidenceKind: 'recall', localDate: '2026-08-12' },
      ]),
      localDate: '2026-08-12',
      effectiveSubregionIds: ['northern-europe'],
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(plan.reviewOpportunity?.kind).toBe('review')
    expect(plan.reviewQueue).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: 'NO', skill: 'location-to-country' } }),
    ]))
  })

  it('does not recommend Learn Capitals again after a failed Capital recall', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:country-to-capital:NO', at: 4, ok: true, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:country-to-capital:NO', at: 5, ok: false, evidenceKind: 'recall', localDate: '2026-08-12' },
      ]),
      localDate: '2026-08-12',
      effectiveSubregionIds: ['northern-europe'],
    })

    expect(plan.curriculumRecommendation).toBeNull()
    expect(plan.reviewOpportunity?.kind).toBe('review')
    expect(plan.reviewQueue).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: { countryId: 'NO', skill: 'country-to-capital' } }),
    ]))
  })

  it('does not let incidental Capital practice skip Capital Learning', () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'SE')
    const history = deriveWorldCountriesRecallHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      entries.flatMap((country, index) => [
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
      ]),
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      effectiveSubregionIds: ['northern-europe'],
      localDate: '2026-08-18',
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
    expect(plan.reviewOpportunity?.kind).toBe('consolidate')
  })

  it('keeps Capital Learning required when only some Capital targets are mastered', () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'SE')
    const norway = entries.find(country => country.id === 'NO')!
    const sweden = entries.find(country => country.id === 'SE')!
    const history = deriveWorldCountriesRecallHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      [
        ...entries.map((country, index) => ({ itemId: `world-countries:location-to-country:${country.id}`, at: index + 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' })),
        { itemId: `world-countries:country-to-capital:${norway.id}`, at: 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-16' },
        { itemId: `world-countries:country-to-capital:${norway.id}`, at: 4, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-17' },
        { itemId: `world-countries:country-to-capital:${sweden.id}`, at: 5, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-18' },
      ],
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      effectiveSubregionIds: ['northern-europe'],
      localDate: '2026-08-18',
    })

    expect(plan.curriculumRecommendation?.track).toBe('learn-capitals')
  })

  it('derives the selected Subregion action with the same Country and Capital readiness rules', () => {
    const northern = countries.find(country => country.id === 'NO')!
    const central = countries.find(country => country.subregionId === 'central-europe')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [northern, central],
      effectiveCountries: [northern, central],
      effectiveSubregionIds: ['northern-europe', 'central-europe'],
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }],
      history: historyFor([], [northern.id, central.id]),
      localDate: '2026-08-18',
    })

    expect(plan.curriculumRecommendation?.subregionId).toBe('northern-europe')
    expect(plan.curriculumRecommendationsBySubregion.get('northern-europe')?.track).toBe('learn-capitals')
    expect(plan.curriculumRecommendationsBySubregion.get('central-europe')?.track).toBe('learn-countries')
  })

  it('does not require redundant Capital Learning when every Capital target is mastered', () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'SE')
    const history = deriveWorldCountriesRecallHistory(
      { countryIds: entries.map(country => country.id), skills: ['location-to-country', 'country-to-capital'] },
      entries.flatMap((country, index) => [
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-16' },
        { itemId: `world-countries:location-to-country:${country.id}`, at: index + 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-17' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 5, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-16' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: index + 7, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-17' },
      ]),
    )
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: entries,
      history,
      effectiveSubregionIds: ['northern-europe'],
      localDate: '2026-08-17',
    })

    expect(plan.curriculumRecommendation).toBeNull()
    expect(plan.reviewOpportunity).toBeNull()
  })

  it('keeps the curriculum journey focus while due review owns Today priority', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const southern = countries.find(country => country.subregionId === 'southern-europe')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [northern, southern],
      effectiveCountries: [northern, southern],
      effectiveSubregionIds: ['northern-europe', 'southern-europe'],
      history: historyFor([
        { itemId: `world-countries:location-to-country:${southern.id}`, at: 1, ok: true, localDate: '2026-08-18' },
        { itemId: `world-countries:location-to-country:${southern.id}`, at: 2, ok: false, localDate: '2026-08-19' },
      ], [northern.id, southern.id]),
      localDate: '2026-08-19',
    })

    expect(plan.reviewOpportunity?.kind).toBe('review')
    expect(plan.curriculumRecommendation?.track).toBe('learn-countries')
    expect(plan.curriculumRecommendation?.subregionId).toBe('northern-europe')
    expect(plan.plannerFocusSubregionId).toBe('northern-europe')
  })

  it('does not use the first review candidate when the bounded block spans Subregions', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const southern = countries.find(country => country.subregionId === 'southern-europe')!
    const history = historyFor([
      ...[northern, southern].flatMap(country => [
        { itemId: `world-countries:location-to-country:${country.id}`, at: country.id === northern.id ? 20 : 1, ok: true, localDate: '2026-08-18' },
        { itemId: `world-countries:location-to-country:${country.id}`, at: country.id === northern.id ? 21 : 2, ok: false, localDate: '2026-08-19' },
        { itemId: `world-countries:country-to-capital:${country.id}`, at: country.id === northern.id ? 30 : 3, ok: true, localDate: '2026-08-19' },
      ]),
    ], [northern.id, southern.id])
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [northern, southern],
      effectiveCountries: [southern, northern],
      effectiveSubregionIds: ['northern-europe', 'southern-europe'],
      learningStates: [
        { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
        { subregionId: 'southern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
      ],
      history,
      localDate: '2026-08-19',
    })

    expect(plan.curriculumRecommendation).toBeNull()
    expect(plan.reviewOpportunity?.kind).toBe('review')
    expect(plan.reviewQueue.length).toBeGreaterThan(1)
    expect(plan.reviewQueue[0]?.country.subregionId).toBe('southern-europe')
    expect(plan.plannerFocusSubregionId).toBe('northern-europe')
  })

  it('derives due Review, Journey Learning, and fallback consolidation independently', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const due = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, localDate: '2026-08-18' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: false, localDate: '2026-08-19' },
      ]),
      localDate: '2026-08-19',
    })
    expect(due.reviewOpportunity?.kind).toBe('review')
    expect(due.curriculumRecommendation?.track).toBe('learn-countries')

    const learning = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: historyFor([]),
      localDate: '2026-08-19',
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(learning.curriculumRecommendation?.track).toBe('learn-countries')
    expect(learning.reviewOpportunity).toBeNull()

    const consolidation = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
        { itemId: 'world-countries:country-to-capital:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
      ]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      localDate: '2026-08-18',
    })
    expect(consolidation.dueCount).toBe(0)
    expect(consolidation.curriculumRecommendation).toBeNull()
    expect(consolidation.reviewOpportunity?.kind).toBe('consolidate')

    const complete = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: completeCoreHistory(),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      localDate: '2026-08-11',
    })
    expect(complete.scopeComplete).toBe(true)
    expect(complete.plannerFocusSubregionId).toBeNull()
    expect(complete.reviewOpportunity).toBeNull()
  })

  it('exposes caught-up-but-incomplete consolidation and excludes complete targets', () => {
    const country = countries.find(entry => entry.id === 'NO')!
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [country],
      history: deriveWorldCountriesRecallHistory({
        countryIds: ['NO'],
        skills: ['location-to-country', 'country-to-capital'],
      }, [
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-17' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
        { itemId: 'world-countries:country-to-capital:NO', at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      ]),
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      localDate: '2026-08-18',
    })

    expect(plan.dueCount).toBe(0)
    expect(plan.scopeComplete).toBe(false)
    expect(plan.incompleteCountryCount).toBe(1)
    expect(plan.consolidationCandidates).toHaveLength(1)
    expect(plan.consolidationCandidates[0]?.target.skill).toBe('country-to-capital')
    expect(plan.consolidationQueue).toHaveLength(1)
    expect(plan.reviewOpportunity).toMatchObject({ kind: 'consolidate' })
  })

  it('keeps consolidation candidates inside the supplied Continent population', () => {
    const norway = countries.find(entry => entry.id === 'NO')!
    const india = countries.find(entry => entry.id === 'IN')!
    const history = deriveWorldCountriesRecallHistory({
      countryIds: ['NO', 'IN'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:country-to-capital:NO', at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:location-to-country:IN', at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
      { itemId: 'world-countries:country-to-capital:IN', at: 4, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-18' },
    ])
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: [norway],
      effectiveCountries: [norway],
      effectiveSubregionIds: [norway.subregionId],
      history,
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      localDate: '2026-08-18',
    })

    expect(plan.consolidationCandidates.every(candidate => candidate.country.continent === 'Europe')).toBe(true)
    expect(plan.consolidationCandidates.some(candidate => candidate.country.id === india.id)).toBe(false)
  })
})
