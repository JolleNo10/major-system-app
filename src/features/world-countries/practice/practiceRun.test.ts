import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  createPracticeQuizRun,
  getDefaultPracticeQuestionCount,
  getPracticeMissedCountryIds,
  normalizePracticeQuestionCount,
  summarizePracticeAnswers,
} from './practiceRun'

describe('World Countries Practice runs', () => {
  it('uses the default count rule and normalizes invalid choices', () => {
    expect(getDefaultPracticeQuestionCount(20)).toBe(20)
    expect(getDefaultPracticeQuestionCount(10)).toBe(10)
    expect(getDefaultPracticeQuestionCount(9)).toBe('all')
    expect(normalizePracticeQuestionCount(50, 12)).toBe(10)
    expect(normalizePracticeQuestionCount(20, 7)).toBe('all')
  })

  it('creates a unique randomized subset and snapshots answer records', () => {
    const scope = countries.slice(0, 12)
    const run = createPracticeQuizRun({ scopeCountries: scope, questionCount: 10, random: () => 0 })

    expect(run?.countryIds).toHaveLength(10)
    expect(new Set(run?.countryIds).size).toBe(10)
    expect(run?.session.skills).toEqual(['country-to-capital'])
    expect(run?.countries[0]).not.toBe(scope[0])
  })

  it('retries exactly the unique missed Countries in original run order', () => {
    const run = createPracticeQuizRun({ scopeCountries: countries.slice(0, 3), questionCount: 'all', random: () => 0 })!
    const answers = [
      { countryId: run.countryIds[2]!, skill: 'country-to-capital' as const, outcome: 'incorrect' as const, submittedAnswer: 'Wrong' },
      { countryId: run.countryIds[0]!, skill: 'country-to-capital' as const, outcome: 'revealed' as const },
      { countryId: run.countryIds[2]!, skill: 'country-to-capital' as const, outcome: 'incorrect' as const, submittedAnswer: 'Again' },
    ]

    expect(getPracticeMissedCountryIds(run, answers)).toEqual([run.countryIds[0], run.countryIds[2]])
    expect(summarizePracticeAnswers(answers).correct).toBe(0)
  })

  it('scores exact and fuzzy answers while keeping incorrect and revealed answers missed', () => {
    const summary = summarizePracticeAnswers([
      { countryId: 'NO', skill: 'country-to-capital', outcome: 'exact' },
      { countryId: 'SE', skill: 'country-to-capital', outcome: 'fuzzy' },
      { countryId: 'FI', skill: 'country-to-capital', outcome: 'incorrect' },
      { countryId: 'DK', skill: 'country-to-capital', outcome: 'revealed' },
    ])

    expect(summary.correct).toBe(2)
    expect(summary.accuracy).toBe(50)
    expect(summary.bySkill.get('country-to-capital')).toMatchObject({ attempts: 4, correct: 2, incorrect: 2, accuracy: 50 })
  })
})
