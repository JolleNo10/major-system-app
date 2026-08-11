// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { setWorldContinentOrder } from '@/features/world-countries/geography/worldMetadataStore'
import { DRILL_PREFERENCES_STORAGE_KEY, loadDrillPreferences, saveDrillPreferences } from './drillPreferences'

afterEach(() => localStorage.clear())

describe('World Countries Drill preferences', () => {
  it('defaults to no selected Subregions', () => {
    expect(loadDrillPreferences()).toMatchObject({
      subregionIds: [],
      mode: 'countries',
      order: 'ordered',
    })
  })

  it('uses the effective World Continent order for a fresh preference', () => {
    setWorldContinentOrder(['north-america', 'europe'])

    expect(loadDrillPreferences().continent).toBe('North America')
  })

  it('persists setup preferences without flattening Country membership', () => {
    saveDrillPreferences({
      continent: 'Europe',
      subregionIds: ['western-europe', 'northern-europe'],
      mode: 'countries-capitals',
      order: 'random',
    })
    expect(JSON.parse(localStorage.getItem(DRILL_PREFERENCES_STORAGE_KEY)!)).toEqual({
      continent: 'Europe',
      subregionIds: ['western-europe', 'northern-europe'],
      mode: 'countries-capitals',
      order: 'random',
    })
    expect(loadDrillPreferences()).toEqual({
      continent: 'Europe',
      subregionIds: ['western-europe', 'northern-europe'],
      mode: 'countries-capitals',
      order: 'random',
    })
  })

  it('filters stale or cross-Continent Subregions on read', () => {
    localStorage.setItem(DRILL_PREFERENCES_STORAGE_KEY, JSON.stringify({
      continent: 'Europe',
      subregionIds: ['northern-europe', 'south-asia'],
      mode: 'capitals',
      order: 'random',
    }))
    expect(loadDrillPreferences()).toEqual({
      continent: 'Europe',
      subregionIds: ['northern-europe'],
      mode: 'capitals',
      order: 'random',
    })
  })
})
