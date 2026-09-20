import { describe, expect, it } from 'vitest'
import {
  getSkillsForDrillMode,
  isWorldCountriesDrillMode,
  WORLD_COUNTRIES_DRILL_MODES,
  WORLD_COUNTRIES_MAIN_DRILL_MODE,
  WORLD_COUNTRIES_SUB_DRILL_MODES,
} from './drillModes'

describe('World Countries Drill modes', () => {
  it('leads with Countries + Capitals and narrows to the two core skills', () => {
    expect(WORLD_COUNTRIES_DRILL_MODES.map(mode => mode.label)).toEqual([
      'Countries + Capitals',
      'Countries',
      'Capitals',
    ])
    expect(WORLD_COUNTRIES_MAIN_DRILL_MODE.id).toBe('countries-capitals')
    expect(WORLD_COUNTRIES_SUB_DRILL_MODES.map(mode => mode.id)).toEqual(['countries', 'capitals'])
    expect(getSkillsForDrillMode('countries-capitals')).toEqual(['location-to-country', 'country-to-capital'])
    expect(getSkillsForDrillMode('countries')).toEqual(['location-to-country'])
    expect(getSkillsForDrillMode('capitals')).toEqual(['country-to-capital'])
  })

  it('no longer recognises the Drill modes that moved to Playground Practice', () => {
    expect(isWorldCountriesDrillMode('countries-from-shape')).toBe(false)
    expect(isWorldCountriesDrillMode('countries-from-capitals')).toBe(false)
  })
})
