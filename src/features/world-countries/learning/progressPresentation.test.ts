import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress } from './recallProgress'
import {
  getCountryProgressColor,
  getCountryProgressState,
  getWorldCountriesProgressLegend,
} from './progressPresentation'
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
    expect(getCountryProgressColor('unpractised')).toBe('#b45309')
    expect(getCountryProgressColor('weak')).toBe('#d97706')
    expect(getCountryProgressColor('developing')).toBe('#d9ad32')
    expect(getCountryProgressColor('strong')).toBe('#69a95d')
    expect(getCountryProgressColor('complete')).toBe('#16834f')
    expect(getCountryProgressColor('mastered')).toBe('#16834f')
    expect(getWorldCountriesProgressLegend('core')).toBe('Early recall · Weak · Developing · Strong · Mastered')
    expect(getWorldCountriesProgressLegend('skill')).toBe('Early recall · Weak · Developing · Strong · Mastered')
  })
})
