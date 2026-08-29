import type { DrillAnswerRecord } from './drillSessionState'
import type { CountryId } from '@/features/world-countries/data/countries'
import { summarizeRecallAnswers, type RecallResultSummary, type RecallSkillSummary } from '@/features/world-countries/learning/recallSummary'

export type DrillSkillResult = RecallSkillSummary

export type DrillResultSummary = RecallResultSummary

/** Return each Country that had at least one incorrect answer in this run. */
export function getFailedDrillCountryIds(answers: readonly DrillAnswerRecord[]): CountryId[] {
  return [...new Set(answers.filter(answer => !answer.correct).map(answer => answer.countryId))]
}

/** Keep failed Countries in the completed session's effective order and population. */
export function getRetryableFailedDrillCountryIds(
  answers: readonly DrillAnswerRecord[],
  sessionCountryIds: readonly CountryId[],
  activeCountryIds: readonly CountryId[],
): CountryId[] {
  const failedCountryIds = new Set(getFailedDrillCountryIds(answers))
  const activeIds = new Set(activeCountryIds)
  return sessionCountryIds.filter(countryId => failedCountryIds.has(countryId) && activeIds.has(countryId))
}

export function summarizeDrillAnswers(answers: readonly DrillAnswerRecord[]): DrillResultSummary {
  return summarizeRecallAnswers(answers)
}
