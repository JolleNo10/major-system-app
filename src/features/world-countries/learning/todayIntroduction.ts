import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionLearningState } from './subregionLearningState'
import {
  recallTargetIdFor,
  WORLD_COUNTRIES_CORE_RECALL_SKILLS,
  type WorldCountriesCoreRecallSkill,
  type WorldCountriesRecallTarget,
} from './recallTargets'
import type { WorldCountriesRecallHistoryAttempt } from './recallHistory'

export type WorldCountriesIntroductionSource = 'attempt' | 'milestone' | 'none'

export interface WorldCountriesTargetIntroduction {
  target: WorldCountriesRecallTarget
  introduced: boolean
  source: WorldCountriesIntroductionSource
  milestoneAt: number | null
}

function milestoneFieldForSkill(skill: WorldCountriesCoreRecallSkill): keyof SubregionLearningState {
  return skill === 'location-to-country' ? 'countriesLearnedAt' : 'capitalsLearnedAt'
}

function validMilestoneAt(
  state: SubregionLearningState | undefined,
  skill: WorldCountriesCoreRecallSkill,
): number | null {
  const value = state?.[milestoneFieldForSkill(skill)]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Derive planner-only introduction for one core target. */
export function deriveWorldCountriesTargetIntroduction(
  target: WorldCountriesRecallTarget,
  history: readonly WorldCountriesRecallHistoryAttempt[],
  learningState?: SubregionLearningState,
): WorldCountriesTargetIntroduction {
  const successfulAttempt = history.some(attempt => attempt.ok === true)
  const milestoneAt = target.skill === 'capital-to-country'
    ? null
    : validMilestoneAt(learningState, target.skill)

  return {
    target,
    introduced: successfulAttempt || milestoneAt !== null,
    source: successfulAttempt ? 'attempt' : milestoneAt !== null ? 'milestone' : 'none',
    milestoneAt,
  }
}

/** Derive introduction for every active core Country target. */
export function deriveWorldCountriesIntroducedness(
  activeCountries: readonly Pick<Country, 'id' | 'subregionId'>[],
  history: ReadonlyMap<string, readonly WorldCountriesRecallHistoryAttempt[]>,
  learningStates: readonly SubregionLearningState[] = [],
): ReadonlyMap<string, WorldCountriesTargetIntroduction> {
  const states = new Map(learningStates.map(state => [state.subregionId, state]))
  const result = new Map<string, WorldCountriesTargetIntroduction>()

  for (const country of activeCountries) {
    for (const skill of WORLD_COUNTRIES_CORE_RECALL_SKILLS) {
      const target = { countryId: country.id as CountryId, skill }
      const itemId = recallTargetIdFor(country.id, skill)
      result.set(itemId, deriveWorldCountriesTargetIntroduction(
        target,
        history.get(itemId) ?? [],
        states.get(country.subregionId),
      ))
    }
  }

  return result
}
