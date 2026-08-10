import type { CountryId } from '@/features/world-countries/data/countries'
import { createShuffleBag, drawShuffleBag, type ShuffleBagState } from './shuffleBag'

export type CapitalLearningPhase = 'walkthrough' | 'recall' | 'complete'

export interface CapitalLearningFlowConfig {
  countryIds: readonly CountryId[]
  /** Countries Memo is the capability gate for every Capital Memo action. */
  countriesLearned: boolean
}

export interface CapitalRecallState {
  countryIds: readonly CountryId[]
  currentCountryId: CountryId
  bag: ShuffleBagState<CountryId>
  roundCorrectCount: number
  roundHadError: boolean
  roundNumber: number
  completed: boolean
}

export interface CapitalRecallResult {
  state: CapitalRecallState
  correct: boolean
  expectedCountryId: CountryId
  completedNow: boolean
  startedNewRound: boolean
}

export interface CapitalLearningFlowState {
  phase: CapitalLearningPhase
  countryIds: readonly CountryId[]
  walkthroughIndex: number
  recall: CapitalRecallState | null
}

export function applyCapitalLearningTransition(
  current: CapitalLearningFlowState,
  next: CapitalLearningFlowState,
  onPhaseChange: (phase: CapitalLearningPhase) => void,
): CapitalLearningFlowState {
  if (next.phase !== current.phase) onPhaseChange(next.phase)
  return next
}

function uniqueCountryIds(countryIds: readonly CountryId[]): CountryId[] {
  return [...new Set(countryIds)]
}

export function createCapitalLearningFlow(
  config: CapitalLearningFlowConfig,
): CapitalLearningFlowState {
  if (config.countriesLearned !== true) throw new Error('Complete Countries first.')
  return {
    phase: 'walkthrough',
    countryIds: uniqueCountryIds(config.countryIds),
    walkthroughIndex: 0,
    recall: null,
  }
}

export function moveCapitalWalkthrough(
  state: CapitalLearningFlowState,
  offset: -1 | 1,
): CapitalLearningFlowState {
  if (state.phase !== 'walkthrough' || state.countryIds.length === 0) return state
  return {
    ...state,
    walkthroughIndex: Math.max(0, Math.min(state.countryIds.length - 1, state.walkthroughIndex + offset)),
  }
}

function drawNextCapitalCountry(
  countryIds: readonly CountryId[],
  bag: ShuffleBagState<CountryId>,
  random: () => number,
): { countryId: CountryId; bag: ShuffleBagState<CountryId> } | null {
  // A capital round must stop at the bag boundary. The shared shuffle bag can
  // refill automatically, but this workflow needs to qualify each complete
  // set before beginning another one.
  if (bag.remaining.length === 0) return null
  const draw = drawShuffleBag(bag, countryIds, random)
  return draw ? { countryId: draw.value, bag: draw.state } : null
}

export function createCapitalRecallSession(
  countryIds: readonly CountryId[],
  random: () => number = Math.random,
): CapitalRecallState {
  const uniqueIds = uniqueCountryIds(countryIds)
  const bag = createShuffleBag(uniqueIds, random)
  const first = drawNextCapitalCountry(uniqueIds, bag, random)
  if (!first) {
    return {
      countryIds: uniqueIds,
      currentCountryId: '',
      bag,
      roundCorrectCount: 0,
      roundHadError: false,
      roundNumber: 1,
      completed: true,
    }
  }
  return {
    countryIds: uniqueIds,
    currentCountryId: first.countryId,
    bag: first.bag,
    roundCorrectCount: 0,
    roundHadError: false,
    roundNumber: 1,
    completed: false,
  }
}

export function startCapitalRecall(
  state: CapitalLearningFlowState,
  random: () => number = Math.random,
): CapitalLearningFlowState {
  const recall = createCapitalRecallSession(state.countryIds, random)
  return {
    ...state,
    phase: recall.completed ? 'complete' : 'recall',
    recall,
  }
}

export function submitCapitalRecall(
  state: CapitalLearningFlowState,
  correct: boolean,
  random: () => number = Math.random,
): { state: CapitalLearningFlowState; result: CapitalRecallResult } {
  if (!state.recall || state.phase !== 'recall') {
    throw new Error('Capital recall is not active')
  }

  const recall = state.recall
  const expectedCountryId = recall.currentCountryId
  if (recall.completed) {
    return {
      state,
      result: {
        state: recall,
        correct,
        expectedCountryId,
        completedNow: false,
        startedNewRound: false,
      },
    }
  }

  const roundCorrectCount = recall.roundCorrectCount + (correct ? 1 : 0)
  const roundHadError = recall.roundHadError || !correct
  const next = drawNextCapitalCountry(recall.countryIds, recall.bag, random)
  if (next) {
    const nextRecall: CapitalRecallState = {
      ...recall,
      currentCountryId: next.countryId,
      bag: next.bag,
      roundCorrectCount,
      roundHadError,
    }
    return {
      state: { ...state, recall: nextRecall },
      result: {
        state: nextRecall,
        correct,
        expectedCountryId,
        completedNow: false,
        startedNewRound: false,
      },
    }
  }

  const cleanRound = !roundHadError && roundCorrectCount === recall.countryIds.length
  if (cleanRound) {
    const completedRecall: CapitalRecallState = {
      ...recall,
      roundCorrectCount,
      roundHadError,
      completed: true,
    }
    return {
      state: { ...state, phase: 'complete', recall: completedRecall },
      result: {
        state: completedRecall,
        correct,
        expectedCountryId,
        completedNow: true,
        startedNewRound: false,
      },
    }
  }

  const freshRound = createCapitalRecallSession(recall.countryIds, random)
  const nextRecall: CapitalRecallState = {
    ...freshRound,
    roundNumber: recall.roundNumber + 1,
  }
  return {
    state: { ...state, recall: nextRecall },
    result: {
      state: nextRecall,
      correct,
      expectedCountryId,
      completedNow: false,
      startedNewRound: true,
    },
  }
}
