import type { SubregionId } from '@/features/world-countries/data/subregions'

export interface SubregionLearningState {
  subregionId: SubregionId
  countriesLearnedAt?: number
}
export function isSubregionCountriesLearned(
  state: SubregionLearningState | null | undefined,
): boolean {
  return typeof state?.countriesLearnedAt === 'number' && Number.isFinite(state.countriesLearnedAt)
}
