// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { setWorldContinentOrder } from '@/features/world-countries/geography/worldMetadataStore'
import { DRILL_PREFERENCES_STORAGE_KEY, loadDrillPreferences, saveDrillPreferences } from './drillPreferences'

afterEach(() => localStorage.clear())

describe('World Countries Drill preferences', () => {
  it('defaults to no selected Subregions', () => {
    expect(loadDrillPreferences()).toMatchObject({
      subregionIds: [],
      mode: 'countries-capitals',
      order: 'ordered',
    })
  })

  it('persists setup preferences without flattening Country membership', () => {
    saveDrillPreferences({
      subregionIds: ['western-europe', 'northern-europe'],
      mode: 'countries-capitals',
      order: 'random',
    })
    expect(JSON.parse(localStorage.getItem(DRILL_PREFERENCES_STORAGE_KEY)!)).toEqual({
      subregionIds: ['northern-europe', 'western-europe'],
      mode: 'countries-capitals',
      order: 'random',
    })
    expect(loadDrillPreferences()).toEqual({
      subregionIds: ['northern-europe', 'western-europe'],
      mode: 'countries-capitals',
      order: 'random',
    })
  })

  it('falls back legacy persisted Capitals Drill values to the normal Drill default', () => {
    setWorldContinentOrder(['europe', 'asia'])
    localStorage.setItem(DRILL_PREFERENCES_STORAGE_KEY, JSON.stringify({
      continent: 'Europe',
      subregionIds: ['northern-europe', 'south-asia'],
      mode: 'capitals',
      order: 'random',
    }))
    expect(loadDrillPreferences()).toEqual({
      subregionIds: ['northern-europe', 'south-asia'],
      mode: 'countries-capitals',
      order: 'random',
    })
  })

  it('preserves valid legacy selection when stale IDs are mixed in', () => {
    localStorage.setItem(DRILL_PREFERENCES_STORAGE_KEY, JSON.stringify({
      continent: 'Europe',
      subregionIds: ['south-asia', 'not-a-subregion', 'northern-europe'],
      mode: 'invalid-mode',
      order: 'ordered',
    }))

    expect(loadDrillPreferences()).toMatchObject({
      subregionIds: expect.arrayContaining(['northern-europe', 'south-asia']),
      mode: 'countries-capitals',
      order: 'ordered',
    })
  })
})
