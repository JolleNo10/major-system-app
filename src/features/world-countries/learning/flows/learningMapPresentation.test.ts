import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveLearningMapPresentation } from './learningMapPresentation'
import { WORLD_COUNTRIES_LEARNING_PATTERN_BASE, WORLD_COUNTRIES_LEARNING_PATTERN_LINE } from '@/features/world-countries/learning/learningReadiness'

const entries = countries.slice(0, 2)

function derive(completionPatternKind?: 'diagonal', phase = 'complete', activeLearningPatternKind?: 'diagonal', activeTargetId?: string) {
  return deriveLearningMapPresentation({
    phase,
    fullEntries: entries,
    stageEntries: entries,
    fallbackEntries: entries,
    walkthroughIndex: 0,
    ordered: phase === 'final-recall' && activeTargetId ? { order: [activeTargetId], currentIndex: 0 } : null,
    practice: (phase === 'practice' || phase === 'combined-practice') && activeTargetId ? { currentKey: activeTargetId } : null,
    hoveredCountryId: null,
    orderPresentation: {},
    completionPatternKind,
    activeLearningPatternKind,
  })
}

describe('Learning map completion presentation', () => {
  it('uses the shared diagonal Learning treatment for Country completion', () => {
    expect(derive('diagonal').presentation.countryPatternsById?.get(entries[0].id)).toMatchObject({
      kind: 'diagonal', baseColor: WORLD_COUNTRIES_LEARNING_PATTERN_BASE, lineColor: WORLD_COUNTRIES_LEARNING_PATTERN_LINE, lineOpacity: 0.46, lineWidth: 1.8, pitch: 11,
    })
  })

  it('does not add a separate pattern for Capital completion', () => {
    expect(derive().presentation.countryPatternsById).toBeUndefined()
  })

  it('keeps the established Country pattern on non-target Countries during active Learning', () => {
    expect(derive(undefined, 'walkthrough', 'diagonal').presentation.countryPatternsById?.get(entries[1].id)).toMatchObject({ kind: 'diagonal' })
    expect(derive(undefined, 'practice', 'diagonal', entries[0].id).presentation.countryPatternsById?.get(entries[1].id)).toMatchObject({ kind: 'diagonal' })
    expect(derive(undefined, 'final-recall', 'diagonal', entries[0].id).presentation.countryPatternsById?.get(entries[1].id)).toMatchObject({ kind: 'diagonal' })
    expect(derive(undefined, 'complete', 'diagonal').presentation.countryPatternsById).toBeUndefined()
  })

  it('removes only the active task Country from the Learning pattern', () => {
    const first = derive(undefined, 'final-recall', 'diagonal', entries[0].id)
    expect(first.presentation.highlightedCountryId).toBe(entries[0].id)
    expect(first.presentation.countryPatternsById?.has(entries[0].id)).toBe(false)
    expect(first.presentation.countryPatternsById?.get(entries[1].id)).toMatchObject({ kind: 'diagonal' })

    const next = derive(undefined, 'final-recall', 'diagonal', entries[1].id)
    expect(next.presentation.countryPatternsById?.has(entries[0].id)).toBe(true)
    expect(next.presentation.countryPatternsById?.has(entries[1].id)).toBe(false)
  })

  it('removes the active Country from scheduler-practice patterns', () => {
    const practice = derive(undefined, 'practice', 'diagonal', entries[0].id)
    expect(practice.presentation.highlightedCountryId).toBe(entries[0].id)
    expect(practice.presentation.countryPatternsById?.has(entries[0].id)).toBe(false)
    expect(practice.presentation.countryPatternsById?.has(entries[1].id)).toBe(true)
  })

  it('keeps the full Learning pattern when completion has no active target', () => {
    expect(derive('diagonal').presentation.countryPatternsById?.size).toBe(2)
  })
})
