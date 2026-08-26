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

describe('CountryLearningMap', () => {
  it('does not zoom Oceania to scattered microstates', () => {
    expect(getCountryLearningMapZoomIds('Oceania', ['Australia', 'Fiji'])).toEqual([])
  })

  it('zooms other Continents to the selected Country scope', () => {
    const scopeIds = ['Norway', 'Sweden']
    expect(getCountryLearningMapZoomIds('Europe', scopeIds)).toBe(scopeIds)
  })

  it('shows the full order-edit overview without deactivating its Countries, then restores the scope', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway],
        overviewCountries: [norway, sweden],
        highlightedCountryId: 'NO',
        hoveredCountryId: 'SE',
        showOrderNumbers: true,
        ariaLabel: 'Learning map',
      }))
    })

    const latestProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(latestProps).toMatchObject({
      zoomIds: ['Norway', 'Sweden'],
      highlightedIds: [],
      hoveredId: 'Sweden',
      namedIds: ['Norway', 'Sweden'],
      countryLabels: { Norway: '1. Norway', Sweden: '2. Sweden' },
      mutedIds: [],
    })

    act(() => {
      root?.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway],
        highlightedCountryId: 'NO',
        showOrderNumbers: true,
        ariaLabel: 'Learning map',
      }))
    })

    const restoredProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(restoredProps).toMatchObject({
      zoomIds: ['Norway'],
      highlightedIds: ['Norway'],
      hoveredId: null,
      namedIds: ['Norway'],
      countryLabels: { Norway: '1. Norway' },
      mutedIds: ['Sweden'],
    })
  })

  it('translates canonical task semantics at the map adapter boundary', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway],
        answerSelectionCountryIds: [norway.id],
        taskTargetCountryId: norway.id,
        ariaLabel: 'Task map',
      }))
    })

    const latestProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(latestProps.taskAssistance).toEqual({
      answerSelectionIds: ['Norway'],
      taskTargetId: 'Norway',
      learningAnchors: [],
    })
  })

  it.each([
    ['#0891b2'],
    ['#8b5cf6'],
  ] as const)('passes a caller-owned active task fill to map settings', (highlightFill) => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway],
        highlightedCountryId: norway.id,
        highlightFill,
        ariaLabel: 'Task map',
      }))
    })

    const latestProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(latestProps.settings).toMatchObject({ highlightFill })
  })

  it('supports explicit visibility and Country zoom without task assistance', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway, sweden],
        visibleCountryIds: [norway.id],
        zoomCountryIds: [norway.id],
        ariaLabel: 'Isolated Country shape',
      }))
    })

    const isolatedProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(isolatedProps).toMatchObject({
      hiddenIds: ['Sweden'],
      zoomIds: ['Norway'],
      taskAssistance: null,
    })

    act(() => {
      root?.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway, sweden],
        visibleCountryIds: [norway.id, sweden.id],
        zoomCountryIds: [norway.id, sweden.id],
        highlightedCountryId: norway.id,
        ariaLabel: 'Country subregion context',
      }))
    })

    const contextProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(contextProps).toMatchObject({ hiddenIds: [], zoomIds: ['Norway', 'Sweden'], highlightedIds: ['Norway'] })
  })
})
