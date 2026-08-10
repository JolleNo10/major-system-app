// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { DRILL_PREFERENCES_STORAGE_KEY, loadDrillPreferences, saveDrillPreferences } from './drillPreferences'

afterEach(() => localStorage.clear())

describe('World Countries Drill preferences', () => {
  it('persists setup preferences without flattening Country membership', () => {
    saveDrillPreferences({
      continent: 'Europe',
      subregionIds: ['western-europe', 'northern-europe'],
      mode: 'countries-capitals',
    })
    expect(JSON.parse(localStorage.getItem(DRILL_PREFERENCES_STORAGE_KEY)!)).toEqual({
      continent: 'Europe',
      subregionIds: ['western-europe', 'northern-europe'],
      mode: 'countries-capitals',
    })
    expect(loadDrillPreferences()).toEqual({
      continent: 'Europe',
      subregionIds: ['western-europe', 'northern-europe'],
      mode: 'countries-capitals',
    })
  })

  it('filters stale or cross-Continent Subregions on read', () => {
    localStorage.setItem(DRILL_PREFERENCES_STORAGE_KEY, JSON.stringify({
      continent: 'Europe',
      subregionIds: ['northern-europe', 'south-asia'],
      mode: 'capitals',
    }))
    expect(loadDrillPreferences()).toEqual({
      continent: 'Europe',
      subregionIds: ['northern-europe'],
      mode: 'capitals',
    })
  })
})
