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

export type StagedCapitalLearningPhase =
  | 'walkthrough'
  | 'practice'
  | 'set-ready'
  | 'combined-practice'
  | 'combined-ready'
  | 'final-gate'
  | 'final-recall'
  | 'complete'

export interface StagedCapitalLearningConfig {
  countryIds: readonly CountryId[]
  maximum: LearningSetMaximum
  schedulerSettings: WorldCountriesSchedulerSettings
  rewindOnError?: number
}

export interface StagedCapitalLearningFlowState {
  phase: StagedCapitalLearningPhase
  countryIds: readonly CountryId[]
  plan: readonly LearningPlanStage<CountryId>[]
  stageIndex: number
  walkthroughIndex: number
  practice: SchedulerLearningSession | null
  ordered: OrderedRecallState<CountryId> | null
  finalScopeReady: boolean
  rewindOnError: number
  schedulerSettings: WorldCountriesSchedulerSettings
  maximum: LearningSetMaximum
}

function enterStage(state: StagedCapitalLearningFlowState, stageIndex: number, random: () => number) {
  const stage = state.plan[stageIndex]
  if (!stage) return { ...state, stageIndex, phase: 'final-gate' as const, practice: null, ordered: null }
  if (stage.kind === 'set') return { ...state, stageIndex, phase: 'walkthrough' as const, walkthroughIndex: 0, practice: null, ordered: null }
  if (stage.kind === 'combined') return { ...state, stageIndex, phase: 'combined-practice' as const, practice: createSchedulerLearningSession(stage.ids, state.schedulerSettings, random), ordered: null }
  return { ...state, stageIndex, phase: 'final-gate' as const, ordered: null }
}

function currentStage(state: StagedCapitalLearningFlowState) {
  return state.plan[state.stageIndex]
}

export function createStagedCapitalLearningFlow(config: StagedCapitalLearningConfig): StagedCapitalLearningFlowState {
  const countryIds = [...new Set(config.countryIds)]
  return {
    phase: 'walkthrough', countryIds, plan: buildLearningPlan(countryIds, config.maximum), stageIndex: 0,
    walkthroughIndex: 0, practice: null, ordered: null, finalScopeReady: false,
    rewindOnError: config.rewindOnError ?? 2, schedulerSettings: config.schedulerSettings, maximum: config.maximum,
  }
}

export function currentStagedCapitalIds(state: StagedCapitalLearningFlowState): readonly CountryId[] {
  const stage = currentStage(state)
  return stage && stage.kind !== 'final' ? stage.kind === 'set' ? stage.set.ids : stage.ids : state.countryIds
}

export function moveStagedCapitalWalkthrough(state: StagedCapitalLearningFlowState, offset: -1 | 1) {
  if (state.phase !== 'walkthrough') return state
  const ids = currentStagedCapitalIds(state)
  return { ...state, walkthroughIndex: Math.max(0, Math.min(ids.length - 1, state.walkthroughIndex + offset)) }
}

export function startStagedCapitalPractice(state: StagedCapitalLearningFlowState, random: () => number = Math.random) {
  const stage = currentStage(state)
  if (state.phase !== 'walkthrough' || stage?.kind !== 'set') return state
  return { ...state, phase: 'practice' as const, practice: createSchedulerLearningSession(stage.set.ids, state.schedulerSettings, random) }
}

export function submitStagedCapitalPractice(
  state: StagedCapitalLearningFlowState,
  correct: boolean,
  latencyMs: number,
  random: () => number = Math.random,
): { state: StagedCapitalLearningFlowState; result: SchedulerLearningResult } {
  if (!state.practice || state.phase !== 'practice') throw new Error('Capital practice is not active')
  const result = submitSchedulerLearningAnswer(state.practice, { correct, latencyMs }, state.schedulerSettings, random)
  return { state: { ...state, phase: result.session.ready ? 'set-ready' : 'practice', practice: result.session }, result }
}

export function submitStagedCapitalCombined(
  state: StagedCapitalLearningFlowState,
  correct: boolean,
  latencyMs: number,
  random: () => number = Math.random,
): { state: StagedCapitalLearningFlowState; result: SchedulerLearningResult } {
  if (!state.practice || state.phase !== 'combined-practice') throw new Error('Combined practice is not active')
  const result = submitSchedulerLearningAnswer(state.practice, { correct, latencyMs }, state.schedulerSettings, random)
  return {
    state: {
      ...state,
      phase: result.session.ready ? 'combined-ready' : 'combined-practice',
      practice: result.session,
      finalScopeReady: result.session.ready && state.stageIndex === state.plan.length - 2,
    },
    result,
  }
}

export function advanceStagedCapitalPlan(state: StagedCapitalLearningFlowState, random: () => number = Math.random) {
  const next = state.plan[state.stageIndex + 1]
  return next?.kind === 'final'
    ? enterStage({ ...state, finalScopeReady: state.phase === 'set-ready' || state.finalScopeReady }, state.stageIndex + 1, random)
    : enterStage({ ...state, finalScopeReady: state.finalScopeReady }, state.stageIndex + 1, random)
}

export function skipStagedCapital(state: StagedCapitalLearningFlowState, random: () => number = Math.random) {
  if (state.phase === 'walkthrough') return startStagedCapitalPractice(state, random)
  if (state.phase === 'practice' || state.phase === 'set-ready' || state.phase === 'combined-ready' || state.phase === 'combined-practice') {
    return advanceStagedCapitalPlan({ ...state, finalScopeReady: false }, random)
  }
  return state
}

export function keepStagedCapitalPractising(state: StagedCapitalLearningFlowState, random: () => number = Math.random) {
  if (state.phase === 'set-ready' && state.practice) return { ...state, phase: 'practice' as const, practice: resumeSchedulerLearningSession(state.practice, state.schedulerSettings, random) }
  if (state.phase === 'combined-ready' && state.practice) return { ...state, phase: 'combined-practice' as const, practice: resumeSchedulerLearningSession(state.practice, state.schedulerSettings, random) }
  if (state.phase === 'final-gate' && state.stageIndex > 0) {
    const previous = state.plan[state.stageIndex - 1]
    if (state.practice && previous && (previous.kind === 'combined' || previous.kind === 'set')) return { ...state, stageIndex: state.stageIndex - 1, phase: previous.kind === 'combined' ? 'combined-practice' as const : 'practice' as const, practice: resumeSchedulerLearningSession(state.practice, state.schedulerSettings, random), ordered: null }
  }
  return state
}

export function backStagedCapital(state: StagedCapitalLearningFlowState, random: () => number = Math.random) {
  if (state.phase === 'final-recall') return { ...state, phase: 'final-gate' as const, ordered: null }
  if (state.phase === 'final-gate' && state.stageIndex > 0) return enterStage(state, state.stageIndex - 1, random)
  if (state.phase === 'practice') return { ...state, phase: 'walkthrough' as const, walkthroughIndex: 0, practice: null }
  if (state.phase === 'set-ready') return { ...state, phase: 'walkthrough' as const, walkthroughIndex: 0 }
  if (state.phase === 'combined-ready' || state.phase === 'combined-practice') return state.stageIndex > 0 ? enterStage(state, state.stageIndex - 1, random) : state
  return state
}

export function startStagedCapitalFinalRecall(state: StagedCapitalLearningFlowState) {
  if (state.phase !== 'final-gate') return state
  return { ...state, phase: 'final-recall' as const, ordered: createOrderedRecallSession({ order: state.countryIds, rewindOnError: state.rewindOnError }) }
}

export function submitStagedCapitalFinalAnswer(
  state: StagedCapitalLearningFlowState,
  correct: boolean,
): { state: StagedCapitalLearningFlowState; result: OrderedRecallResult<CountryId> } {
  if (!state.ordered || state.phase !== 'final-recall') throw new Error('Capital final recall is not active')
  const result = submitOrderedRecall(state.ordered, correct)
  return { state: { ...state, ordered: result.state, phase: result.completedNow ? 'complete' : 'final-recall' }, result }
}
