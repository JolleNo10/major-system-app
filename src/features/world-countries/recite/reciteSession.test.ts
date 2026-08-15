import { describe, expect, it } from 'vitest'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  continueReciteSession,
  createReciteSession,
  getCurrentRecitePrompt,
  getReciteCountryOutcomes,
  revealReciteAnswer,
  submitReciteAnswer,
  type ReciteSessionCountry,
} from './reciteSession'

const countries: readonly ReciteSessionCountry[] = [
  { id: 'NO' as CountryId, country: 'Norway', capital: 'Oslo' },
  { id: 'SE' as CountryId, country: 'Sweden', capital: 'Stockholm' },
]

describe('World Countries Recite session', () => {
  it('snapshots the supplied ordered Country sequence', () => {
    const supplied = [...countries]
    const session = createReciteSession('countries', supplied)
    supplied.reverse()

    expect(session.countries.map(country => country.id)).toEqual(['NO', 'SE'])
    expect(getCurrentRecitePrompt(session)).toMatchObject({ countryId: 'NO', kind: 'country' })
  })

  it('keeps an incorrect prompt active until a later correct answer', () => {
    const started = createReciteSession('countries', countries)
    const afterIncorrect = submitReciteAnswer(started, false)

    expect(getCurrentRecitePrompt(afterIncorrect)).toMatchObject({
      countryId: 'NO',
      kind: 'country',
      incorrectAttempts: 1,
      feedback: 'incorrect',
    })

    const recovered = submitReciteAnswer(afterIncorrect, true)
    expect(getCurrentRecitePrompt(recovered)).toMatchObject({
      countryId: 'NO',
      outcome: 'recovered',
      feedback: 'correct',
    })
    expect(getCurrentRecitePrompt(continueReciteSession(recovered))).toMatchObject({ countryId: 'SE' })
  })

  it('requires continuation after a correct answer', () => {
    const answered = submitReciteAnswer(createReciteSession('countries', countries), true)

    expect(getCurrentRecitePrompt(answered)).toMatchObject({ countryId: 'NO', feedback: 'correct' })
    expect(getCurrentRecitePrompt(continueReciteSession(answered))).toMatchObject({ countryId: 'SE' })
  })

  it('advances from Country to Capital only after Country continuation', () => {
    const answered = submitReciteAnswer(createReciteSession('countries-capitals', countries), true)
    const capitalPrompt = continueReciteSession(answered)

    expect(getCurrentRecitePrompt(capitalPrompt)).toMatchObject({
      countryId: 'NO',
      kind: 'capital',
      feedback: 'none',
    })
  })

  it('derives a Countries + Capitals outcome from both prompts', () => {
    const countryRecovered = submitReciteAnswer(
      submitReciteAnswer(createReciteSession('countries-capitals', countries), false),
      true,
    )
    const capitalRevealed = revealReciteAnswer(continueReciteSession(countryRecovered))
    const next = continueReciteSession(capitalRevealed)

    expect(getReciteCountryOutcomes(next)[0]).toBe('revealed')
    expect(getCurrentRecitePrompt(next)).toMatchObject({ countryId: 'SE', kind: 'country' })
  })

  it('allows Reveal after retries and requires continuation', () => {
    const retried = submitReciteAnswer(
      submitReciteAnswer(createReciteSession('countries', countries), false),
      false,
    )
    const revealed = revealReciteAnswer(retried)

    expect(getCurrentRecitePrompt(revealed)).toMatchObject({
      countryId: 'NO',
      outcome: 'revealed',
      feedback: 'revealed',
      incorrectAttempts: 2,
    })
    expect(getCurrentRecitePrompt(continueReciteSession(revealed))).toMatchObject({ countryId: 'SE' })
  })

  it('completes after the final prompt is continued', () => {
    let session = createReciteSession('countries', countries)
    session = continueReciteSession(submitReciteAnswer(session, true))
    session = continueReciteSession(submitReciteAnswer(session, true))

    expect(session.phase).toBe('complete')
    expect(getReciteCountryOutcomes(session)).toEqual(['recalled', 'recalled'])
  })
})
