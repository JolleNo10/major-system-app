import { describe, expect, it } from 'vitest'
import { recallTargetIdFor } from './recallTargets'

describe('World Countries recall targets', () => {
  it('centralizes stable Country + skill identities', () => {
    expect(recallTargetIdFor('NO', 'location-to-country')).toBe('world-countries:location-to-country:NO')
    expect(recallTargetIdFor('NO', 'country-to-capital')).not.toBe(recallTargetIdFor('NO', 'capital-to-country'))
  })
})
