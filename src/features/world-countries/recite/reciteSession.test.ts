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

const randomCountries: readonly ReciteSessionCountry[] = [
  ...countries,
  { id: 'FR' as CountryId, country: 'France', capital: 'Paris' },
]

describe('World Countries Recite session', () => {
  it('snapshots the supplied ordered Country sequence', () => {
    const supplied = [...countries]
    const session = createReciteSession('countries', supplied)
    supplied.reverse()

    expect(session.countries.map(country => country.id)).toEqual(['NO', 'SE'])
    expect(getCurrentRecitePrompt(session)).toMatchObject({ countryId: 'NO', kind: 'country' })
  })

  it('randomizes Countries + Capitals as one constrained prompt sequence', () => {
    const session = createReciteSession('countries-capitals', randomCountries, { randomize: true, random: () => 0 })
    const countryIds = session.countries.map(country => country.id)
    const prompts = session.prompts.map(prompt => ({
      countryId: session.countries[prompt.countryIndex]?.id,
      kind: prompt.kind,
    }))

    expect(new Set(countryIds)).toEqual(new Set(randomCountries.map(country => country.id)))
    expect(countryIds).toHaveLength(randomCountries.length)
    expect(countryIds).not.toEqual(randomCountries.map(country => country.id))
    expect(prompts).toHaveLength(randomCountries.length * 2)
    for (const countryId of countryIds) {
      expect(prompts.filter(prompt => prompt.countryId === countryId && prompt.kind === 'country')).toHaveLength(1)
      expect(prompts.filter(prompt => prompt.countryId === countryId && prompt.kind === 'capital')).toHaveLength(1)
    }
    expect(prompts.some((prompt, index) => index > 0 && prompt.countryId === prompts[index - 1]?.countryId)).toBe(false)
    let longestKindStreak = 0
    let currentKindStreak = 0
    let previousKind: string | undefined
    for (const prompt of prompts) {
      currentKindStreak = prompt.kind === previousKind ? currentKindStreak + 1 : 1
      longestKindStreak = Math.max(longestKindStreak, currentKindStreak)
      previousKind = prompt.kind
    }
    expect(longestKindStreak).toBeLessThanOrEqual(2)
    expect(prompts.map(prompt => `${prompt.countryId}:${prompt.kind}`)).not.toEqual(
      countryIds.flatMap(countryId => [`${countryId}:country`, `${countryId}:capital`]),
    )

    const afterFeedback = submitReciteAnswer(session, false)
    expect(afterFeedback.countries.map(country => country.id)).toEqual(countryIds)
    expect(afterFeedback.prompts.map(prompt => [prompt.countryIndex, prompt.kind])).toEqual(
      session.prompts.map(prompt => [prompt.countryIndex, prompt.kind]),
    )
    const afterRetry = submitReciteAnswer(afterFeedback, true)
    expect(afterRetry.prompts.map(prompt => [prompt.countryIndex, prompt.kind])).toEqual(
      session.prompts.map(prompt => [prompt.countryIndex, prompt.kind]),
    )
  })

  it('can create a fresh randomized prompt sequence for a later run', () => {
    const first = createReciteSession('countries-capitals', randomCountries, { randomize: true, random: () => 0 })
    const second = createReciteSession('countries-capitals', randomCountries, { randomize: true, random: () => 0.99 })

    expect(second.prompts.map(prompt => [prompt.countryIndex, prompt.kind])).not.toEqual(
      first.prompts.map(prompt => [prompt.countryIndex, prompt.kind]),
    )
  })

  it.each(['countries', 'countries-from-capitals'] as const)('keeps Random %s at one prompt per Country', mode => {
    const session = createReciteSession(mode, randomCountries, { randomize: true, random: () => 0.5 })

    expect(session.prompts).toHaveLength(randomCountries.length)
    expect(new Set(session.prompts.map(prompt => session.countries[prompt.countryIndex]?.id))).toEqual(
      new Set(randomCountries.map(country => country.id)),
    )
    expect(new Set(session.prompts.map(prompt => prompt.kind))).toEqual(new Set(['country']))
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
