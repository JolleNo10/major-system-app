import { describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import {
  getNextLearningStageLabel,
  rebuildLearningPlanAfterCountryOrderSave,
  type LearningPlanStage,
} from '@/features/world-countries/learning/stagedLearningPlan'
import { deriveLearningMapPresentation } from './learningMapPresentation'

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'FI', country: 'Finland', capital: 'Helsinki', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

describe('staged learning flow derivations', () => {
  it('labels an absent next stage as Continue to Final recall', () => {
    const plan: LearningPlanStage<string>[] = [{ kind: 'set', set: { index: 0, ids: ['NO'] } }]

    expect(getNextLearningStageLabel(plan, 0)).toBe('Continue to Final recall')
  })

  it('labels the next Set with its one-based number', () => {
    const plan: LearningPlanStage<string>[] = [
      { kind: 'set', set: { index: 0, ids: ['NO'] } },
      { kind: 'set', set: { index: 1, ids: ['SE'] } },
    ]

    expect(getNextLearningStageLabel(plan, 0)).toBe('Continue to Set 2')
  })

  it('labels the next Combined stage with its introduced Country count', () => {
    const plan: LearningPlanStage<string>[] = [
      { kind: 'set', set: { index: 0, ids: ['NO'] } },
      { kind: 'combined', ids: ['NO', 'SE', 'FI'] },
    ]

    expect(getNextLearningStageLabel(plan, 0)).toBe('Practise all 3')
  })

  it('rebuilds a reordered plan and resets walkthrough position', () => {
    const result = rebuildLearningPlanAfterCountryOrderSave(['SE', 'NO', 'FI'], 3, 0)

    expect(result.countryIds).toEqual(['SE', 'NO', 'FI'])
    expect(result.plan).toMatchObject([{ kind: 'set', set: { ids: ['SE', 'NO', 'FI'] } }, { kind: 'final' }])
    expect(result.stageIndex).toBe(0)
    expect(result.walkthroughIndex).toBe(0)
  })

  it('clamps a reordered plan stage index to the rebuilt plan', () => {
    const result = rebuildLearningPlanAfterCountryOrderSave(['SE', 'NO'], 3, 99)

    expect(result.stageIndex).toBe(result.plan.length - 1)
  })
})

describe('learning map presentation derivation', () => {
  function derive(overrides: Partial<Parameters<typeof deriveLearningMapPresentation>[0]> = {}) {
    return deriveLearningMapPresentation({
      phase: 'practice',
      fullEntries: entries,
      stageEntries: [entries[1]],
      fallbackEntries: entries,
      walkthroughIndex: 0,
      ordered: null,
      practice: null,
      hoveredCountryId: null,
      orderPresentation: {},
      ...overrides,
    })
  }

  it.each(['final-gate', 'final-recall', 'complete'])('uses the full map scope during %s', phase => {
    expect(derive({ phase }).mapEntries).toEqual(entries)
  })

  it('uses the current stage scope during ordinary phases', () => {
    expect(derive({ phase: 'location-practice' }).mapEntries).toEqual([entries[1]])
  })

  it('falls back to the presentation scope when stage entries are empty', () => {
    expect(derive({ phase: 'location-practice', stageEntries: [], fallbackEntries: [entries[2]] }).mapEntries).toEqual([entries[2]])
  })

  it('preserves walkthrough highlight and naming', () => {
    const result = derive({ phase: 'walkthrough', stageEntries: entries.slice(0, 2), walkthroughIndex: 1 })

    expect(result.presentation).toMatchObject({
      namedCountryId: 'SE',
      highlightedCountryId: 'SE',
      showHighlightedNames: true,
      showOrderNumbers: true,
    })
  })

  it('derives the final-recall highlight from ordered recall', () => {
    const result = derive({ phase: 'final-recall', ordered: { order: ['SE', 'NO'], currentIndex: 0 } })

    expect(result.presentation).toMatchObject({
      highlightedCountryId: 'SE',
      showHoverNames: true,
      ariaLabel: 'Highlighted Country for final recall',
    })
  })

  it('derives the practice highlight from the current practice Country', () => {
    const result = derive({ phase: 'practice', practice: { currentKey: 'FI' } })

    expect(result.presentation).toMatchObject({
      highlightedCountryId: 'FI',
      mapClassName: '[&>svg]:max-h-[510px]',
    })
  })

  it('composes order-authoring presentation overrides with common map presentation', () => {
    const onCountryClick = vi.fn()
    const countryLabelsById = new Map([['SE', '1. Sweden']])
    const result = derive({
      phase: 'practice',
      orderPresentation: {
        overviewCountries: entries,
        countryLabelsById,
        answerSelectionCountryIds: ['NO', 'SE', 'FI'],
        onCountryClick,
      },
    })

    expect(result.mapEntries).toEqual([entries[1]])
    expect(result.presentation).toMatchObject({
      overviewCountries: entries,
      countryLabelsById,
      answerSelectionCountryIds: ['NO', 'SE', 'FI'],
      onCountryClick,
      highlightedCountryId: null,
      mapClassName: '[&>svg]:max-h-[510px]',
    })
    expect(result.presentationKey).toBe('practice:SE')
  })
})
