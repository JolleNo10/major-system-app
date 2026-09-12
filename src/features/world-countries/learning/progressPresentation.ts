import type { WorldCountriesCountryCoreState, WorldCountriesCountryProgress } from './recallProgress'
import type { WorldCountriesProficiency } from './recallMastery'
import type { WorldCountriesRecallSkill } from './recallTargets'

export type WorldCountriesProgressPerspective = 'core' | WorldCountriesRecallSkill
export type WorldCountriesProgressState = WorldCountriesCountryCoreState | WorldCountriesProficiency
export type WorldCountriesProgressLegendKind = 'core' | 'skill'

export const WORLD_COUNTRIES_PROGRESS_LABELS: Readonly<Record<WorldCountriesProgressState, string>> = {
  unpractised: 'Early recall',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
  mastered: 'Mastered',
  complete: 'Mastered',
}

export const WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION = 'Mastered requires both Location → Country and Country → Capital to be Mastered.'

export const WORLD_COUNTRIES_PROGRESS_COLORS: Readonly<Record<WorldCountriesProgressState, string>> = {
  unpractised: '#b45309',
  weak: '#d97706',
  developing: '#d9ad32',
  strong: '#69a95d',
  mastered: '#16834f',
  complete: '#16834f',
}

const CORE_PROGRESS_LEGEND = 'Early recall · Weak · Developing · Strong · Mastered'
const SKILL_PROGRESS_LEGEND = 'Early recall · Weak · Developing · Strong · Mastered'

/** Return the semantic state a map should render for a Country. */
export function getCountryProgressState(
  progress: WorldCountriesCountryProgress,
  perspective: WorldCountriesProgressPerspective = 'core',
): WorldCountriesProgressState {
  if (perspective === 'core') return progress.coreState
  return progress.skills.get(perspective)?.proficiency ?? 'unpractised'
}

export function getCountryProgressColor(state: WorldCountriesProgressState): string {
  return WORLD_COUNTRIES_PROGRESS_COLORS[state]
}

export function getWorldCountriesProgressLegend(kind: WorldCountriesProgressLegendKind = 'core'): string {
  return kind === 'core' ? CORE_PROGRESS_LEGEND : SKILL_PROGRESS_LEGEND
}
