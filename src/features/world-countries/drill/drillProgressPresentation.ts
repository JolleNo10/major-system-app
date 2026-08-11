import type { Country, CountryId } from '@/features/world-countries/data/countries'
import {
  deriveCountryRecallProgress,
  deriveWorldCountriesCountryProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import {
  getCountryProgressColor,
  getCountryProgressState,
  type WorldCountriesProgressPerspective,
} from '@/features/world-countries/learning/progressPresentation'
import {
  getDrillSkillLabel,
  getSkillsForDrillMode,
  type WorldCountriesDrillMode,
} from './drillModes'
import type { ProgressMapLegendEntry } from '@/features/world-countries/learning/ProgressMapLegend'
import {
  getMemoReadinessBySubregion,
  getWorldCountriesMemoReadinessDescription,
  getWorldCountriesMemoReadinessLabel,
  WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES,
  WORLD_COUNTRIES_MEMO_READINESS_COLORS,
} from '@/features/world-countries/learning/memoReadiness'
import type { WorldCountriesMemoLearningStates, WorldCountriesMemoReadiness } from '@/features/world-countries/learning/memoReadiness'
import type { WorldCountriesProgressState } from '@/features/world-countries/learning/progressPresentation'

const DRILL_PROGRESS_LABELS: Readonly<Record<WorldCountriesProgressState, string>> = {
  unpractised: 'Unpractised',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
  mastered: 'Mastered',
  complete: 'Complete',
}

export const DRILL_MEMO_READINESS_LEGEND_ENTRIES = WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES

export interface DrillProgressPresentationInput {
  mode: WorldCountriesDrillMode
  scopeCountries: readonly Country[]
  recallProgress: RecallProgress
  learningStates?: WorldCountriesMemoLearningStates
}

export function getDrillProgressPerspective(
  mode: WorldCountriesDrillMode,
): WorldCountriesProgressPerspective {
  const skills = getSkillsForDrillMode(mode)
  return mode === 'countries-capitals' ? 'core' : skills[0]
}

export function createDrillProgressColors(
  input: DrillProgressPresentationInput,
): Map<CountryId, string> {
  const presentations = getDrillCountryPresentations(input)
  return new Map([...presentations].map(([countryId, presentation]) => {
    if (presentation.kind === 'memo') {
      const readiness = presentation.readiness
      return [countryId, WORLD_COUNTRIES_MEMO_READINESS_COLORS[readiness]] as const
    }
    const state = presentation.state
    return [countryId, getCountryProgressColor(state)] as const
  }))
}

export function createDrillProgressDescriptions(
  input: DrillProgressPresentationInput,
): Map<CountryId, string> {
  const presentations = getDrillCountryPresentations(input)
  return new Map([...presentations].map(([countryId, presentation]) => {
    if (presentation.kind === 'memo') {
      return [
        countryId,
        `Memo readiness: ${getWorldCountriesMemoReadinessLabel(presentation.readiness)}. ${getWorldCountriesMemoReadinessDescription(presentation.readiness)}`,
      ] as const
    }
    return [countryId, `Drill proficiency: ${DRILL_PROGRESS_LABELS[presentation.state]}.`] as const
  }))
}

type DrillCountryPresentation =
  | { kind: 'memo'; readiness: WorldCountriesMemoReadiness }
  | { kind: 'drill'; state: WorldCountriesProgressState }

function getDrillCountryPresentations({
  mode,
  scopeCountries,
  recallProgress,
  learningStates = [],
}: DrillProgressPresentationInput): Map<CountryId, DrillCountryPresentation> {
  const skills = getSkillsForDrillMode(mode)
  const readinessBySubregion = getMemoReadinessBySubregion(learningStates)
  return new Map(scopeCountries.map(country => [
    country.id,
    getDrillCountryPresentation(mode, country, skills, recallProgress, readinessBySubregion),
  ] as const))
}

function getDrillCountryPresentation(
  mode: WorldCountriesDrillMode,
  country: Country,
  skills: ReturnType<typeof getSkillsForDrillMode>,
  recallProgress: RecallProgress,
  readinessBySubregion: ReadonlyMap<Country['subregionId'], WorldCountriesMemoReadiness>,
): DrillCountryPresentation {
  const perspective = getDrillProgressPerspective(mode)
  const { progress, hasRelevantEvidence } = getDrillCountryEvidence(
    country.id,
    perspective,
    skills,
    recallProgress,
  )
  if (!hasRelevantEvidence) {
    return { kind: 'memo', readiness: readinessBySubregion.get(country.subregionId) ?? 'NOT_MEMOED' }
  }
  return { kind: 'drill', state: getCountryProgressState(progress, perspective) }
}

function getDrillCountryEvidence(
  countryId: CountryId,
  perspective: WorldCountriesProgressPerspective,
  skills: ReturnType<typeof getSkillsForDrillMode>,
  recallProgress: RecallProgress,
): { progress: ReturnType<typeof deriveWorldCountriesCountryProgress>; hasRelevantEvidence: boolean } {
  if (perspective === 'core') {
    const progress = deriveWorldCountriesCountryProgress(countryId, recallProgress)
    return {
      progress,
      hasRelevantEvidence: [...progress.coreSkills.values()].every(skill => skill.attempts > 0),
    }
  }
  const progress = deriveCountryRecallProgress(countryId, skills, recallProgress)
  return {
    progress,
    hasRelevantEvidence: (progress.skills.get(perspective)?.attempts ?? 0) > 0,
  }
}

export function getDrillProgressLegendTitle(mode: WorldCountriesDrillMode): string {
  const perspective = getDrillProgressPerspective(mode)
  return perspective === 'core'
    ? 'Core Country progress'
    : `${getDrillSkillLabel(perspective)} progress`
}

export function getDrillProgressLegendEntries(
  mode: WorldCountriesDrillMode,
): readonly ProgressMapLegendEntry[] {
  const completedState = getDrillProgressPerspective(mode) === 'core' ? 'complete' : 'mastered'
  return ['weak', 'developing', 'strong', completedState].map(state => ({
    state,
    label: DRILL_PROGRESS_LABELS[state as WorldCountriesProgressState],
    color: getCountryProgressColor(state as WorldCountriesProgressState),
  }))
}

export function getDrillProgressExplanation(mode: WorldCountriesDrillMode): string {
  return getDrillProgressPerspective(mode) === 'core'
    ? 'Complete requires both Location → Country and Country → Capital to be Mastered.'
    : 'Weak means the latest attempt was incorrect; Strong means repeated success; Mastered requires successful free recall on two different dates.'
}
