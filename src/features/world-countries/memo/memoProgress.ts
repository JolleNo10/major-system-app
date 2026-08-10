import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionIdsForContinent } from '@/features/world-countries/geography/queries'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import {
  deriveWorldCountriesMemoReadiness,
  type WorldCountriesMemoLearningStates,
  type WorldCountriesMemoReadiness,
} from '@/features/world-countries/learning/memoReadiness'

export interface MemoReadinessProgress {
  totalSubregions: number
  countriesMemoedCount: number
  countriesAndCapitalsMemoedCount: number
  countriesMemoedRatio: number
  countriesAndCapitalsMemoedRatio: number
  readinessBySubregion: ReadonlyMap<SubregionId, WorldCountriesMemoReadiness>
  /** Present for the one-Subregion progress row. */
  readiness?: WorldCountriesMemoReadiness
}

export type MemoLearningStates = WorldCountriesMemoLearningStates

function asLearningStateMap(states: MemoLearningStates): ReadonlyMap<SubregionId, SubregionLearningState> {
  return Array.isArray(states)
    ? new Map(states.map(state => [state.subregionId, state] as const))
    : states as ReadonlyMap<SubregionId, SubregionLearningState>
}

function getMemoReadinessProgressForSubregions(
  subregionIds: readonly SubregionId[],
  states: MemoLearningStates,
): MemoReadinessProgress {
  const stateBySubregion = asLearningStateMap(states)
  const readinessBySubregion = new Map(
    subregionIds.map(subregionId => [
      subregionId,
      deriveWorldCountriesMemoReadiness(stateBySubregion.get(subregionId)),
    ] as const),
  )
  const totalSubregions = subregionIds.length
  const countriesMemoedCount = [...readinessBySubregion.values()]
    .filter(readiness => readiness !== 'NOT_MEMOED').length
  const countriesAndCapitalsMemoedCount = [...readinessBySubregion.values()]
    .filter(readiness => readiness === 'COUNTRIES_AND_CAPITALS_MEMOED').length
  return {
    totalSubregions,
    countriesMemoedCount,
    countriesAndCapitalsMemoedCount,
    countriesMemoedRatio: totalSubregions ? countriesMemoedCount / totalSubregions : 0,
    countriesAndCapitalsMemoedRatio: totalSubregions
      ? countriesAndCapitalsMemoedCount / totalSubregions
      : 0,
    readinessBySubregion,
  }
}

/** Aggregate the two cumulative Memo milestones over current Subregions. */
export function getWorldMemoReadinessProgress(
  states: MemoLearningStates,
  entries: readonly Country[] = countries,
): MemoReadinessProgress {
  const subregionIds = [...new Set(entries.map(country => country.subregionId))]
  return getMemoReadinessProgressForSubregions(subregionIds, states)
}

/** Aggregate the two cumulative Memo milestones over a Continent's Subregions. */
export function getContinentMemoReadinessProgress(
  continent: Continent | string,
  states: MemoLearningStates,
  entries: readonly Country[] = countries,
): MemoReadinessProgress {
  return getMemoReadinessProgressForSubregions(getSubregionIdsForContinent(continent, entries), states)
}

/** Expose the exact three-state readiness for one current Subregion. */
export function getSubregionMemoReadinessProgress(
  subregion: SubregionId,
  states: MemoLearningStates,
  entries: readonly Country[] = countries,
): MemoReadinessProgress {
  const currentSubregionIds = new Set(entries.map(country => country.subregionId))
  const subregionIds = currentSubregionIds.has(subregion) ? [subregion] : []
  const progress = getMemoReadinessProgressForSubregions(subregionIds, states)
  return {
    ...progress,
    readiness: progress.readinessBySubregion.get(subregion) ?? 'NOT_MEMOED',
  }
}

export function getNextSubregionToMemo(
  subregions: readonly SubregionDefinition[],
  isSubregionMemoed: (subregionId: SubregionId) => boolean,
): SubregionDefinition | null {
  return subregions.find(subregion => !isSubregionMemoed(subregion.id)) ?? null
}
