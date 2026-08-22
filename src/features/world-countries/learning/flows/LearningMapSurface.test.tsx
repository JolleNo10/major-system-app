// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { LearningMapSurface } from './LearningMapSurface'

const mapMounts = vi.hoisted(() => vi.fn())
const mapRenders = vi.hoisted(() => vi.fn())

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: (props: Record<string, unknown>) => {
    mapRenders(props)
    useEffect(() => {
      mapMounts()
    }, [])
    return createElement('div', { 'data-testid': 'country-learning-map' })
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const norway: Country = {
  id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}
const sweden: Country = {
  id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  mapMounts.mockReset()
  mapRenders.mockReset()
})

describe('LearningMapSurface continuity', () => {
  it('updates map presentation without remounting for an adjacent phase', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const renderSurface = (presentationKey: string, highlightedCountryId: string | null) => createElement(LearningMapSurface, {
      continent: 'Europe', scopeCountries: [norway], presentation: { ariaLabel: 'Learning map', highlightedCountryId },
      presentationKey, context: createElement('h1', null, presentationKey), children: createElement('p', null, 'Task'),
    })

    act(() => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, renderSurface('practice', 'NO')))
    })
    act(() => root?.render(createElement(PageLayoutProvider, null, renderSurface('ready', null))))

    expect(mapMounts).toHaveBeenCalledTimes(1)
    expect(mapRenders.mock.calls[mapRenders.mock.calls.length - 1]?.[0]).toMatchObject({ highlightedCountryId: null })
  })

  it('passes a wider viewport scope without changing the Countries presented by the map', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, createElement(LearningMapSurface, {
        continent: 'Europe',
        scopeCountries: [norway],
        presentation: { ariaLabel: 'Learning map', overviewCountries: [norway, sweden] },
        presentationKey: 'walkthrough',
        context: createElement('h1', null, 'Learning'),
        children: createElement('p', null, 'Task'),
      })))
    })

    expect(mapRenders.mock.calls[mapRenders.mock.calls.length - 1]?.[0]).toMatchObject({
      scopeCountries: [norway],
      overviewCountries: [norway, sweden],
    })
  })
})
