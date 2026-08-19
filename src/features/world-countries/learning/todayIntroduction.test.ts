import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesIntroducedness } from './todayIntroduction'
import { deriveWorldCountriesRecallHistory } from './recallHistory'

describe('World Countries Today introduction', () => {
  it('introduces successful manual evidence without requiring a milestone', () => {
    const history = deriveWorldCountriesRecallHistory({ countryIds: ['NO'], skills: ['location-to-country', 'country-to-capital'] }, [
      { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, ms: 100, evidenceKind: 'recognition' },
    ])
    const introductions = deriveWorldCountriesIntroducedness([
      { id: 'NO', subregionId: 'northern-europe' },
    ], history)
    expect(introductions.get('world-countries:location-to-country:NO')?.source).toBe('attempt')
    expect(introductions.get('world-countries:country-to-capital:NO')?.introduced).toBe(false)
  })

  it('uses only the applicable active-membership milestone', () => {
    const history = new Map()
    const introductions = deriveWorldCountriesIntroducedness([
      { id: 'NO', subregionId: 'northern-europe' },
    ], history, [{ subregionId: 'northern-europe', countriesLearnedAt: 10 }])
    expect(introductions.get('world-countries:location-to-country:NO')).toMatchObject({
      introduced: true,
      source: 'milestone',
      milestoneAt: 10,
    })
    expect(introductions.get('world-countries:country-to-capital:NO')?.introduced).toBe(false)
  })
})
