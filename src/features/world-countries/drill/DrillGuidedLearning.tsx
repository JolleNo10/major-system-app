import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import type { GuidedLearningActionId } from './guidedLearning'

type DrillGuidedAction = Exclude<GuidedLearningActionId, 'drill-countries-capitals'>

export function DrillGuidedLearning({
  action,
  continent,
  subregion,
  entries,
  activeCountries,
  countriesLearned,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onExit,
}: {
  action: DrillGuidedAction
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  activeCountries: readonly Country[]
  countriesLearned: boolean
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onExit: () => void
}) {
  if (action === 'learn-capitals' || action === 'review-capitals') {
    return (
      <CapitalLearningFlow
        continent={continent}
        subregion={subregion}
        entries={entries}
        activeCountries={activeCountries}
        countriesLearned={countriesLearned}
        fuzzyMatching={fuzzyMatching}
        onPhaseChange={() => undefined}
        onExit={onExit}
        startInRecall={false}
      />
    )
  }

  return (
    <CountryLearningFlow
      continent={continent}
      subregion={subregion}
      entries={entries}
      activeCountries={activeCountries}
      entryPoint={action === 'review-countries' ? 'ordered-recall' : 'beginning'}
      locationCleanTargetMinimum={locationCleanTargetMinimum}
      fuzzyMatching={fuzzyMatching}
      onPhaseChange={() => undefined}
      onExit={onExit}
    />
  )
}
