// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap, getCountryLearningMapZoomIds } from './CountryLearningMap'

const mapProps = vi.hoisted(() => vi.fn())

vi.mock('@/features/world-countries/maps/SvgMapView', () => ({
  SvgMapView: (props: Record<string, unknown>) => {
    mapProps(props)
    useEffect(() => {
      const onCountriesLoaded = props.onCountriesLoaded as ((countries: readonly unknown[]) => void) | undefined
      onCountriesLoaded?.([
        { id: 'Norway', name: 'Norway', pathId: 'Norway', labelId: 'Norway_label' },
        { id: 'Sweden', name: 'Sweden', pathId: 'Sweden', labelId: 'Sweden_label' },
      ])
    }, [props.onCountriesLoaded])
    return createElement('div')
  },
}))

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
  mapProps.mockReset()
})

describe('getCountryLearningMapZoomIds', () => {
  it('does not zoom Oceania to scattered microstates', () => {
    expect(getCountryLearningMapZoomIds('Oceania', ['Australia', 'Fiji'])).toEqual([])
  })

  it('zooms other Continents to the selected Country scope', () => {
    const scopeIds = ['Norway', 'Sweden']
    expect(getCountryLearningMapZoomIds('Europe', scopeIds)).toBe(scopeIds)
  })

  it('uses wider Countries for the viewport while keeping the rendered scope narrow', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway],
        zoomCountries: [norway, sweden],
        ariaLabel: 'Learning map',
      }))
    })

    const latestProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(latestProps).toMatchObject({
      zoomIds: ['Norway', 'Sweden'],
      mutedIds: ['Sweden'],
    })
  })
})
