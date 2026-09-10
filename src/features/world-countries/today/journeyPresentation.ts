import type { Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { isWorldCountriesCapitalLayerEstablished, isWorldCountriesCapitalRecallMastered, isWorldCountriesCountryLayerEstablished, isWorldCountriesCountryRecallMastered } from '@/features/world-countries/learning/learningReadiness'
import { isSubregionCapitalsLearned, isSubregionCountriesLearned, type SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { deriveWorldCountriesCountryProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'

export const WORLD_COUNTRIES_JOURNEY_STAGES = [
  { id: 'countries', label: 'Countries' },
  { id: 'capitals', label: 'Capitals' },
  { id: 'region-learned', label: 'Region learned' },
] as const

export type WorldCountriesJourneyStageId = typeof WORLD_COUNTRIES_JOURNEY_STAGES[number]['id']
export type WorldCountriesJourneyStageStatus = 'complete' | 'current' | 'upcoming'
export type WorldCountriesJourneyMasteryStatus = 'building' | 'mastered'

export interface WorldCountriesJourneyStage {
  id: WorldCountriesJourneyStageId
  label: string
  status: WorldCountriesJourneyStageStatus
  detail: string
}

export interface WorldCountriesJourneyPresentation {
  subregionId: SubregionId
  currentStageId: WorldCountriesJourneyStageId | null
  stages: readonly WorldCountriesJourneyStage[]
  regionLearned: boolean
  masteryStatus: WorldCountriesJourneyMasteryStatus
  hasCountryPractice: boolean
  hasCapitalPractice: boolean
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
  const regionLearned = countriesEstablished && capitalsEstablished
  const masteryStatus: WorldCountriesJourneyMasteryStatus = coreRecallComplete ? 'mastered' : 'building'

  const currentStageId = !countriesEstablished
    ? 'countries'
    : !capitalsEstablished
      ? 'capitals'
      : null
  const stages: WorldCountriesJourneyStage[] = WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({
    ...stage,
    status: statusFor(stage.id, {
      currentStageId,
      countriesEstablished,
      capitalsEstablished,
      regionLearned,
    }),
    detail: detailFor(stage.id, {
      hasCountryPractice,
      hasCapitalPractice,
      countriesLearned,
      countriesEstablished,
      capitalsLearned,
      capitalsEstablished,
      countryRecallMastered,
      capitalRecallMastered,
      coreRecallComplete,
      regionLearned,
      masteryStatus,
    }),
  }))

  return {
    subregionId,
    currentStageId,
    stages,
    regionLearned,
    masteryStatus,
    hasCountryPractice,
    hasCapitalPractice,
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
    countriesEstablished: boolean
    capitalsEstablished: boolean
    regionLearned: boolean
    currentStageId: WorldCountriesJourneyStageId | null
  },
): WorldCountriesJourneyStageStatus {
  if (stage === 'countries') return state.countriesEstablished ? 'complete' : state.currentStageId === stage ? 'current' : 'upcoming'
  if (stage === 'capitals') return state.capitalsEstablished ? 'complete' : state.currentStageId === stage ? 'current' : 'upcoming'
  return state.regionLearned ? 'complete' : 'upcoming'
}

function detailFor(
  stage: WorldCountriesJourneyStageId,
  state: Pick<WorldCountriesJourneyPresentation, 'countriesLearned' | 'countriesEstablished' | 'capitalsLearned' | 'capitalsEstablished' | 'countryRecallMastered' | 'capitalRecallMastered' | 'coreRecallComplete' | 'regionLearned' | 'masteryStatus'> & {
    hasCountryPractice: boolean
    hasCapitalPractice: boolean
  },
): string {
  switch (stage) {
    case 'countries':
      return state.countriesLearned
        ? "You've met the countries and their locations."
        : state.countriesEstablished
          ? 'Country recall is ready for the next step.'
        : state.hasCountryPractice
          ? "You've started recalling the countries."
          : 'Get familiar with their names and locations.'
    case 'capitals':
      return state.capitalsLearned
        ? 'The capitals are learned; recall can keep strengthening.'
        : state.capitalRecallMastered
          ? 'Capital recall is strong enough for the next step.'
        : state.hasCapitalPractice
          ? "You've started recalling the capitals."
          : state.countriesEstablished
            ? 'Learn the capital for each country.'
            : 'Learn the countries before adding capitals.'
    case 'region-learned':
      return state.regionLearned
        ? state.masteryStatus === 'mastered'
          ? 'Countries and capitals are learned; core recall is mastered.'
          : 'Countries and capitals are learned; mastery builds through Review.'
        : 'This follows after the capitals are learned.'
  }
}
