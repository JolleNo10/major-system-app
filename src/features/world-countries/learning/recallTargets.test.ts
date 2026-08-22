import { describe, expect, it } from 'vitest'
import { getWorldCountriesRecallSkillCategory, recallTargetIdFor } from './recallTargets'

describe('World Countries recall targets', () => {
  it('centralizes stable Country + skill identities', () => {
    expect(recallTargetIdFor('NO', 'location-to-country')).toBe('world-countries:location-to-country:NO')
    expect(recallTargetIdFor('NO', 'country-to-capital')).not.toBe(recallTargetIdFor('NO', 'capital-to-country'))
  })

  it('keeps shape recall separate from the core finish line', () => {
    expect(recallTargetIdFor('NO', 'shape-to-country')).toBe('world-countries:shape-to-country:NO')
    expect(getWorldCountriesRecallSkillCategory('shape-to-country')).toBe('additional')
  })
})
