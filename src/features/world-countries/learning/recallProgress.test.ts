import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesRecallProgress, deriveCountryRecallProgress } from './recallProgress'
import { recallTargetIdFor } from './recallTargets'

describe('World Countries recall progress', () => {
  it('derives independent evidence for each atomic skill', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: false, ms: 1000 },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 2, ok: true, ms: 500 },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 3, ok: true, ms: 500 },
    ])

    expect(progress.get(recallTargetIdFor('NO', 'location-to-country'))?.wrong).toBe(1)
    expect(progress.get(recallTargetIdFor('NO', 'country-to-capital'))?.mastered).toBe(true)
    const country = deriveCountryRecallProgress('NO', ['location-to-country', 'country-to-capital'], progress)
    expect(country.masteredSkills).toBe(1)
    expect(country.mastered).toBe(false)
  })

  it('creates only atomic IDs for combined skills', () => {
    const progress = deriveWorldCountriesRecallProgress({ countryIds: ['NO', 'SE'], skills: ['location-to-country', 'country-to-capital'] }, [])
    expect([...progress.keys()].sort()).toEqual([
      recallTargetIdFor('NO', 'country-to-capital'),
      recallTargetIdFor('NO', 'location-to-country'),
      recallTargetIdFor('SE', 'country-to-capital'),
      recallTargetIdFor('SE', 'location-to-country'),
    ].sort())
  })
})
