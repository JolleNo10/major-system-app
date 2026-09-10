import type { Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { isWorldCountriesCapitalLayerEstablished, isWorldCountriesCapitalRecallMastered, isWorldCountriesCountryLayerEstablished, isWorldCountriesCountryRecallMastered } from '@/features/world-countries/learning/learningReadiness'
import { isSubregionCapitalsLearned, isSubregionCountriesLearned, type SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { deriveWorldCountriesCountryProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'

export const WORLD_COUNTRIES_JOURNEY_STAGES = [
  { id: 'meet-countries', label: 'Meet the countries' },
  { id: 'practice-countries', label: 'Practice the countries' },
  { id: 'countries-established', label: 'Countries established' },
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
  countriesEstablished: boolean
  capitalsLearned: boolean
  capitalsEstablished: boolean
  countryRecallMastered: boolean
  capitalRecallMastered: boolean
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
  const countryRecallMastered = isWorldCountriesCountryRecallMastered(entries, subregionId, recallProgress)
  const capitalRecallMastered = isWorldCountriesCapitalRecallMastered(entries, subregionId, recallProgress)
  const countriesEstablished = isWorldCountriesCountryLayerEstablished(entries, subregionId, learningState, recallProgress)
  const capitalsEstablished = isWorldCountriesCapitalLayerEstablished(entries, subregionId, learningState, recallProgress)
  const coreRecallComplete = countryProgress.length > 0 && countryProgress.every(progress => progress.complete)
  const hasCountryPractice = countryProgress.some(progress => (progress.skills.get('location-to-country')?.attempts ?? 0) > 0)
  const hasCapitalPractice = countryProgress.some(progress => (progress.skills.get('country-to-capital')?.attempts ?? 0) > 0)
  const complete = coreRecallComplete

  const currentStageId = complete
    ? 'master-region'
    : !countriesEstablished
      ? hasCountryPractice ? 'practice-countries' : 'meet-countries'
      : !capitalsEstablished
        ? 'add-capitals'
        : 'put-it-together'
  const stages: WorldCountriesJourneyStage[] = WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({
    ...stage,
    status: statusFor(stage.id, {
      complete,
      currentStageId,
      hasCountryPractice,
      countriesEstablished,
      capitalsEstablished,
    }),
    detail: detailFor(stage.id, {
      complete,
      hasCountryPractice,
      hasCapitalPractice,
      countriesLearned,
      countriesEstablished,
      capitalsLearned,
      capitalsEstablished,
      countryRecallMastered,
      capitalRecallMastered,
      coreRecallComplete,
    }),
  }))

  return {
    subregionId,
    currentStageId,
    complete,
    stages,
    countriesLearned,
    countriesEstablished,
    capitalsLearned,
    capitalsEstablished,
    countryRecallMastered,
    capitalRecallMastered,
    coreRecallComplete,
  }
}

function statusFor(
  stage: WorldCountriesJourneyStageId,
  state: {
    complete: boolean
    currentStageId: WorldCountriesJourneyStageId
    hasCountryPractice: boolean
    countriesEstablished: boolean
    capitalsEstablished: boolean
  },
): WorldCountriesJourneyStageStatus {
  if (state.complete) return 'complete'
  if (stage === state.currentStageId) return 'current'

  const stageComplete = stage === 'meet-countries'
      ? state.hasCountryPractice || state.countriesEstablished
      : stage === 'practice-countries'
        ? state.countriesEstablished
      : stage === 'countries-established'
        ? state.countriesEstablished
        : stage === 'add-capitals'
          ? state.capitalsEstablished
          : false

  return stageComplete ? 'complete' : 'upcoming'
}

function detailFor(
  stage: WorldCountriesJourneyStageId,
  state: Pick<WorldCountriesJourneyPresentation, 'countriesLearned' | 'countriesEstablished' | 'capitalsLearned' | 'capitalsEstablished' | 'countryRecallMastered' | 'capitalRecallMastered' | 'coreRecallComplete' | 'complete'> & {
    hasCountryPractice: boolean
    hasCapitalPractice: boolean
  },
): string {
  if (state.complete) {
    return stage === 'master-region'
      ? "You've completed the full Country and Capital recall."
      : 'This part of the journey is complete.'
  }
  switch (stage) {
    case 'meet-countries':
      return state.countriesLearned
        ? "You've met the countries and their locations."
        : state.countriesEstablished
          ? 'Country recall is ready for the next step.'
        : state.hasCountryPractice
          ? "You've started recalling the countries."
          : 'Get familiar with their names and locations.'
    case 'practice-countries':
      return state.countriesLearned
        ? 'The countries are learned; recall their names from the map.'
        : state.countriesEstablished
          ? 'Country recall is strong enough to move on.'
          : state.hasCountryPractice
            ? 'Keep recalling their names from the map.'
            : 'Recall their names from the map.'
    case 'countries-established':
      return state.countriesLearned
        ? state.countryRecallMastered
          ? 'The countries are learned and recall is strong.'
          : 'The countries are learned; recall can keep strengthening.'
        : state.countriesEstablished
          ? 'Country recall is strong enough for the next step.'
        : 'Learn the countries before adding capitals.'
    case 'add-capitals':
      return state.capitalsLearned
        ? 'The capitals are learned; recall can keep strengthening.'
        : state.capitalRecallMastered
          ? 'Capital recall is strong enough for the next step.'
        : state.hasCapitalPractice
          ? "You've started recalling the capitals."
          : state.countriesEstablished
            ? 'Learn the capital for each country.'
            : 'Learn the countries before adding capitals.'
    case 'put-it-together':
      return state.capitalsEstablished
        ? 'Practice countries and capitals together.'
        : 'This comes next after the capitals are learned.'
    case 'master-region':
      return 'Complete the full Country and Capital recall.'
  }
}
