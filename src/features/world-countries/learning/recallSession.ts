import type { CountryId } from '@/features/world-countries/data/countries'
import type { WorldCountriesRecallSkill } from './recallTargets'

export interface WorldCountriesRecallSessionConfig {
  countryIds: readonly CountryId[]
  skills: readonly WorldCountriesRecallSkill[]
  /** Optional order supplied by the workflow that owns the run. */
  countryOrder?: readonly CountryId[]
}

export interface WorldCountriesRecallSessionState {
  countryIds: readonly CountryId[]
  countryOrder: readonly CountryId[]
  skills: readonly WorldCountriesRecallSkill[]
  countryIndex: number
  stepIndex: number
  phase: 'active' | 'complete'
}

export interface WorldCountriesRecallStep {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
}

export interface WorldCountriesRecallAdvanceResult {
  state: WorldCountriesRecallSessionState
  step: WorldCountriesRecallStep | null
  completedCountryNow: boolean
  completedNow: boolean
}

/** Create the finite Country/skill cursor shared by Drill and Practice. */
export function createRecallSession(
  config: WorldCountriesRecallSessionConfig,
): WorldCountriesRecallSessionState {
  const countryIds = [...new Set(config.countryIds)]
  const allowed = new Set(countryIds)
  const proposedOrder = [...new Set(config.countryOrder ?? countryIds)]
  const countryOrder = [
    ...proposedOrder.filter(countryId => allowed.has(countryId)),
    ...countryIds.filter(countryId => !proposedOrder.includes(countryId)),
  ]
  const skills = [...config.skills]

  return {
    countryIds,
    countryOrder,
    skills,
    countryIndex: 0,
    stepIndex: 0,
    phase: countryOrder.length === 0 || skills.length === 0 ? 'complete' : 'active',
  }
}

export function getCurrentRecallStep(
  state: WorldCountriesRecallSessionState,
): WorldCountriesRecallStep | null {
  if (state.phase === 'complete') return null
  const countryId = state.countryOrder[state.countryIndex]
  const skill = state.skills[state.stepIndex]
  return countryId === undefined || skill === undefined ? null : { countryId, skill }
}

export function getRecallSessionTotalSteps(state: WorldCountriesRecallSessionState): number {
  return state.countryOrder.length * state.skills.length
}

/** Advance the cursor one finite step; answer scoring stays with the caller. */
export function advanceRecallStep(
  state: WorldCountriesRecallSessionState,
): WorldCountriesRecallAdvanceResult {
  const step = getCurrentRecallStep(state)
  if (!step) {
    return { state, step: null, completedCountryNow: false, completedNow: false }
  }

  const lastStep = state.stepIndex === state.skills.length - 1
  const lastCountry = state.countryIndex === state.countryOrder.length - 1
  if (!lastStep) {
    return {
      state: { ...state, stepIndex: state.stepIndex + 1 },
      step,
      completedCountryNow: false,
      completedNow: false,
    }
  }
  if (!lastCountry) {
    return {
      state: { ...state, countryIndex: state.countryIndex + 1, stepIndex: 0 },
      step,
      completedCountryNow: true,
      completedNow: false,
    }
  }
  return {
    state: { ...state, phase: 'complete' },
    step,
    completedCountryNow: true,
    completedNow: true,
  }
}
