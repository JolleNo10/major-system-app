import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveLearningMapPresentation } from './learningMapPresentation'
import { WORLD_COUNTRIES_LEARNING_PATTERN_BASE, WORLD_COUNTRIES_LEARNING_PATTERN_LINE } from '@/features/world-countries/learning/learningReadiness'

const entries = countries.slice(0, 2)

function derive(completionPatternKind?: 'diagonal', phase = 'complete', activeLearningPatternKind?: 'diagonal') {
  return deriveLearningMapPresentation({
    phase,
    fullEntries: entries,
    stageEntries: entries,
    fallbackEntries: entries,
    walkthroughIndex: 0,
    ordered: null,
    practice: null,
    hoveredCountryId: null,
    orderPresentation: {},
    completionPatternKind,
    activeLearningPatternKind,
  })
}

describe('Learning map completion presentation', () => {
  it('uses diagonal warm-neutral Learning treatment for Country completion', () => {
    expect(derive('diagonal').presentation.countryPatternsById?.get(entries[0].id)).toMatchObject({
      kind: 'diagonal', baseColor: WORLD_COUNTRIES_LEARNING_PATTERN_BASE, lineColor: WORLD_COUNTRIES_LEARNING_PATTERN_LINE, lineWidth: 2, pitch: 16,
    })
  })

  it('does not add a separate pattern for Capital completion', () => {
    expect(derive().presentation.countryPatternsById).toBeUndefined()
  })

  it('keeps the established Country pattern during active Capital Learning', () => {
    expect(derive(undefined, 'walkthrough', 'diagonal').presentation.countryPatternsById?.get(entries[0].id)).toMatchObject({ kind: 'diagonal' })
    expect(derive(undefined, 'practice', 'diagonal').presentation.countryPatternsById?.get(entries[0].id)).toMatchObject({ kind: 'diagonal' })
    expect(derive(undefined, 'final-recall', 'diagonal').presentation.countryPatternsById?.get(entries[0].id)).toMatchObject({ kind: 'diagonal' })
    expect(derive(undefined, 'complete', 'diagonal').presentation.countryPatternsById).toBeUndefined()
  })
})
