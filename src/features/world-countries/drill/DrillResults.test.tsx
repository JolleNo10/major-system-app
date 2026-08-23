// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DrillResults } from './DrillResults'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('./DrillResultsRails', () => ({ DrillResultsRails: () => null }))
vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({ CountryLearningMap: () => null }))
vi.mock('@/features/world-countries/learning/useWorldCountriesCountryColors', () => ({
  useWorldCountriesCountryColors: () => ({ recallProgress: undefined }),
}))
vi.mock('@/features/world-countries/WorldCountriesPopulationContext', () => ({
  useWorldCountriesPopulation: () => [],
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('World Countries Drill results', () => {
  it('provides a focused Run again action outside the responsive rail', () => {
    const mount = document.createElement('div')
    const onAgain = vi.fn()
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(DrillResults, {
        mode: 'countries',
        continent: 'Europe',
        scopeCountries: [],
        answers: [],
        onAgain,
        onChangeSetup: vi.fn(),
      }))
    })

    const runAgain = [...mount.querySelectorAll('button')].find(button => button.textContent === 'Run again')
    expect(document.activeElement).toBe(runAgain)
    act(() => runAgain?.click())
    expect(onAgain).toHaveBeenCalledOnce()
  })
})
