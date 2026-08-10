import type { WorldCountriesCountryProgress } from './recallProgress'
import type { WorldCountriesRecallSkill } from './recallTargets'

export type WorldCountriesProgressPerspective = 'core' | WorldCountriesRecallSkill

/** Return the semantic state a map should render for a Country. */
export function getCountryProgressState(
  progress: WorldCountriesCountryProgress,
  perspective: WorldCountriesProgressPerspective = 'core',
): string {
  if (perspective === 'core') return progress.coreState
  return progress.skills.get(perspective)?.proficiency ?? 'unpractised'
}
