// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { loadWorldCountriesReciteProgress, saveCompletedReciteRun } from './reciteProgress'
import {
  createReciteActiveCountryColors,
  createReciteSetupCountryDescriptions,
  createReciteSetupCountryColors,
  getReciteSetupStatus,
  RECITE_CONTEXT_GREY,
  RECITE_STATUS_COLORS,
} from './recitePresentation'

afterEach(() => localStorage.clear())

function progressWithOutcomes(
  countriesOutcome: 'recalled' | 'recovered' | 'revealed' | undefined,
  capitalsOutcome: 'recalled' | 'recovered' | 'revealed' | undefined,
): ReturnType<typeof loadWorldCountriesReciteProgress> {
  if (countriesOutcome) saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: countriesOutcome }], 100)
  if (capitalsOutcome) saveCompletedReciteRun('countries-capitals', [{ countryId: 'NO', outcome: capitalsOutcome }], 200)
  return loadWorldCountriesReciteProgress()
}

describe('World Countries Recite map presentation', () => {
  it.each([
    ['unrecited', 'recalled', 'recalled'],
    ['revealed', 'recovered', 'recovered'],
    ['recovered', 'recalled', 'recalled'],
    ['recalled', 'recovered', 'recalled'],
    ['recalled', 'unrecited', 'recalled'],
  ] as const)('uses the stronger Countries setup outcome: %s + %s -> %s', (countriesOutcome, capitalsOutcome, expected) => {
    const progress = progressWithOutcomes(
      countriesOutcome === 'unrecited' ? undefined : countriesOutcome,
      capitalsOutcome === 'unrecited' ? undefined : capitalsOutcome,
    )

    expect(getReciteSetupStatus('countries', 'NO', progress)).toBe(expected)
  })

  it('keeps non-Countries setup modes isolated from stronger outcomes in other modes', () => {
    saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: 'recalled' }], 100)
    saveCompletedReciteRun('countries-capitals', [{ countryId: 'NO', outcome: 'recovered' }], 200)
    saveCompletedReciteRun('countries-from-capitals', [{ countryId: 'NO', outcome: 'revealed' }], 300)
    const progress = loadWorldCountriesReciteProgress()

    expect(getReciteSetupStatus('countries-capitals', 'NO', progress)).toBe('recovered')
    expect(getReciteSetupStatus('countries-from-capitals', 'NO', progress)).toBe('revealed')
  })

  it('uses selected-mode durable status and context grey outside the setup scope', () => {
    saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: 'recalled' }], 100)
    saveCompletedReciteRun('countries-capitals', [{ countryId: 'NO', outcome: 'recalled' }], 200)
    const entries = countries.filter(country => ['NO', 'SE', 'FR'].includes(country.id))

    const colors = createReciteSetupCountryColors(entries, ['NO', 'SE'], 'countries', loadWorldCountriesReciteProgress())

    expect(colors.get('NO')).toBe(RECITE_STATUS_COLORS.recalled)
    expect(colors.get('SE')).toBe(RECITE_STATUS_COLORS.unrecited)
    expect(colors.get('FR')).toBe(RECITE_CONTEXT_GREY)
  })

  it('keeps setup descriptions aligned with effective colors and scope', () => {
    const progress = progressWithOutcomes('revealed', 'recovered')
    const entries = countries.filter(country => ['NO', 'FR'].includes(country.id))

    const colors = createReciteSetupCountryColors(entries, ['NO'], 'countries', progress)
    const descriptions = createReciteSetupCountryDescriptions(entries, ['NO'], 'countries', progress)

    expect(colors.get('NO')).toBe(RECITE_STATUS_COLORS.recovered)
    expect(descriptions.get('NO')).toContain('retry')
    expect(descriptions.get('FR')).toBe('Outside the active Recite scope.')
    expect(colors.get('FR')).toBe(RECITE_CONTEXT_GREY)
  })

  it('suppresses historical status during active recall and colors only resolved Countries', () => {
    saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: 'recalled' }], 100)
    const entries = countries.filter(country => ['NO', 'SE', 'FR'].includes(country.id))
    const colors = createReciteActiveCountryColors(entries, ['NO', 'SE'], new Map([
      ['NO', 'recovered'],
    ]))

    expect(colors.get('NO')).toBe(RECITE_STATUS_COLORS.recovered)
    expect(colors.get('SE')).toBe(RECITE_STATUS_COLORS.unrecited)
    expect(colors.get('FR')).toBe(RECITE_CONTEXT_GREY)
  })
})
