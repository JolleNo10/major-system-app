import type { DrillAnswerRecord } from './drillSessionState'
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
