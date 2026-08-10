import type { DrillAnswerRecord } from './drillSessionState'

export interface DrillResultSummary {
  correct: number
  accuracy: number
  countryCount: number
}

export function summarizeDrillAnswers(answers: readonly DrillAnswerRecord[]): DrillResultSummary {
  const correct = answers.filter(answer => answer.correct).length
  return {
    correct,
    accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
    countryCount: new Set(answers.map(answer => answer.countryId)).size,
  }
}
