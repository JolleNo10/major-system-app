import {
  getDrillSessionSkills,
  getDrillSessionTotalSteps,
  type DrillSessionState,
} from './drillSessionState'

export interface DrillSessionProgress {
  totalSteps: number
  completedSteps: number
  progressPercent: number
  countryPosition: number
  totalCountries: number
}

/** Derive the shared session metrics used by both Drill progress surfaces. */
export function deriveDrillSessionProgress(state: DrillSessionState): DrillSessionProgress {
  const totalSteps = getDrillSessionTotalSteps(state)
  const totalCountries = state.countryOrder.length
  const skillsPerCountry = getDrillSessionSkills(state).length
  const currentCompletedSteps = state.countryIndex * skillsPerCountry + state.stepIndex
  const completedSteps = state.phase === 'complete'
    ? totalSteps
    : Math.min(Math.max(0, currentCompletedSteps), totalSteps)
  const countryPosition = totalCountries === 0
    ? 0
    : Math.min(state.countryIndex + 1, totalCountries)

  return {
    totalSteps,
    completedSteps,
    progressPercent: totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100),
    countryPosition,
    totalCountries,
  }
}
