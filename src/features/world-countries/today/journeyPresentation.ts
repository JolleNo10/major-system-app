import type { Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { isSubregionCapitalsLearned, isSubregionCountriesLearned, type SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { deriveWorldCountriesCountryProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'

export const WORLD_COUNTRIES_JOURNEY_STAGES = [
  { id: 'meet-countries', label: 'Meet the countries' },
  { id: 'practice-countries', label: 'Practice the countries' },
  { id: 'master-countries', label: 'Master the countries' },
  { id: 'add-capitals', label: 'Add the capitals' },
  { id: 'put-it-together', label: 'Put it all together' },
  { id: 'master-region', label: 'Master the region' },
] as const

export type WorldCountriesJourneyStageId = typeof WORLD_COUNTRIES_JOURNEY_STAGES[number]['id']
export type WorldCountriesJourneyStageStatus = 'complete' | 'current' | 'upcoming'

export interface WorldCountriesJourneyStage {
  id: WorldCountriesJourneyStageId
  label: string
  status: WorldCountriesJourneyStageStatus
  detail: string
}

export interface WorldCountriesJourneyPresentation {
  subregionId: SubregionId
  currentStageId: WorldCountriesJourneyStageId
  stages: readonly WorldCountriesJourneyStage[]
  countriesLearned: boolean
  capitalsLearned: boolean
  countryRecallMastered: boolean
  coreRecallComplete: boolean
}

/**
 * Derive the learner-facing journey from existing milestones and recall.
 * Journey stages are presentation only; the whole-Subregion milestones remain
 * the durable Learning authority.
 */
export function deriveWorldCountriesJourneyPresentation({
  subregionId,
  entries,
  learningState,
  recallProgress,
}: {
  subregionId: SubregionId
  entries: readonly Country[]
  learningState?: SubregionLearningState | null
  recallProgress: RecallProgress
}): WorldCountriesJourneyPresentation {
  const countryProgress = entries
    .filter(country => country.subregionId === subregionId)
    .map(country => deriveWorldCountriesCountryProgress(country.id, recallProgress))
  const countriesLearned = isSubregionCountriesLearned(learningState)
  const capitalsLearned = isSubregionCapitalsLearned(learningState)
  const countryRecallMastered = countryProgress.length > 0 && countryProgress.every(progress => (
    progress.skills.get('location-to-country')?.proficiency === 'mastered'
  ))
  const coreRecallComplete = countryProgress.length > 0 && countryProgress.every(progress => progress.complete)
  const hasCountryPractice = countryProgress.some(progress => (progress.skills.get('location-to-country')?.attempts ?? 0) > 0)
  const hasCapitalPractice = countryProgress.some(progress => (progress.skills.get('country-to-capital')?.attempts ?? 0) > 0)

  const currentStageId = !countriesLearned
    ? hasCountryPractice ? 'practice-countries' : 'meet-countries'
    : !capitalsLearned
      ? hasCapitalPractice ? 'put-it-together' : 'add-capitals'
      : coreRecallComplete ? 'master-region' : 'put-it-together'
  const currentIndex = WORLD_COUNTRIES_JOURNEY_STAGES.findIndex(stage => stage.id === currentStageId)
  const stages: WorldCountriesJourneyStage[] = WORLD_COUNTRIES_JOURNEY_STAGES.map((stage, index) => ({
    ...stage,
    status: (index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming') as WorldCountriesJourneyStageStatus,
    detail: detailFor(stage.id, {
      countriesLearned,
      capitalsLearned,
      countryRecallMastered,
      coreRecallComplete,
      currentStageId,
    }),
  }))

  return {
    subregionId,
    currentStageId,
    stages,
    countriesLearned,
    capitalsLearned,
    countryRecallMastered,
    coreRecallComplete,
  }
}

function detailFor(
  stage: WorldCountriesJourneyStageId,
  state: Pick<WorldCountriesJourneyPresentation, 'countriesLearned' | 'capitalsLearned' | 'countryRecallMastered' | 'coreRecallComplete' | 'currentStageId'>,
): string {
  switch (stage) {
    case 'meet-countries':
      return 'Guided introduction'
    case 'practice-countries':
      return 'Recall and map practice'
    case 'master-countries':
      return state.countryRecallMastered ? 'Country recall is strong' : 'Guided Country milestone recorded; recall can keep strengthening'
    case 'add-capitals':
      return state.countriesLearned ? 'Add Country-to-Capital associations' : 'Available when Country learning is ready'
    case 'put-it-together':
      return state.capitalsLearned || state.currentStageId === 'put-it-together' ? 'Mixed recall across the learning unit' : 'Mixed recall follows Capital learning'
    case 'master-region':
      return state.coreRecallComplete ? 'Core Country and Capital recall complete' : 'Derived finish line'
  }
}
