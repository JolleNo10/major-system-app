import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress } from './recallProgress'
import {
  deriveWorldCountriesPrimaryStatus,
  deriveWorldCountriesPrimaryStatusCounts,
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
    expect(getCountryProgressColor('unpractised')).toBe('#90796F')
    expect(getCountryProgressColor('weak')).toBe('#BC9C7B')
    expect(getCountryProgressColor('developing')).toBe('#B5A678')
    expect(getCountryProgressColor('strong')).toBe('#769A70')
    expect(getCountryProgressColor('complete')).toBe('#3A7F70')
    expect(getCountryProgressColor('mastered')).toBe('#3A7F70')
    expect(getWorldCountriesProgressLegend('core')).toBe('Early recall · Weak · Developing · Strong · Mastered')
    expect(getWorldCountriesProgressLegend('skill')).toBe('Early recall · Weak · Developing · Strong · Mastered')
  })

  it('keeps Early recall in Recall health instead of relabelling Learning states', () => {
    const progress = deriveWorldCountriesCountryProgress('NO', new Map())
    expect(deriveWorldCountriesPrimaryStatus('NOT_LEARNED', progress)).toEqual({ kind: 'learning', readiness: 'NOT_LEARNED' })
    expect(deriveWorldCountriesPrimaryStatus('COUNTRIES_LEARNED', progress)).toEqual({ kind: 'learning', readiness: 'COUNTRIES_LEARNED' })
    expect(deriveWorldCountriesPrimaryStatus('COUNTRIES_AND_CAPITALS_LEARNED', progress)).toEqual({ kind: 'recall', state: 'unpractised' })

    const counts = deriveWorldCountriesPrimaryStatusCounts([{ id: 'NO', subregionId: 'northern-europe' }], [], new Map())
    expect(counts.find(entry => entry.state === 'NOT_LEARNED')).toMatchObject({ label: 'Not learned', count: 1 })
    expect(counts.find(entry => entry.state === 'unpractised')).toMatchObject({ label: 'Early recall', count: 0 })
  })
})
