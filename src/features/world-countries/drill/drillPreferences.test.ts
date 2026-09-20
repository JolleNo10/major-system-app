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
      order: 'random',
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

  it('keeps a persisted Capitals selection now that Capitals is a Drill sub mode again', () => {
    setWorldContinentOrder(['europe', 'asia'])
    localStorage.setItem(DRILL_PREFERENCES_STORAGE_KEY, JSON.stringify({
      continent: 'Europe',
      subregionIds: ['northern-europe', 'south-asia'],
      mode: 'capitals',
      order: 'random',
    }))
    expect(loadDrillPreferences()).toEqual({
      subregionIds: ['northern-europe', 'south-asia'],
      mode: 'capitals',
      order: 'random',
    })
  })

  it.each(['countries-from-capitals', 'countries-from-shape'])(
    'falls %s back to the main Drill mode now that it is Playground Practice',
    mode => {
      localStorage.setItem(DRILL_PREFERENCES_STORAGE_KEY, JSON.stringify({
        subregionIds: ['northern-europe'],
        mode,
        order: 'ordered',
      }))
      expect(loadDrillPreferences()).toMatchObject({ mode: 'countries-capitals', order: 'ordered' })
    },
  )

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
