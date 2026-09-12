// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionLearningFrame } from '@/features/world-countries/maps/subregionLearningFrames'
import { CountryLearningMap, getCountryLearningMapDefaultZoomIds } from './CountryLearningMap'

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
    expect(getCountryLearningMapDefaultZoomIds('Oceania', ['Australia', 'Fiji'])).toEqual([])
  })

  it('zooms other Continents to the selected Country scope', () => {
    const scopeIds = ['Norway', 'Sweden']
    expect(getCountryLearningMapDefaultZoomIds('Europe', scopeIds)).toBe(scopeIds)
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
      camera: { kind: 'country-bounds', countryIds: ['Norway', 'Sweden'] },
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
      camera: { kind: 'country-bounds', countryIds: ['Norway'] },
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

  it('passes neutral Learning patterns through the declarative map boundary', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const pattern = { kind: 'diagonal' as const, baseColor: '#4a4742', lineColor: '#d6c7ad' }

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway],
        countryPatternsById: new Map([['NO', pattern]]),
        ariaLabel: 'Learning map',
      }))
    })

    expect(mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0].countryPatterns).toEqual([['Norway', pattern]])
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

  it('supports explicit visibility and Country-fit camera intent without task assistance', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway, sweden],
        visibleCountryIds: [norway.id],
        cameraIntent: { kind: 'fit-countries', countryIds: [norway.id] },
        ariaLabel: 'Isolated Country shape',
      }))
    })

    const isolatedProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(isolatedProps).toMatchObject({
      hiddenIds: ['Sweden'],
      camera: { kind: 'country-bounds', countryIds: ['Norway'] },
      taskAssistance: null,
    })

    act(() => {
      root?.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway, sweden],
        visibleCountryIds: [norway.id, sweden.id],
        cameraIntent: { kind: 'fit-countries', countryIds: [norway.id, sweden.id] },
        highlightedCountryId: norway.id,
        ariaLabel: 'Country subregion context',
      }))
    })

    const contextProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(contextProps).toMatchObject({ hiddenIds: [], camera: { kind: 'country-bounds', countryIds: ['Norway', 'Sweden'] }, highlightedIds: ['Norway'] })
  })

  it('resolves a stable authored Subregion frame independently of the presented target', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const frame = getSubregionLearningFrame('northern-europe')!

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway, sweden],
        cameraIntent: { kind: 'subregion-learning', subregionId: 'northern-europe' },
        highlightedCountryId: norway.id,
        ariaLabel: 'Learning map',
      }))
    })
    const firstProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(firstProps.camera).toEqual({ kind: 'view-box', bounds: frame.bounds })

    act(() => {
      root?.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [norway, sweden],
        cameraIntent: { kind: 'subregion-learning', subregionId: 'northern-europe' },
        highlightedCountryId: sweden.id,
        ariaLabel: 'Learning map',
      }))
    })
    const secondProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(secondProps.camera).toBe(firstProps.camera)
  })

  it('falls back to the complete map when a frame cannot apply to the active regional map', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Asia',
        scopeCountries: [norway],
        cameraIntent: { kind: 'subregion-learning', subregionId: 'northern-europe' },
        ariaLabel: 'Fallback map',
      }))
    })

    const latestProps = mapProps.mock.calls[mapProps.mock.calls.length - 1]?.[0]
    expect(latestProps.camera).toEqual({ kind: 'default' })
  })
})
