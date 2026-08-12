import type { CountryId } from '@/features/world-countries/data/countries'
import type { AttemptEvidenceKind } from '@/core/learning'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'

export interface DrillAnswerRecord {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
  answer: string
  correct: boolean
  at: number
  ms: number
  /** Populated by the active UI; absent only for legacy/session fixtures. */
  evidenceKind?: AttemptEvidenceKind
}

export interface DrillSessionConfig {
  mode: WorldCountriesDrillMode
  countryIds: readonly CountryId[]
  /** Shared mechanics may run a narrower skill set for non-recording Practice. */
  skills?: readonly WorldCountriesRecallSkill[]
  /** Optional pre-ranked order supplied by the Drill workflow. */
  countryOrder?: readonly CountryId[]
}

export interface DrillSessionState {
  mode: WorldCountriesDrillMode
  skills?: readonly WorldCountriesRecallSkill[]
  countryIds: readonly CountryId[]
  countryOrder: readonly CountryId[]
  countryIndex: number
  stepIndex: number
  phase: 'active' | 'complete'
}

export interface DrillSessionStep {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
}

export interface DrillSessionResult {
  state: DrillSessionState
  step: DrillSessionStep | null
  correct: boolean
  completedCountryNow: boolean
  completedNow: boolean
}

export function createDrillSession(config: DrillSessionConfig): DrillSessionState {
  const countryIds = [...new Set(config.countryIds)]
  const allowed = new Set(countryIds)
  const proposedOrder = [...new Set(config.countryOrder ?? countryIds)]
  const countryOrder = [
    ...proposedOrder.filter(countryId => allowed.has(countryId)),
    ...countryIds.filter(countryId => !proposedOrder.includes(countryId)),
  ]
  return {
    mode: config.mode,
    ...(config.skills ? { skills: [...config.skills] } : {}),
    countryIds,
    countryOrder,
    countryIndex: 0,
    stepIndex: 0,
    phase: countryOrder.length === 0 ? 'complete' : 'active',
  }
}

export function getDrillSessionSkills(state: DrillSessionState): readonly WorldCountriesRecallSkill[] {
  return state.skills ?? getSkillsForDrillMode(state.mode)
}

export function getCurrentDrillStep(state: DrillSessionState): DrillSessionStep | null {
  if (state.phase === 'complete') return null
  const countryId = state.countryOrder[state.countryIndex]
  const skill = getDrillSessionSkills(state)[state.stepIndex]
  return countryId === undefined || skill === undefined ? null : { countryId, skill }
}

/** A live settings change must not leave a session targeting inactive Countries. */
export function isDrillSessionCompatible(
  state: DrillSessionState,
  entries: readonly Pick<{ id: CountryId }, 'id'>[],
): boolean {
  const availableIds = new Set(entries.map(entry => entry.id))
  return state.countryIds.every(countryId => availableIds.has(countryId))
}

export function getDrillSessionTotalSteps(state: DrillSessionState): number {
  return state.countryOrder.length * getDrillSessionSkills(state).length
}

/** Advance only the visible workflow; evidence is recorded by the caller. */
export function submitDrillStep(
  state: DrillSessionState,
  correct: boolean,
): DrillSessionResult {
  const step = getCurrentDrillStep(state)
  if (!step) {
    return {
      state,
      step: null,
      correct: true,
      completedCountryNow: false,
      completedNow: false,
    }
  }

  const skills = getDrillSessionSkills(state)
  const lastStep = state.stepIndex === skills.length - 1
  const lastCountry = state.countryIndex === state.countryOrder.length - 1
  if (!lastStep) {
    return {
      state: { ...state, stepIndex: state.stepIndex + 1 },
      step,
      correct,
      completedCountryNow: false,
      completedNow: false,
    }
  }
  if (!lastCountry) {
    return {
      state: { ...state, countryIndex: state.countryIndex + 1, stepIndex: 0 },
      step,
      correct,
      completedCountryNow: true,
      completedNow: false,
    }
  }
  return {
    state: { ...state, phase: 'complete' },
    step,
    correct,
    completedCountryNow: true,
    completedNow: true,
  }
}
