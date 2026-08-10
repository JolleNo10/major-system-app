import type { SubregionId } from '@/features/world-countries/data/subregions'

export interface SubregionLearningState {
  subregionId: SubregionId
  countriesLearnedAt?: number
  capitalsLearnedAt?: number
}

export type SubregionLearningField = 'countriesLearnedAt' | 'capitalsLearnedAt'

export function isSubregionFieldLearned(
  state: SubregionLearningState | null | undefined,
  field: SubregionLearningField,
): boolean {
  const learnedAt = state?.[field]
  return typeof learnedAt === 'number' && Number.isFinite(learnedAt)
}

export function isSubregionCountriesLearned(
  state: SubregionLearningState | null | undefined,
): boolean {
  return isSubregionFieldLearned(state, 'countriesLearnedAt')
}

export function isSubregionCapitalsLearned(
  state: SubregionLearningState | null | undefined,
): boolean {
  return isSubregionFieldLearned(state, 'capitalsLearnedAt')
}
