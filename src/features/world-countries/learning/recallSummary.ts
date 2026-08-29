import type { CountryId } from '@/features/world-countries/data/countries'
import type { WorldCountriesRecallSkill } from './recallTargets'

export interface RecallSummaryAnswer {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
  correct: boolean
}

export interface RecallSkillSummary {
  attempts: number
  correct: number
  incorrect: number
  accuracy: number
}

export interface RecallResultSummary {
  correct: number
  accuracy: number
  countryCount: number
  bySkill: ReadonlyMap<WorldCountriesRecallSkill, RecallSkillSummary>
}

/** Summarize recall outcomes without depending on a workflow's answer record. */
export function summarizeRecallAnswers(
  answers: readonly RecallSummaryAnswer[],
): RecallResultSummary {
  const correct = answers.filter(answer => answer.correct).length
  const bySkill = new Map<WorldCountriesRecallSkill, RecallSkillSummary>()
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
