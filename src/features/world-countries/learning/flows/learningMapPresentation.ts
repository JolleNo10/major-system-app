import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { LearningMapOverride } from './LearningMapSurface'
import { createWorldCountriesLearningPattern, type WorldCountriesLearningPatternKind } from '@/features/world-countries/learning/learningReadiness'

const FULL_SCOPE_PHASES = new Set(['final-gate', 'final-recall', 'complete'])
const PRACTICE_MAP_PHASES = new Set(['practice', 'combined-practice'])

interface OrderedCountryRecall {
  order: readonly string[]
  currentIndex: number
}

interface PracticeCountrySelection {
  currentKey: string | null
}

export function deriveLearningMapPresentation({
  phase,
  fullEntries,
  stageEntries,
  fallbackEntries,
  walkthroughIndex,
  ordered,
  practice,
  hoveredCountryId,
  orderPresentation,
  completionPatternKind,
  activeLearningPatternKind,
  countryColorsById,
}: {
  phase: string
  fullEntries: readonly Country[]
  stageEntries: readonly Country[]
  fallbackEntries: readonly Country[]
  walkthroughIndex: number
  ordered: OrderedCountryRecall | null
  practice: PracticeCountrySelection | null
  hoveredCountryId: string | null
  orderPresentation: LearningMapOverride
  completionPatternKind?: WorldCountriesLearningPatternKind
  activeLearningPatternKind?: WorldCountriesLearningPatternKind
  countryColorsById?: LearningMapOverride['countryColorsById']
}): {
  mapEntries: readonly Country[]
  presentation: LearningMapOverride
  presentationKey: string
} {
  const mapEntries = FULL_SCOPE_PHASES.has(phase)
    ? fullEntries
    : stageEntries.length ? stageEntries : fallbackEntries
  const walkthroughCountryId = stageEntries[walkthroughIndex]?.id ?? null
  const currentRecallId = ordered?.order[ordered.currentIndex] ?? null
  const currentPracticeId = practice?.currentKey ?? null
  const showOrderNumbers = phase === 'walkthrough' || phase === 'complete'
  const patternKind = phase === 'complete' ? completionPatternKind : activeLearningPatternKind
  const presentation: LearningMapOverride = {
    showNames: phase === 'complete',
    showOrderNumbers,
    namedCountryId: phase === 'walkthrough' ? walkthroughCountryId : null,
    highlightedCountryId: phase === 'walkthrough' ? walkthroughCountryId : phase === 'final-recall' ? currentRecallId : currentPracticeId,
    hoveredCountryId,
    showHighlightedNames: phase === 'walkthrough',
    showHoverNames: phase === 'final-recall',
    ...orderPresentation,
    countryColorsById,
    countryLabelsById: orderPresentation.countryLabelsById ?? (showOrderNumbers ? createLearningOrderLabels(fullEntries) : undefined),
    mapClassName: PRACTICE_MAP_PHASES.has(phase) ? '[&>svg]:max-h-[510px]' : undefined,
    ariaLabel: phase === 'final-recall' ? 'Highlighted Country for final recall' : 'World Countries Learning map',
    ...(patternKind
      ? { countryPatternsById: new Map(fullEntries.map(entry => [entry.id, createWorldCountriesLearningPattern(patternKind)])) }
      : {}),
  }
  return {
    mapEntries,
    presentation,
    presentationKey: `${phase}:${patternKind ?? 'solid'}:${[...mapEntries].map(entry => entry.id).sort().join(',')}${showOrderNumbers ? `:${fullEntries.map(entry => entry.id).join(',')}` : ''}`,
  }
}

/** Keep map labels aligned with the caller-owned full Learning Order. */
export function createLearningOrderLabels(entries: readonly Country[]): ReadonlyMap<CountryId, string> {
  return new Map(entries.map((entry, index) => [entry.id, `${index + 1}. ${entry.country}`]))
}
