import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveLearningMapPresentation } from './learningMapPresentation'

const entries = countries.slice(0, 2)

function derive(completionPatternKind: 'diagonal' | 'crosshatch') {
  return deriveLearningMapPresentation({
    phase: 'complete',
    fullEntries: entries,
    stageEntries: entries,
    fallbackEntries: entries,
    walkthroughIndex: 0,
    ordered: null,
    practice: null,
    hoveredCountryId: null,
    orderPresentation: {},
    completionPatternKind,
  })
}

describe('Learning map completion presentation', () => {
  it('uses diagonal warm-neutral Learning treatment for Country completion', () => {
    expect(derive('diagonal').presentation.countryPatternsById?.get(entries[0].id)).toMatchObject({
      kind: 'diagonal', baseColor: '#4a4742', lineColor: '#d6c7ad', lineWidth: 2, pitch: 16,
    })
  })

  it('uses crosshatch warm-neutral Learning treatment for Capital completion', () => {
    expect(derive('crosshatch').presentation.countryPatternsById?.get(entries[0].id)).toMatchObject({
      kind: 'crosshatch', baseColor: '#4a4742', lineColor: '#d6c7ad', lineWidth: 2, pitch: 16,
    })
  })
})
