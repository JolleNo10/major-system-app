import type { Country, CountryId } from '@/features/world-countries/data/countries'
import {
  deriveCountryRecallProgress,
  deriveWorldCountriesCountryProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import {
  getCountryProgressColor,
  getCountryProgressState,
  WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION,
  WORLD_COUNTRIES_PROGRESS_LABELS,
  type WorldCountriesProgressPerspective,
} from '@/features/world-countries/learning/progressPresentation'
import {
  getDrillSkillLabel,
  getSkillsForDrillMode,
  type WorldCountriesDrillMode,
} from './drillModes'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { ProgressMapLegendEntry } from '@/features/world-countries/learning/ProgressMapLegend'
import {
  getLearningReadinessBySubregion,
  getWorldCountriesLearningReadinessDescription,
  getWorldCountriesLearningReadinessLabel,
  WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES,
  WORLD_COUNTRIES_LEARNING_READINESS_COLORS,
} from '@/features/world-countries/learning/learningReadiness'
import type { WorldCountriesLearningStates, WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import type { WorldCountriesProgressState } from '@/features/world-countries/learning/progressPresentation'

export const DRILL_LEARNING_READINESS_LEGEND_ENTRIES = WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES

export interface DrillProgressPresentationInput {
  mode: WorldCountriesDrillMode
  scopeCountries: readonly Country[]
  recallProgress: RecallProgress
  learningStates?: WorldCountriesLearningStates
}

export function getDrillProgressPerspective(
  mode: WorldCountriesDrillMode,
): WorldCountriesProgressPerspective {
  const skills = getSkillsForDrillMode(mode)
  return mode === 'countries-capitals' ? 'core' : skills[0]
}

/** Return the current Drill proficiency state for one Country, or null when
 * the relevant perspective has no evidence yet. */
export function getDrillCountryProficiencyState(
  countryId: CountryId,
  mode: WorldCountriesDrillMode,
  recallProgress: RecallProgress,
): WorldCountriesProgressState | null {
  const skills = getSkillsForDrillMode(mode)
  return getDrillCountryProficiencyStateForPerspective(
    countryId,
    getDrillProgressPerspective(mode),
    recallProgress,
    skills,
  )
}

/** Return the current proficiency for the single skill exercised by Practice. */
export function getDrillCountrySkillProficiencyState(
  countryId: CountryId,
  skill: WorldCountriesRecallSkill,
  recallProgress: RecallProgress,
): WorldCountriesProgressState | null {
  return getDrillCountryProficiencyStateForPerspective(countryId, skill, recallProgress, [skill])
}

export function createDrillProgressColors(
  input: DrillProgressPresentationInput,
): Map<CountryId, string> {
  const presentations = getDrillCountryPresentations(input)
  return new Map([...presentations].map(([countryId, presentation]) => {
    if (presentation.kind === 'learning') {
      const readiness = presentation.readiness
      return [countryId, WORLD_COUNTRIES_LEARNING_READINESS_COLORS[readiness]] as const
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
    if (presentation.kind === 'learning') {
      return [
        countryId,
        `Learning Readiness: ${getWorldCountriesLearningReadinessLabel(presentation.readiness)}. ${getWorldCountriesLearningReadinessDescription(presentation.readiness)}`,
      ] as const
    }
    return [countryId, `Drill proficiency: ${WORLD_COUNTRIES_PROGRESS_LABELS[presentation.state]}.`] as const
  }))
}

type DrillCountryPresentation =
  | { kind: 'learning'; readiness: WorldCountriesLearningReadiness }
  | { kind: 'drill'; state: WorldCountriesProgressState }

function getDrillCountryPresentations({
  mode,
  scopeCountries,
  recallProgress,
  learningStates = [],
}: DrillProgressPresentationInput): Map<CountryId, DrillCountryPresentation> {
  const skills = getSkillsForDrillMode(mode)
  const readinessBySubregion = getLearningReadinessBySubregion(learningStates)
  return new Map(scopeCountries.map(country => [
    country.id,
    getDrillCountryPresentation(mode, country, skills, recallProgress, readinessBySubregion),
  ] as const))
}

function getDrillCountryProficiencyStateForPerspective(
  countryId: CountryId,
  perspective: WorldCountriesProgressPerspective,
  recallProgress: RecallProgress,
  skills: readonly WorldCountriesRecallSkill[],
): WorldCountriesProgressState | null {
  const { progress, hasRelevantEvidence } = getDrillCountryEvidence(
    countryId,
    perspective,
    skills,
    recallProgress,
  )
  return hasRelevantEvidence ? getCountryProgressState(progress, perspective) : null
}

function getDrillCountryPresentation(
  mode: WorldCountriesDrillMode,
  country: Country,
  skills: ReturnType<typeof getSkillsForDrillMode>,
  recallProgress: RecallProgress,
  readinessBySubregion: ReadonlyMap<Country['subregionId'], WorldCountriesLearningReadiness>,
): DrillCountryPresentation {
  const perspective = getDrillProgressPerspective(mode)
  const { progress, hasRelevantEvidence } = getDrillCountryEvidence(
    country.id,
    perspective,
    skills,
    recallProgress,
  )
  if (!hasRelevantEvidence) {
    return { kind: 'learning', readiness: readinessBySubregion.get(country.subregionId) ?? 'NOT_LEARNED' }
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
    label: WORLD_COUNTRIES_PROGRESS_LABELS[state as WorldCountriesProgressState],
    color: getCountryProgressColor(state as WorldCountriesProgressState),
  }))
}

export function getDrillProgressExplanation(mode: WorldCountriesDrillMode): string {
  return getDrillProgressPerspective(mode) === 'core'
    ? WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION
    : 'Weak means the latest attempt was incorrect; Strong means repeated success; Mastered requires successful free recall on two different dates.'
}
