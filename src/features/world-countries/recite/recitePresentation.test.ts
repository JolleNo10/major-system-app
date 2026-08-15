// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { loadWorldCountriesReciteProgress, saveCompletedReciteRun } from './reciteProgress'
import {
  createReciteActiveCountryColors,
  createReciteSetupCountryColors,
  RECITE_CONTEXT_GREY,
  RECITE_STATUS_COLORS,
} from './recitePresentation'

describe('World Countries Recite map presentation', () => {
  it('uses selected-mode durable status and context grey outside the setup scope', () => {
    localStorage.clear()
    saveCompletedReciteRun('countries', [{ countryId: 'NO', outcome: 'recalled' }], 100)
    const entries = countries.filter(country => ['NO', 'SE', 'FR'].includes(country.id))

    const colors = createReciteSetupCountryColors(entries, ['NO', 'SE'], 'countries', loadWorldCountriesReciteProgress())

    expect(colors.get('NO')).toBe(RECITE_STATUS_COLORS.recalled)
    expect(colors.get('SE')).toBe(RECITE_STATUS_COLORS.unrecited)
    expect(colors.get('FR')).toBe(RECITE_CONTEXT_GREY)
  })

  it('suppresses historical status during active recall and colors only resolved Countries', () => {
    const entries = countries.filter(country => ['NO', 'SE', 'FR'].includes(country.id))
    const colors = createReciteActiveCountryColors(entries, ['NO', 'SE'], new Map([
      ['NO', 'recovered'],
    ]))

    expect(colors.get('NO')).toBe(RECITE_STATUS_COLORS.recovered)
    expect(colors.get('SE')).toBe(RECITE_STATUS_COLORS.unrecited)
    expect(colors.get('FR')).toBe(RECITE_CONTEXT_GREY)
  })
})
