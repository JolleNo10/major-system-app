import type { CountryId } from '@/features/world-countries/data/countries'
import {
  createOrderedRecallSession,
  submitOrderedRecall,
  type OrderedRecallResult,
  type OrderedRecallState,
} from './orderedRecallSession'
import {
  buildLearningPlan,
  type LearningPlanStage,
  type LearningSetMaximum,
} from './stagedLearningPlan'
import {
  createSchedulerLearningSession,
  resumeSchedulerLearningSession,
  submitSchedulerLearningAnswer,
  type SchedulerLearningResult,
  type SchedulerLearningSession,
  type WorldCountriesSchedulerSettings,
} from './schedulerLearningSession'

export type StagedCountryLearningPhase =
  | 'walkthrough'
  | 'location-practice'
  | 'location-ready'
  | 'practice'
  | 'set-ready'
  | 'combined-practice'
  | 'combined-ready'
  | 'final-gate'
  | 'final-recall'
  | 'complete'

export interface StagedCountryLearningConfig {
  countryIds: readonly CountryId[]
  maximum: LearningSetMaximum
  schedulerSettings: WorldCountriesSchedulerSettings
  rewindOnError?: number
}

export interface StagedCountryLearningFlowState {
  phase: StagedCountryLearningPhase
  countryIds: readonly CountryId[]
  plan: readonly LearningPlanStage<CountryId>[]
  stageIndex: number
  walkthroughIndex: number
  location: SchedulerLearningSession | null
  practice: SchedulerLearningSession | null
  ordered: OrderedRecallState<CountryId> | null
  finalScopeReady: boolean
  rewindOnError: number
  schedulerSettings: WorldCountriesSchedulerSettings
  maximum: LearningSetMaximum
}

function currentStage(state: StagedCountryLearningFlowState) {
  return state.plan[state.stageIndex]
}

function stageIds(stage: LearningPlanStage<CountryId>): readonly CountryId[] {
  return stage.kind === 'set' ? stage.set.ids : stage.ids
}

function enterStage(
  state: StagedCountryLearningFlowState,
  stageIndex: number,
  random: () => number,
): StagedCountryLearningFlowState {
  const stage = state.plan[stageIndex]
  if (!stage) return { ...state, phase: 'final-gate', stageIndex, location: null, practice: null, ordered: null }
  if (stage.kind === 'set') {
    return { ...state, stageIndex, phase: 'walkthrough', walkthroughIndex: 0, location: null, practice: null, ordered: null }
  }
  if (stage.kind === 'combined') {
    return {
      ...state,
      stageIndex,
      phase: 'combined-practice',
      location: null,
      practice: createSchedulerLearningSession(stage.ids, state.schedulerSettings, random),
      ordered: null,
    }
  }
  return { ...state, stageIndex, phase: 'final-gate', ordered: null }
}

export function createStagedCountryLearningFlow(
  config: StagedCountryLearningConfig,
): StagedCountryLearningFlowState {
  const countryIds = [...new Set(config.countryIds)]
  return {
    phase: 'walkthrough',
    countryIds,
    plan: buildLearningPlan(countryIds, config.maximum),
    stageIndex: 0,
    walkthroughIndex: 0,
    location: null,
    practice: null,
    ordered: null,
    finalScopeReady: false,
    rewindOnError: config.rewindOnError ?? 2,
    schedulerSettings: config.schedulerSettings,
    maximum: config.maximum,
  }
}

export function currentStagedCountryIds(state: StagedCountryLearningFlowState): readonly CountryId[] {
  const stage = currentStage(state)
  return stage ? stageIds(stage) : state.countryIds
}

export function currentStagedCountrySetNumber(state: StagedCountryLearningFlowState): number {
  const stage = currentStage(state)
  return stage?.kind === 'set' ? stage.set.index + 1 : 0
}

export function moveStagedCountryWalkthrough(
  state: StagedCountryLearningFlowState,
  offset: -1 | 1,
): StagedCountryLearningFlowState {
  if (state.phase !== 'walkthrough') return state
  const ids = currentStagedCountryIds(state)
  return { ...state, walkthroughIndex: Math.max(0, Math.min(ids.length - 1, state.walkthroughIndex + offset)) }
}

export function startStagedCountryLocation(
  state: StagedCountryLearningFlowState,
  random: () => number = Math.random,
): StagedCountryLearningFlowState {
  const stage = currentStage(state)
  if (!['walkthrough', 'location-ready'].includes(state.phase) || stage?.kind !== 'set') return state
  if (state.phase === 'location-ready' && state.location) {
    return { ...state, phase: 'location-practice', location: resumeSchedulerLearningSession(state.location, state.schedulerSettings) }
  }
  return {
    ...state,
    phase: 'location-practice',
    location: createSchedulerLearningSession(stage.set.ids, state.schedulerSettings, random),
    practice: null,
  }
}

export function submitStagedCountryLocation(
  state: StagedCountryLearningFlowState,
  correct: boolean,
  latencyMs: number,
  random: () => number = Math.random,
): { state: StagedCountryLearningFlowState; result: SchedulerLearningResult } {
  if (!state.location || state.phase !== 'location-practice') throw new Error('Location practice is not active')
  const result = submitSchedulerLearningAnswer(state.location, { correct, latencyMs }, state.schedulerSettings, random)
  return {
    state: { ...state, phase: result.session.ready ? 'location-ready' : 'location-practice', location: result.session },
    result,
  }
}

export function startStagedCountryPractice(
  state: StagedCountryLearningFlowState,
  random: () => number = Math.random,
): StagedCountryLearningFlowState {
  const ids = currentStagedCountryIds(state)
  if (!['location-ready', 'location-practice', 'walkthrough', 'set-ready'].includes(state.phase) || !currentStage(state) || currentStage(state)?.kind !== 'set') return state
  return {
    ...state,
    phase: 'practice',
    practice: createSchedulerLearningSession(ids, state.schedulerSettings, random),
  }
}

export function submitStagedCountryPractice(
  state: StagedCountryLearningFlowState,
  correct: boolean,
  latencyMs: number,
  random: () => number = Math.random,
): { state: StagedCountryLearningFlowState; result: SchedulerLearningResult } {
  if (!state.practice || state.phase !== 'practice') throw new Error('Country practice is not active')
  const result = submitSchedulerLearningAnswer(state.practice, { correct, latencyMs }, state.schedulerSettings, random)
  return {
    state: { ...state, phase: result.session.ready ? 'set-ready' : 'practice', practice: result.session },
    result,
  }
}

export function submitStagedCountryCombined(
  state: StagedCountryLearningFlowState,
  correct: boolean,
  latencyMs: number,
  random: () => number = Math.random,
): { state: StagedCountryLearningFlowState; result: SchedulerLearningResult } {
  if (!state.practice || state.phase !== 'combined-practice') throw new Error('Combined practice is not active')
  const result = submitSchedulerLearningAnswer(state.practice, { correct, latencyMs }, state.schedulerSettings, random)
  return {
    state: {
      ...state,
      phase: result.session.ready ? 'combined-ready' : 'combined-practice',
      practice: result.session,
      finalScopeReady: result.session.ready && currentStage(state)?.kind === 'combined' && state.stageIndex === state.plan.length - 2,
    },
    result,
  }
}

export function advanceStagedCountryPlan(
  state: StagedCountryLearningFlowState,
  random: () => number = Math.random,
): StagedCountryLearningFlowState {
  const nextIndex = state.stageIndex + 1
  const next = state.plan[nextIndex]
  if (!next) return { ...state, phase: 'final-gate', ordered: null, finalScopeReady: state.phase === 'set-ready' || state.finalScopeReady }
  if (next.kind === 'final') return enterStage({ ...state, finalScopeReady: state.phase === 'set-ready' || state.finalScopeReady }, nextIndex, random)
  return enterStage(state, nextIndex, random)
}

export function skipStagedCountry(
  state: StagedCountryLearningFlowState,
  random: () => number = Math.random,
): StagedCountryLearningFlowState {
  if (state.phase === 'walkthrough') return startStagedCountryLocation(state, random)
  if (state.phase === 'location-ready') return startStagedCountryPractice(state, random)
  if (state.phase === 'location-practice') return startStagedCountryPractice(state, random)
  if (state.phase === 'practice' || state.phase === 'set-ready' || state.phase === 'combined-ready') {
    return advanceStagedCountryPlan({ ...state, finalScopeReady: false }, random)
  }
  if (state.phase === 'combined-practice') return advanceStagedCountryPlan({ ...state, finalScopeReady: false }, random)
  return state
}

export function keepStagedCountryPractising(
  state: StagedCountryLearningFlowState,
  random: () => number = Math.random,
): StagedCountryLearningFlowState {
  if (state.phase === 'set-ready' && state.practice) return { ...state, phase: 'practice', practice: resumeSchedulerLearningSession(state.practice, state.schedulerSettings, random) }
  if (state.phase === 'combined-ready' && state.practice) return { ...state, phase: 'combined-practice', practice: resumeSchedulerLearningSession(state.practice, state.schedulerSettings, random) }
  if (state.phase === 'final-gate' && state.stageIndex > 0) {
    const previous = state.plan[state.stageIndex - 1]
    if (state.practice && previous && (previous.kind === 'combined' || previous.kind === 'set')) {
      return { ...state, stageIndex: state.stageIndex - 1, phase: previous.kind === 'combined' ? 'combined-practice' : 'practice', practice: resumeSchedulerLearningSession(state.practice, state.schedulerSettings, random), location: null, ordered: null }
    }
  }
  return state
}

export function backStagedCountry(
  state: StagedCountryLearningFlowState,
  random: () => number = Math.random,
): StagedCountryLearningFlowState {
  if (state.phase === 'final-recall') return { ...state, phase: 'final-gate', ordered: null }
  if (state.phase === 'final-gate' && state.stageIndex > 0) return enterStage(state, state.stageIndex - 1, random)
  if (state.phase === 'location-practice') return { ...state, phase: 'walkthrough', walkthroughIndex: 0, location: null }
  if (state.phase === 'practice' && state.location) return { ...state, phase: state.location.ready ? 'location-ready' : 'location-practice', practice: null }
  if (state.phase === 'set-ready' || state.phase === 'location-ready') return { ...state, phase: 'walkthrough', walkthroughIndex: 0 }
  if (state.phase === 'combined-ready' || state.phase === 'combined-practice') return state.stageIndex > 0 ? enterStage(state, state.stageIndex - 1, random) : state
  return state
}

export function startStagedCountryFinalRecall(
  state: StagedCountryLearningFlowState,
): StagedCountryLearningFlowState {
  if (state.phase !== 'final-gate') return state
  return {
    ...state,
    phase: 'final-recall',
    ordered: createOrderedRecallSession({ order: state.countryIds, rewindOnError: state.rewindOnError }),
  }
}

export function submitStagedCountryFinalAnswer(
  state: StagedCountryLearningFlowState,
  correct: boolean,
): { state: StagedCountryLearningFlowState; result: OrderedRecallResult<CountryId> } {
  if (!state.ordered || state.phase !== 'final-recall') throw new Error('Final recall is not active')
  const result = submitOrderedRecall(state.ordered, correct)
  return { state: { ...state, ordered: result.state, phase: result.completedNow ? 'complete' : 'final-recall' }, result }
}
