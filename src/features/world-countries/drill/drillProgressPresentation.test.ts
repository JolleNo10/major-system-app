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
) {
  return deriveWorldCountriesRecallProgress({ countryIds: ['NO'], skills: [skill] }, [{
    itemId: recallTargetIdFor('NO', skill),
    at: 1,
    ok: false,
    ms: 500,
    evidenceKind,
  }])
}

describe('World Countries Drill map precedence', () => {
  it('uses Subregion Memo readiness before relevant evidence exists', () => {
    const colors = createColors('countries', new Map(), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
    ])
    expect(colors.get('NO')).toBe('#c026d3')
  })

  it('uses only the selected perspective evidence', () => {
    const colors = createColors('countries', progressFor('country-to-capital'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#7c3aed')

    const capitalColors = createColors('capitals', progressFor('country-to-capital'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(capitalColors.get('NO')).toBe('#dc2626')
  })

  it('activates Countries + Capitals after either core skill has evidence', () => {
    const colors = createColors('countries-capitals', progressFor('location-to-country'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#dc2626')
  })

  it('uses the Capital → Country perspective for Countries from Capitals', () => {
    const colors = createColors('countries-from-capitals', progressFor('capital-to-country'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#dc2626')
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
    expect(colors.get('NO')).toBe('#d97706')
  })

  it('describes fallback readiness and evidence-based Drill state without relying on color', () => {
    const readiness = createDescriptions('countries', new Map(), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(readiness.get('NO')).toBe('Memo readiness: Countries memoed. Countries Memo is complete; Capital Memo is incomplete.')

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
