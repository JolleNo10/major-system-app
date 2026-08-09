import type { CountryId } from '@/features/world-countries/data/countries'
import {
  createLocationRecallSession,
  submitLocationSelection,
  type LocationRecallConfig,
  type LocationRecallResult,
  type LocationRecallState,
} from '@/features/world-countries/learning/locationRecallSession'
import {
  createOrderedRecallSession,
  submitOrderedRecall,
  type OrderedRecallResult,
  type OrderedRecallState,
} from '@/features/world-countries/learning/orderedRecallSession'

export type CountryLearningPhase =
  | 'memory-preview'
  | 'walkthrough'
  | 'location-practice'
  | 'ordered-recall'
  | 'complete'

export interface CountryLearningConfig extends LocationRecallConfig {
  rewindOnError?: number
}

export interface CountryLearningFlowState {
  phase: CountryLearningPhase
  countryIds: readonly CountryId[]
  walkthroughIndex: number
  location: LocationRecallState | null
  ordered: OrderedRecallState<CountryId> | null
}

export function createCountryLearningFlow(
  config: CountryLearningConfig,
): CountryLearningFlowState {
  return {
    phase: 'memory-preview',
    countryIds: [...new Set(config.countryIds)],
    walkthroughIndex: 0,
    location: null,
    ordered: null,
  }
}

export function startCountryWalkthrough(state: CountryLearningFlowState): CountryLearningFlowState {
  return { ...state, phase: 'walkthrough', walkthroughIndex: 0 }
}

export function moveCountryWalkthrough(
  state: CountryLearningFlowState,
  offset: -1 | 1,
): CountryLearningFlowState {
  if (state.phase !== 'walkthrough' || state.countryIds.length === 0) return state
  return {
    ...state,
    walkthroughIndex: Math.max(0, Math.min(state.countryIds.length - 1, state.walkthroughIndex + offset)),
  }
}

export function startLocationPractice(
  state: CountryLearningFlowState,
  minimumCleanTarget: number,
  random: () => number = Math.random,
): CountryLearningFlowState {
  return {
    ...state,
    phase: 'location-practice',
    location: createLocationRecallSession({
      countryIds: state.countryIds,
      minimumCleanTarget,
    }, random),
    ordered: null,
  }
}

export function submitCountryLocation(
  state: CountryLearningFlowState,
  selectedCountryId: CountryId,
  random: () => number = Math.random,
): { state: CountryLearningFlowState; result: LocationRecallResult } {
  if (!state.location || state.phase !== 'location-practice') {
    throw new Error('Location recall is not active')
  }
  const result = submitLocationSelection(state.location, selectedCountryId, random)
  return { state: { ...state, location: result.state }, result }
}

export function startOrderedRecall(
  state: CountryLearningFlowState,
  rewindOnError = 2,
): CountryLearningFlowState {
  return {
    ...state,
    phase: 'ordered-recall',
    ordered: createOrderedRecallSession({ order: state.countryIds, rewindOnError }),
  }
}

export function submitCountryOrderAnswer(
  state: CountryLearningFlowState,
  correct: boolean,
): { state: CountryLearningFlowState; result: OrderedRecallResult<CountryId> } {
  if (!state.ordered || state.phase !== 'ordered-recall') {
    throw new Error('Ordered recall is not active')
  }
  const result = submitOrderedRecall(state.ordered, correct)
  return {
    state: {
      ...state,
      ordered: result.state,
      phase: result.completedNow ? 'complete' : state.phase,
    },
    result,
  }
}
