import { describe, expect, it } from 'vitest'
import { summarizeDrillAnswers } from './drillResultSummary'
import type { DrillAnswerRecord } from './drillSessionState'

const answers: DrillAnswerRecord[] = [
  { countryId: 'NO', skill: 'location-to-country', answer: 'Norway', correct: true, at: 1, ms: 400, evidenceKind: 'recall' },
  { countryId: 'NO', skill: 'country-to-capital', answer: 'Oslo', correct: false, at: 2, ms: 500, evidenceKind: 'recognition' },
  { countryId: 'SE', skill: 'location-to-country', answer: 'Sweden', correct: true, at: 3, ms: 450, evidenceKind: 'recall' },
]

describe('World Countries Drill result summary', () => {
  it('reports skill-specific results alongside aggregate session accuracy', () => {
    const summary = summarizeDrillAnswers(answers)

    expect(summary).toMatchObject({ correct: 2, accuracy: 67, countryCount: 2 })
    expect(summary.bySkill.get('location-to-country')).toEqual({ attempts: 2, correct: 2, incorrect: 0, accuracy: 100 })
    expect(summary.bySkill.get('country-to-capital')).toEqual({ attempts: 1, correct: 0, incorrect: 1, accuracy: 0 })
  })
})
