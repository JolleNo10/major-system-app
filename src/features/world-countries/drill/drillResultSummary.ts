import type { DrillAnswerRecord } from './drillSessionState'
import type { CountryId } from '@/features/world-countries/data/countries'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'

export interface DrillSkillResult {
  attempts: number
  correct: number
  incorrect: number
  accuracy: number
}

export interface DrillResultSummary {
  correct: number
  accuracy: number
  countryCount: number
  bySkill: ReadonlyMap<WorldCountriesRecallSkill, DrillSkillResult>
}

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
  const correct = answers.filter(answer => answer.correct).length
  const bySkill = new Map<WorldCountriesRecallSkill, DrillSkillResult>()
  for (const answer of answers) {
    const previous = bySkill.get(answer.skill) ?? { attempts: 0, correct: 0, incorrect: 0, accuracy: 0 }
    const next = {
      attempts: previous.attempts + 1,
      correct: previous.correct + (answer.correct ? 1 : 0),
      incorrect: previous.incorrect + (answer.correct ? 0 : 1),
      accuracy: 0,
    }
    next.accuracy = Math.round((next.correct / next.attempts) * 100)
    bySkill.set(answer.skill, next)
  }
  return {
    correct,
    accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
    countryCount: new Set(answers.map(answer => answer.countryId)).size,
    bySkill,
  }
}
