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
  complete: boolean
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
  const complete = countriesLearned && capitalsLearned && coreRecallComplete

  const currentStageId = complete
    ? 'master-region'
    : !countriesLearned
      ? hasCountryPractice ? 'practice-countries' : 'meet-countries'
      : !countryRecallMastered
        ? 'master-countries'
        : !capitalsLearned
          ? 'add-capitals'
          : 'put-it-together'
  const stages: WorldCountriesJourneyStage[] = WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({
    ...stage,
    status: statusFor(stage.id, {
      complete,
      currentStageId,
      hasCountryPractice,
      countriesLearned,
      countryRecallMastered,
      capitalsLearned,
    }),
    detail: detailFor(stage.id, {
      complete,
      hasCountryPractice,
      hasCapitalPractice,
      countriesLearned,
      capitalsLearned,
      countryRecallMastered,
      coreRecallComplete,
    }),
  }))

  return {
    subregionId,
    currentStageId,
    complete,
    stages,
    countriesLearned,
    capitalsLearned,
    countryRecallMastered,
    coreRecallComplete,
  }
}

function statusFor(
  stage: WorldCountriesJourneyStageId,
  state: {
    complete: boolean
    currentStageId: WorldCountriesJourneyStageId
    hasCountryPractice: boolean
    countriesLearned: boolean
    countryRecallMastered: boolean
    capitalsLearned: boolean
  },
): WorldCountriesJourneyStageStatus {
  if (state.complete) return 'complete'
  if (stage === state.currentStageId) return 'current'

  const stageComplete = stage === 'meet-countries'
    ? state.hasCountryPractice || state.countriesLearned || state.countryRecallMastered
    : stage === 'practice-countries'
      ? state.countriesLearned || state.countryRecallMastered
      : stage === 'master-countries'
        ? state.countryRecallMastered
        : stage === 'add-capitals'
          ? state.capitalsLearned
          : false

  return stageComplete ? 'complete' : 'upcoming'
}

function detailFor(
  stage: WorldCountriesJourneyStageId,
  state: Pick<WorldCountriesJourneyPresentation, 'countriesLearned' | 'capitalsLearned' | 'countryRecallMastered' | 'coreRecallComplete' | 'complete'> & {
    hasCountryPractice: boolean
    hasCapitalPractice: boolean
  },
): string {
  switch (stage) {
    case 'meet-countries':
      return state.countriesLearned
        ? 'Guided Country milestone recorded'
        : state.hasCountryPractice
          ? 'Country recall practice started'
          : 'Guided introduction'
    case 'practice-countries':
      return state.countriesLearned
        ? 'Country Learning milestone completed'
        : state.countryRecallMastered
          ? 'Recall is strong; finish guided Country Learning'
          : 'Recall and map practice'
    case 'master-countries':
      return state.countryRecallMastered
        ? 'Country recall is strong'
        : state.countriesLearned
          ? 'Country Learning is complete; recall can keep strengthening'
          : 'Country recall mastery follows guided Learning'
    case 'add-capitals':
      return state.capitalsLearned
        ? 'Capital Learning milestone recorded'
        : state.hasCapitalPractice
          ? 'Capital recall attempted; guided Capital Learning is not complete'
          : state.countriesLearned
            ? 'Add Country-to-Capital associations'
            : 'Available when Country Learning is ready'
    case 'put-it-together':
      return state.complete
        ? 'Combined core recall complete'
        : state.capitalsLearned
          ? 'Combined recall is still developing'
          : 'Mixed recall follows Capital Learning'
    case 'master-region':
      return state.complete && state.coreRecallComplete
        ? 'Core Country and Capital recall complete'
        : 'Derived finish line after combined recall'
  }
}
