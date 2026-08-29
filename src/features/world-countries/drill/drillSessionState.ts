import type { CountryId } from '@/features/world-countries/data/countries'
import type { AttemptEvidenceKind } from '@/core/learning'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import {
  advanceRecallStep,
  createRecallSession,
  getCurrentRecallStep,
  getRecallSessionTotalSteps,
  type WorldCountriesRecallSessionState,
  type WorldCountriesRecallStep,
} from '@/features/world-countries/learning/recallSession'
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
  /** The answer followed deliberate mnemonic assistance and is non-recording. */
  assisted?: boolean
}

export interface DrillSessionConfig {
  mode: WorldCountriesDrillMode
  countryIds: readonly CountryId[]
  /** Shared mechanics may run a narrower skill set for non-recording Practice. */
  skills?: readonly WorldCountriesRecallSkill[]
  /** Optional pre-ranked order supplied by the Drill workflow. */
  countryOrder?: readonly CountryId[]
}

export interface DrillSessionState extends WorldCountriesRecallSessionState {
  mode: WorldCountriesDrillMode
}

export type DrillSessionStep = WorldCountriesRecallStep

export interface DrillSessionResult {
  state: DrillSessionState
  step: DrillSessionStep | null
  correct: boolean
  completedCountryNow: boolean
  completedNow: boolean
}

export function createDrillSession(config: DrillSessionConfig): DrillSessionState {
  return {
    mode: config.mode,
    ...createRecallSession({
      countryIds: config.countryIds,
      skills: config.skills ?? getSkillsForDrillMode(config.mode),
      countryOrder: config.countryOrder,
    }),
  }
}

export function getDrillSessionSkills(state: DrillSessionState): readonly WorldCountriesRecallSkill[] {
  return state.skills
}

export function getCurrentDrillStep(state: DrillSessionState): DrillSessionStep | null {
  return getCurrentRecallStep(state)
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
  return getRecallSessionTotalSteps(state)
}

/** Advance only the visible workflow; evidence is recorded by the caller. */
export function submitDrillStep(
  state: DrillSessionState,
  correct: boolean,
): DrillSessionResult {
  const result = advanceRecallStep(state)
  return {
    state: { ...result.state, mode: state.mode },
    step: result.step,
    correct,
    completedCountryNow: result.completedCountryNow,
    completedNow: result.completedNow,
  }
}
