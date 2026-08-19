import {
  schedulerLearningProgress,
  type SchedulerLearningSession,
  type WorldCountriesSchedulerSettings,
} from './schedulerLearningSession'

export interface LearningPracticeProgress {
  pct: number
  atTarget: number
  total: number
}

export function deriveLearningPracticeProgress(
  session: SchedulerLearningSession,
  settings: WorldCountriesSchedulerSettings,
): LearningPracticeProgress | null {
  const progress = schedulerLearningProgress(session, settings)
  if (progress.total === 0) return null
  return {
    pct: progress.pct,
    atTarget: progress.mastered,
    total: progress.total,
  }
}
