import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress } from './recallProgress'
import { getCountryProgressState } from './progressPresentation'
import { recallTargetIdFor, WORLD_COUNTRIES_RECALL_SKILLS } from './recallTargets'

describe('World Countries progress presentation semantics', () => {
  it('uses core Country state by default and atomic state for a skill view', () => {
    const itemProgress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, [
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 2, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 3, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 4, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: recallTargetIdFor('NO', 'capital-to-country'), at: 5, ok: false, ms: 500, evidenceKind: 'recognition', localDate: '2026-08-12' },
    ])
    const progress = deriveWorldCountriesCountryProgress('NO', itemProgress)

    expect(getCountryProgressState(progress, 'core')).toBe('complete')
    expect(getCountryProgressState(progress, 'capital-to-country')).toBe('weak')
  })
})
