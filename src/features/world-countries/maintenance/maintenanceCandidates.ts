import type { Country } from '@/features/world-countries/data/countries'
import {
  deriveWorldCountriesCountryProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'

/** Select only active Countries whose retained evidence is not complete. */
export function selectWorldCountriesMaintenanceCandidates(
  activeCountries: readonly Country[],
  progress: RecallProgress,
): readonly Country[] {
  return activeCountries.filter(country => {
    const countryProgress = deriveWorldCountriesCountryProgress(country.id, progress)
    return countryProgress.attempts > 0 && !countryProgress.complete
  })
}
