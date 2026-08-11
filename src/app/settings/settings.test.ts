// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings } from './settings'

describe('default settings', () => {
  afterEach(() => localStorage.clear())

  it('enables fuzzy World Countries answer matching by default', () => {
    expect(DEFAULT_SETTINGS.worldCountriesFuzzyAnswerMatching).toBe(true)
  })

  it('defaults World Countries to the UN Member State set', () => {
    expect(DEFAULT_SETTINGS.worldCountriesIncludedEntityGroups).toEqual([])
  })

  it('discards unknown or malformed persisted country-set groups', () => {
    localStorage.setItem('major-settings', JSON.stringify({
      worldCountriesIncludedEntityGroups: ['territories', 'territories', 'unknown'],
    }))
    expect(loadSettings().worldCountriesIncludedEntityGroups).toEqual(['territories'])

    localStorage.setItem('major-settings', JSON.stringify({
      worldCountriesIncludedEntityGroups: 'territories',
    }))
    expect(loadSettings().worldCountriesIncludedEntityGroups).toEqual([])
  })
})
