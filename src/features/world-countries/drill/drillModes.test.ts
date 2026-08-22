import { describe, expect, it } from 'vitest'
import { getSkillsForDrillMode, isWorldCountriesDrillMode, WORLD_COUNTRIES_DRILL_MODES } from './drillModes'

describe('World Countries Drill modes', () => {
  it('registers Country for Shape as the fourth normal mode', () => {
    expect(WORLD_COUNTRIES_DRILL_MODES.map(mode => mode.label)).toEqual([
      'Countries',
      'Countries + Capitals',
      'Countries from Capitals',
      'Country for Shape',
    ])
    expect(isWorldCountriesDrillMode('countries-from-shape')).toBe(true)
    expect(getSkillsForDrillMode('countries-from-shape')).toEqual(['shape-to-country'])
  })
})
