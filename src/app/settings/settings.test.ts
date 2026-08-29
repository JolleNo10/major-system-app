// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'

describe('default settings', () => {
  afterEach(() => localStorage.clear())

  it('enables fuzzy World Countries answer matching by default', () => {
    expect(DEFAULT_SETTINGS.worldCountriesFuzzyAnswerMatching).toBe(true)
  })

  it('defaults to three new World Countries items per Set', () => {
    expect(DEFAULT_SETTINGS.worldCountriesNewItemsPerSet).toBe(3)
  })

  it('normalizes malformed or legacy World Countries Set-size values', () => {
    localStorage.setItem('major-settings', JSON.stringify({ worldCountriesNewItemsPerSet: 7 }))
    expect(loadSettings().worldCountriesNewItemsPerSet).toBe(3)
    localStorage.setItem('major-settings', JSON.stringify({ worldCountriesNewItemsPerSet: 'all' }))
    expect(loadSettings().worldCountriesNewItemsPerSet).toBe('all')
  })

  it('omits the removed location-target field when saving the canonical shape', () => {
    localStorage.setItem('major-settings', JSON.stringify({ worldCountriesLocationCleanTargetMinimum: 10 }))
    saveSettings(loadSettings())
    expect(JSON.parse(localStorage.getItem('major-settings') ?? '{}')).not.toHaveProperty('worldCountriesLocationCleanTargetMinimum')
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

  it('keeps low-level settings persistence independent of the World Countries runtime tree', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/settings/settings.ts'), 'utf8')
    expect(source).not.toContain('@/features/world-countries')
  })
})
