import { describe, expect, it } from 'vitest'
import { getFailedDrillCountryIds, getRetryableFailedDrillCountryIds, summarizeDrillAnswers } from './drillResultSummary'
import type { DrillAnswerRecord } from './drillSessionState'

const answers: DrillAnswerRecord[] = [
  { countryId: 'NO', skill: 'location-to-country', answer: 'Norway', correct: true, at: 1, ms: 400, evidenceKind: 'recall' },
  { countryId: 'NO', skill: 'country-to-capital', answer: 'Oslo', correct: false, at: 2, ms: 500, evidenceKind: 'recognition' },
  { countryId: 'SE', skill: 'location-to-country', answer: 'Sweden', correct: true, at: 3, ms: 450, evidenceKind: 'recall' },
]

describe('World Countries Drill result summary', () => {
  it('derives unique failed Countries from incorrect answers only', () => {
    expect(getFailedDrillCountryIds([
      answers[0],
      answers[1],
      { ...answers[1], skill: 'location-to-country' },
      answers[2],
    ])).toEqual(['NO'])
  })

  it('derives each retry from the immediately completed run', () => {
    const firstRunFailures = getFailedDrillCountryIds([
      { ...answers[0], correct: false },
      answers[1],
      answers[2],
    ])
    const retryFailures = getFailedDrillCountryIds([
      { ...answers[0], correct: false },
      { ...answers[1], correct: true },
    ])
    const finalRetryFailures = getFailedDrillCountryIds([
      { ...answers[0], correct: true },
    ])

    expect(firstRunFailures).toEqual(['NO'])
    expect(retryFailures).toEqual(['NO'])
    expect(finalRetryFailures).toEqual([])
  })

  it('filters removed Countries while retaining completed-session order', () => {
    expect(getRetryableFailedDrillCountryIds([
      { ...answers[0], countryId: 'SE', correct: false },
      { ...answers[1], countryId: 'NO' },
      { ...answers[2], countryId: 'FI', correct: false },
    ], ['FI', 'SE', 'NO'], ['FI', 'NO'])).toEqual(['FI', 'NO'])
  })

  it('reports skill-specific results alongside aggregate session accuracy', () => {
    const summary = summarizeDrillAnswers(answers)

    expect(summary).toMatchObject({ correct: 2, accuracy: 67, countryCount: 2 })
    expect(summary.bySkill.get('location-to-country')).toEqual({ attempts: 2, correct: 2, incorrect: 0, accuracy: 100 })
    expect(summary.bySkill.get('country-to-capital')).toEqual({ attempts: 1, correct: 0, incorrect: 1, accuracy: 0 })
  })
})
