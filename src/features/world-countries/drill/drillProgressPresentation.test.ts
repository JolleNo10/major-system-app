import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { recallTargetIdFor } from '@/features/world-countries/learning/recallTargets'
import { createDrillProgressColors, createDrillProgressDescriptions, getDrillProgressLegendEntries } from './drillProgressPresentation'
import type { Country } from '@/features/world-countries/data/countries'

const norway: Country = {
  id: 'NO',
  country: 'Norway',
  capital: 'Oslo',
  continent: 'Europe',
  subregionId: 'northern-europe',
  subregion: 'Northern Europe',
}

function createColors(
  mode: Parameters<typeof createDrillProgressColors>[0]['mode'],
  recallProgress: ReturnType<typeof deriveWorldCountriesRecallProgress>,
  learningStates: readonly { subregionId: 'northern-europe'; countriesLearnedAt?: number; capitalsLearnedAt?: number }[] = [],
) {
  return createDrillProgressColors({ mode, scopeCountries: [norway], recallProgress, learningStates })
}

function createDescriptions(
  mode: Parameters<typeof createDrillProgressDescriptions>[0]['mode'],
  recallProgress: ReturnType<typeof deriveWorldCountriesRecallProgress>,
  learningStates: readonly { subregionId: 'northern-europe'; countriesLearnedAt?: number; capitalsLearnedAt?: number }[] = [],
) {
  return createDrillProgressDescriptions({ mode, scopeCountries: [norway], recallProgress, learningStates })
}

function progressFor(
  skill: 'location-to-country' | 'country-to-capital' | 'capital-to-country',
  evidenceKind: 'recall' | 'recognition' = 'recall',
  ok = false,
) {
  return deriveWorldCountriesRecallProgress({ countryIds: ['NO'], skills: [skill] }, [{
    itemId: recallTargetIdFor('NO', skill),
    at: 1,
    ok,
    ms: 500,
    evidenceKind,
  }])
}

describe('World Countries Drill map precedence', () => {
  it('uses Subregion Memo readiness before relevant evidence exists', () => {
    const colors = createColors('countries', new Map(), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
    ])
    expect(colors.get('NO')).toBe('#a1a1aa')
  })

  it('uses only the selected perspective evidence', () => {
    const colors = createColors('countries', progressFor('country-to-capital'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#71717a')

    const capitalColors = createColors('countries-from-capitals', progressFor('capital-to-country'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(capitalColors.get('NO')).toBe('#8a665b')
  })

  it('keeps Countries + Capitals at Learning Readiness until both core skills have evidence', () => {
    const colors = createColors('countries-capitals', progressFor('location-to-country', 'recall', true), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#71717a')
  })

  it('uses Countries + Capitals progress after both core skills have evidence', () => {
    const recallProgress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['location-to-country', 'country-to-capital'],
    }, [
      {
        itemId: recallTargetIdFor('NO', 'location-to-country'),
        at: 1,
        ok: true,
        ms: 500,
        evidenceKind: 'recall',
      },
      {
        itemId: recallTargetIdFor('NO', 'country-to-capital'),
        at: 2,
        ok: false,
        ms: 500,
        evidenceKind: 'recall',
      },
    ])
    const colors = createColors('countries-capitals', recallProgress, [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#8a665b')
  })

  it('uses the Capital → Country perspective for Countries from Capitals', () => {
    const colors = createColors('countries-from-capitals', progressFor('capital-to-country'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#8a665b')
  })

  it('activates Drill coloring for recognition evidence too', () => {
    const progress = deriveWorldCountriesRecallProgress({
      countryIds: ['NO'],
      skills: ['location-to-country'],
    }, [{
      itemId: recallTargetIdFor('NO', 'location-to-country'),
      at: 1,
      ok: true,
      ms: 500,
      evidenceKind: 'recognition',
    }])
    const colors = createColors('countries', progress, [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#a79566')
  })

  it('describes fallback readiness and evidence-based Drill state without relying on color', () => {
    const readiness = createDescriptions('countries', new Map(), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(readiness.get('NO')).toBe('Learning Readiness: Countries learned. Countries learning is complete; Capital learning is incomplete.')

    const drill = createDescriptions('countries', progressFor('location-to-country'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(drill.get('NO')).toBe('Drill proficiency: Weak.')
  })

  it('keeps Drill legends separate from the three readiness states', () => {
    expect(getDrillProgressLegendEntries('countries').map(entry => entry.label)).toEqual([
      'Weak', 'Developing', 'Strong', 'Mastered',
    ])
  })
})
