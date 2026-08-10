import type { Country, CountryId } from '@/features/world-countries/data/countries'
import {
  deriveCountryRecallProgress,
  deriveWorldCountriesCountryProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import {
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
  WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES,
  WORLD_COUNTRIES_MEMO_READINESS_COLORS,
} from '@/features/world-countries/learning/memoReadiness'
import type { WorldCountriesMemoLearningStates } from '@/features/world-countries/learning/memoReadiness'

const DRILL_PROGRESS_COLORS: Readonly<Record<string, string>> = {
  weak: '#dc2626',
  developing: '#d97706',
  strong: '#2563eb',
  mastered: '#16a34a',
  complete: '#16a34a',
}

export const DRILL_MEMO_READINESS_LEGEND_ENTRIES = WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES

export function getDrillProgressPerspective(
  mode: WorldCountriesDrillMode,
): WorldCountriesProgressPerspective {
  const skills = getSkillsForDrillMode(mode)
  return mode === 'countries-capitals' ? 'core' : skills[0]
}

export function createDrillProgressColors(
  mode: WorldCountriesDrillMode,
  scopeCountries: readonly Country[],
  recallProgress: RecallProgress,
  learningStates: WorldCountriesMemoLearningStates = [],
): Map<CountryId, string> {
  const skills = getSkillsForDrillMode(mode)
  const perspective = getDrillProgressPerspective(mode)
  const readinessBySubregion = getMemoReadinessBySubregion(learningStates)
  return new Map(scopeCountries.map(country => {
    const progress = perspective === 'core'
      ? deriveWorldCountriesCountryProgress(country.id, recallProgress)
      : deriveCountryRecallProgress(country.id, skills, recallProgress)
    const hasRelevantEvidence = perspective === 'core'
      ? [...progress.coreSkills.values()].some(skill => skill.attempts > 0)
      : (progress.skills.get(perspective)?.attempts ?? 0) > 0
    if (!hasRelevantEvidence) {
      const readiness = readinessBySubregion.get(country.subregionId) ?? 'NOT_MEMOED'
      return [country.id, WORLD_COUNTRIES_MEMO_READINESS_COLORS[readiness]]
    }
    const state = getCountryProgressState(progress, perspective)
    return [country.id, DRILL_PROGRESS_COLORS[state] ?? WORLD_COUNTRIES_MEMO_READINESS_COLORS.NOT_MEMOED]
  }))
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
  const labels: Readonly<Record<string, string>> = {
    unpractised: 'Unpractised',
    weak: 'Weak',
    developing: 'Developing',
    strong: 'Strong',
    mastered: 'Mastered',
    complete: 'Complete',
  }
  return ['weak', 'developing', 'strong', completedState].map(state => ({
    state,
    label: labels[state],
    color: DRILL_PROGRESS_COLORS[state],
  }))
}

export function getDrillProgressExplanation(mode: WorldCountriesDrillMode): string {
  return getDrillProgressPerspective(mode) === 'core'
    ? 'Complete requires both Location → Country and Country → Capital to be Mastered.'
    : 'Weak means the latest attempt was incorrect; Strong means repeated success; Mastered requires successful free recall on two different dates.'
}
