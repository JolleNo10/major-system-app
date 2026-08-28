import type { Country } from '@/features/world-countries/data/countries'
import type { LearningMapOverride } from './LearningMapSurface'

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
  const presentation: LearningMapOverride = {
    showNames: phase === 'complete',
    showOrderNumbers: phase === 'walkthrough' || phase === 'complete',
    namedCountryId: phase === 'walkthrough' ? walkthroughCountryId : null,
    highlightedCountryId: phase === 'walkthrough' ? walkthroughCountryId : phase === 'final-recall' ? currentRecallId : currentPracticeId,
    hoveredCountryId,
    showHighlightedNames: phase === 'walkthrough',
    showHoverNames: phase === 'final-recall',
    ...orderPresentation,
    mapClassName: PRACTICE_MAP_PHASES.has(phase) ? '[&>svg]:max-h-[510px]' : undefined,
    ariaLabel: phase === 'final-recall' ? 'Highlighted Country for final recall' : 'World Countries Learning map',
  }
  return {
    mapEntries,
    presentation,
    presentationKey: `${phase}:${[...mapEntries].map(entry => entry.id).sort().join(',')}`,
  }
}
