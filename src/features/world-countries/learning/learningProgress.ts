import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionIdsForContinent } from '@/features/world-countries/geography/queries'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import {
  deriveWorldCountriesLearningReadiness,
  getWorldCountriesLearningStateList,
  type WorldCountriesLearningStates,
  type WorldCountriesLearningReadiness,
} from '@/features/world-countries/learning/learningReadiness'

export interface LearningMilestone {
  count: number
  total: number
  ratio: number
}

export interface LearningReadinessProgress {
  countriesLearned: LearningMilestone
  countriesAndCapitalsLearned: LearningMilestone
  readinessBySubregion: ReadonlyMap<SubregionId, WorldCountriesLearningReadiness>
}

export interface SubregionLearningReadinessProgress extends LearningReadinessProgress {
  readiness: WorldCountriesLearningReadiness
}

export type LearningStates = WorldCountriesLearningStates

function asLearningStateMap(states: LearningStates): ReadonlyMap<SubregionId, SubregionLearningState> {
  return new Map(getWorldCountriesLearningStateList(states).map(state => [state.subregionId, state] as const))
}

function getLearningReadinessProgressForSubregions(
  subregionIds: readonly SubregionId[],
  states: LearningStates,
): LearningReadinessProgress {
  const stateBySubregion = asLearningStateMap(states)
  const readinessBySubregion = new Map(
    subregionIds.map(subregionId => [
      subregionId,
      deriveWorldCountriesLearningReadiness(stateBySubregion.get(subregionId)),
    ] as const),
  )
  const totalSubregions = subregionIds.length
  const countriesLearnedCount = [...readinessBySubregion.values()]
    .filter(readiness => readiness !== 'NOT_LEARNED').length
  const countriesAndCapitalsLearnedCount = [...readinessBySubregion.values()]
    .filter(readiness => readiness === 'COUNTRIES_AND_CAPITALS_LEARNED').length
  return {
    countriesLearned: {
      count: countriesLearnedCount,
      total: totalSubregions,
      ratio: totalSubregions ? countriesLearnedCount / totalSubregions : 0,
    },
    countriesAndCapitalsLearned: {
      count: countriesAndCapitalsLearnedCount,
      total: totalSubregions,
      ratio: totalSubregions ? countriesAndCapitalsLearnedCount / totalSubregions : 0,
    },
    readinessBySubregion,
  }
}

/** Aggregate the two cumulative Learning Readiness milestones over a Continent's Subregions. */
export function getContinentLearningReadinessProgress(
  continent: Continent | string,
  states: LearningStates,
  entries: readonly Country[] = countries,
): LearningReadinessProgress {
  return getLearningReadinessProgressForSubregions(getSubregionIdsForContinent(continent, entries), states)
}

/** Expose the exact three-state readiness for one current Subregion. */
export function getSubregionLearningReadinessProgress(
  subregion: SubregionId,
  states: LearningStates,
  entries: readonly Country[] = countries,
): SubregionLearningReadinessProgress {
  const currentSubregionIds = new Set(entries.map(country => country.subregionId))
  const subregionIds = currentSubregionIds.has(subregion) ? [subregion] : []
  const progress = getLearningReadinessProgressForSubregions(subregionIds, states)
  return {
    ...progress,
    readiness: progress.readinessBySubregion.get(subregion) ?? 'NOT_LEARNED',
  }
}
