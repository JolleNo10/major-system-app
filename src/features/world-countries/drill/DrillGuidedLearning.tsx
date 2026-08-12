import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'

export function DrillGuidedLearning({
  continent,
  subregion,
  entries,
  activeCountries,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onExit,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  activeCountries: readonly Country[]
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onExit: () => void
}) {
  return (
    <CountryLearningFlow
      continent={continent}
      subregion={subregion}
      entries={entries}
      activeCountries={activeCountries}
      entryPoint="beginning"
      locationCleanTargetMinimum={locationCleanTargetMinimum}
      fuzzyMatching={fuzzyMatching}
      onPhaseChange={() => undefined}
      onExit={onExit}
    />
  )
}
