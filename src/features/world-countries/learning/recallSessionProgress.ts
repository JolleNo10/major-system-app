import { getRecallSessionTotalSteps, type WorldCountriesRecallSessionState } from './recallSession'

export interface RecallSessionProgress {
  totalSteps: number
  completedSteps: number
  progressPercent: number
}

/** Derive session progress metrics for any recall-based session (Practice, etc.).
 *
 * The Drill session has its own `deriveDrillSessionProgress` because it reads
 * skills via `getDrillSessionSkills` rather than from `state.skills` directly.
 */
export function deriveRecallSessionProgress(state: WorldCountriesRecallSessionState): RecallSessionProgress {
  const totalSteps = getRecallSessionTotalSteps(state)
  const completedSteps = state.countryIndex * state.skills.length + state.stepIndex
  return {
    totalSteps,
    completedSteps,
    progressPercent: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
  }
}
