import { describe, expect, it } from 'vitest'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { recallTargetIdFor } from '@/features/world-countries/learning/recallTargets'
import { createDrillProgressColors, getDrillProgressLegendEntries } from './drillProgressPresentation'
import type { Country } from '@/features/world-countries/data/countries'

const norway: Country = {
  id: 'NO',
  country: 'Norway',
  capital: 'Oslo',
  continent: 'Europe',
  subregionId: 'northern-europe',
  subregion: 'Northern Europe',
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
    const colors = createDrillProgressColors('countries', [norway], new Map(), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 },
    ])
    expect(colors.get('NO')).toBe('#c026d3')
  })

  it('uses only the selected perspective evidence', () => {
    const colors = createDrillProgressColors('countries', [norway], progressFor('country-to-capital'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#7c3aed')

    const capitalColors = createDrillProgressColors('capitals', [norway], progressFor('country-to-capital'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(capitalColors.get('NO')).toBe('#dc2626')
  })

  it('activates Countries + Capitals after either core skill has evidence', () => {
    const colors = createDrillProgressColors('countries-capitals', [norway], progressFor('location-to-country'), [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#dc2626')
  })

  it('uses the Capital → Country perspective for Countries from Capitals', () => {
    const colors = createDrillProgressColors('countries-from-capitals', [norway], progressFor('capital-to-country'), [
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
    const colors = createDrillProgressColors('countries', [norway], progress, [
      { subregionId: 'northern-europe', countriesLearnedAt: 1 },
    ])
    expect(colors.get('NO')).toBe('#d97706')
  })

  it('keeps Drill legends separate from the three readiness states', () => {
    expect(getDrillProgressLegendEntries('countries').map(entry => entry.label)).toEqual([
      'Weak', 'Developing', 'Strong', 'Mastered',
    ])
  })
})
