import type { WorldCountriesCountryCoreState, WorldCountriesCountryProgress } from './recallProgress'
import type { WorldCountriesProficiency } from './recallMastery'
import type { WorldCountriesRecallSkill } from './recallTargets'

export type WorldCountriesProgressPerspective = 'core' | WorldCountriesRecallSkill
export type WorldCountriesProgressState = WorldCountriesCountryCoreState | WorldCountriesProficiency
export type WorldCountriesProgressLegendKind = 'core' | 'skill'

export const WORLD_COUNTRIES_PROGRESS_LABELS: Readonly<Record<WorldCountriesProgressState, string>> = {
  unpractised: 'Unpractised',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
  mastered: 'Mastered',
  complete: 'Complete',
}

export const WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION = 'Complete requires both Location → Country and Country → Capital to be Mastered.'

export const WORLD_COUNTRIES_PROGRESS_COLORS: Readonly<Record<WorldCountriesProgressState, string>> = {
  unpractised: '#52525b',
  weak: '#8a665b',
  developing: '#a79566',
  strong: '#45a66b',
  mastered: '#16834f',
  complete: '#16834f',
}

const CORE_PROGRESS_LEGEND = 'Unpractised · Weak · Developing · Strong · Complete'
const SKILL_PROGRESS_LEGEND = 'Unpractised · Weak · Developing · Strong · Mastered'

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
