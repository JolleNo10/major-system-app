// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { deriveWorldCountriesScopeProgressForCountries } from '@/features/world-countries/learning/scopeProgress'
import { createWorldCountriesEstablishedLearningReadinessByCountry } from '@/features/world-countries/learning/learningReadiness'
import { WorldCountriesProgressView } from './WorldCountriesProgressView'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  useRailsMock.mockClear()
  document.body.replaceChildren()
})

function renderProgress(
  scopeLabel: 'World' | Continent,
  scopeCountries: typeof countries,
  learningStates: readonly { subregionId: typeof countries[number]['subregionId']; countriesLearnedAt?: number; capitalsLearnedAt?: number }[] = [],
  attempts: readonly { itemId: string; at: number; ok: boolean; ms: number; evidenceKind: 'recall'; localDate: string }[] = [],
) {
  const recallProgress = deriveWorldCountriesRecallProgress({
    countryIds: scopeCountries.map(country => country.id),
    skills: ['location-to-country', 'country-to-capital'],
  }, attempts.map(attempt => ({ attemptType: 'review' as const, ...attempt })))
  const progress = deriveWorldCountriesScopeProgressForCountries(
    scopeLabel === 'World' ? 'world' : `continent:${scopeLabel}`,
    scopeCountries,
    recallProgress,
    createWorldCountriesEstablishedLearningReadinessByCountry(scopeCountries, learningStates, recallProgress),
  )
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(WorldCountriesProgressView, {
      scopeLabel,
      scopeContinent: scopeLabel === 'World' ? undefined : scopeLabel,
      scopeCountries,
      progress,
      recallProgress,
      learningStates,
      onBack: vi.fn(),
    }))
  })
  return mount
}

describe('World Countries progress hierarchy', () => {
  it('summarizes World progress by Continent', () => {
    const scopeCountries = countries.filter(country => country.continent === 'Africa' || country.continent === 'Europe')
    const mount = renderProgress('World', scopeCountries)

    expect(mount.textContent).toContain('Africa')
    expect(mount.textContent).toContain('Europe')
    expect(mount.textContent).toContain('Countries fully mastered')
    expect(mount.textContent).toContain('regions with complete recall')
    expect(mount.textContent).toContain('Not learned')
    expect(mount.textContent).not.toContain('core recall distribution')
    expect(mount.querySelector('[data-testid="world-mastery-summary"]')).not.toBeNull()
    expect(mount.querySelector('[aria-label="Country recall distribution"]')).not.toBeNull()
    expect(mount.textContent).not.toContain('Northern Europe')
  })

  it('summarizes Continent progress by Subregion', () => {
    const scopeCountries = countries.filter(country => country.continent === 'Europe')
    const mount = renderProgress('Europe', scopeCountries)

    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).toContain('Western Europe')
    expect(mount.textContent).toContain('Journey')
    expect(mount.textContent).toContain('Meet the countries')
    expect(mount.querySelector('[aria-label="Country recall distribution"]')).not.toBeNull()
    expect(mount.textContent).not.toContain('Africa')
  })

  it('separates learned Journey completion from developing Mastery', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const mount = renderProgress('Europe', [northern], [{ subregionId: northern.subregionId, countriesLearnedAt: 1, capitalsLearnedAt: 2 }])

    expect(mount.textContent).toContain('Journey · Region learned')
    expect(mount.textContent).toContain('Mastery · Building')
    expect(mount.textContent).not.toContain('Put it all together')
    expect(mount.textContent).not.toContain('Master the region')
  })

  it('keeps in-progress Country recall wording in Progress', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const attempts = [{ itemId: `world-countries:location-to-country:${northern.id}`, at: 1, ok: false, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-10' }]
    const mount = renderProgress('Europe', [northern], [], attempts)

    expect(mount.textContent).toContain('Journey · Recall the countries')
  })

  it('shows Mastered separately when core recall is complete', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const attempts = [
      { itemId: `world-countries:location-to-country:${northern.id}`, at: 1, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
      { itemId: `world-countries:location-to-country:${northern.id}`, at: 2, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
      { itemId: `world-countries:location-to-country:${northern.id}`, at: 3, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-12' },
      { itemId: `world-countries:country-to-capital:${northern.id}`, at: 4, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
      { itemId: `world-countries:country-to-capital:${northern.id}`, at: 5, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-11' },
      { itemId: `world-countries:country-to-capital:${northern.id}`, at: 6, ok: true, ms: 100, evidenceKind: 'recall' as const, localDate: '2026-08-12' },
    ]
    const mount = renderProgress('Europe', [northern], [{ subregionId: northern.subregionId, countriesLearnedAt: 1, capitalsLearnedAt: 2 }], attempts)

    expect(mount.textContent).toContain('Journey · Region learned')
    expect(mount.textContent).toContain('Mastery · Mastered')
  })

  it('reports each recall ladder against its own Learning layer', () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const mount = renderProgress('Europe', [northern], [], [])
    expect(mount.querySelector('[aria-label="Country recall distribution"]')).not.toBeNull()
    expect(mount.querySelector('[aria-label="Capital recall distribution"]')).not.toBeNull()
    // Nothing is learned, so neither ladder can claim recall health yet.
    expect(mount.textContent).toContain('Not learned 1')
    expect(mount.textContent).not.toContain('Learned 1')

    // Learning the Countries layer moves only the Country ladder off the floor.
    const countriesOnly = renderProgress('Europe', [northern], [{ subregionId: northern.subregionId, countriesLearnedAt: 1 }], [])
    const countryTrack = countriesOnly.querySelector('[aria-label="Country recall distribution"]')
    const capitalTrack = countriesOnly.querySelector('[aria-label="Capital recall distribution"]')
    expect(countryTrack?.textContent).toContain('Learned 1')
    expect(capitalTrack?.textContent).toContain('Not learned 1')
  })

  it('headlines the highest reached rung while keeping strict overlap separate', () => {
    const scopeCountries = countries.filter(country => ['NO', 'SE', 'DK', 'FI'].includes(country.id))
    const attempts = scopeCountries.flatMap((country, countryIndex) => {
      const location = countryIndex < 3 ? ['location-to-country'] : []
      const capital = countryIndex < 2 ? ['country-to-capital'] : []
      return [...location, ...capital].flatMap(skill => [1, 2, 3].map((day, index) => ({
        itemId: `world-countries:${skill}:${country.id}`,
        at: countryIndex * 100 + day + index,
        ok: true,
        ms: 100,
        evidenceKind: 'recall' as const,
        localDate: `2026-08-${String(day).padStart(2, '0')}`,
      })))
    })
    const mount = renderProgress(
      'World',
      scopeCountries,
      [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
      attempts,
    )
    expect(mount.querySelector('[data-testid="world-mastery-summary"]')?.textContent).toContain('Mastered 50%')
    expect(mount.querySelector('[data-testid="world-mastery-summary"]')?.textContent).toContain('2 / 4 Countries fully mastered')
    expect(mount.querySelectorAll('[data-recall-track]')).toHaveLength(2 * 2)
    expect(mount.querySelectorAll('[data-recall-track]')).toHaveLength(4)
  })
})
