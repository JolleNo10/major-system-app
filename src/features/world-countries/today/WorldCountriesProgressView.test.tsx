// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { deriveWorldCountriesScopeProgressForCountries } from '@/features/world-countries/learning/scopeProgress'
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

function renderProgress(scopeLabel: 'World' | Continent, scopeCountries: typeof countries) {
  const recallProgress = deriveWorldCountriesRecallProgress({
    countryIds: scopeCountries.map(country => country.id),
    skills: ['location-to-country', 'country-to-capital'],
  }, [])
  const progress = deriveWorldCountriesScopeProgressForCountries(
    scopeLabel === 'World' ? 'world' : `continent:${scopeLabel}`,
    scopeCountries,
    recallProgress,
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
      learningStates: [],
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
    expect(mount.textContent).toContain('countries complete')
    expect(mount.textContent).toContain('regions with complete recall')
    expect(mount.textContent).toContain('Unpractised')
    expect(mount.querySelector('[aria-label="Africa core recall distribution"]')).not.toBeNull()
    expect(mount.textContent).not.toContain('Northern Europe')
  })

  it('summarizes Continent progress by Subregion', () => {
    const scopeCountries = countries.filter(country => country.continent === 'Europe')
    const mount = renderProgress('Europe', scopeCountries)

    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).toContain('Western Europe')
    expect(mount.textContent).toContain('Journey')
    expect(mount.textContent).toContain('Meet the countries')
    expect(mount.querySelector('[aria-label="Northern Europe core recall distribution"]')).not.toBeNull()
    expect(mount.textContent).not.toContain('Africa')
  })
})
