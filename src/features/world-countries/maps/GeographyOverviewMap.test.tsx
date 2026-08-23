// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe.svg?raw'
import * as globeGeography from './globeGeography'
import { GeographyOverviewMap } from './GeographyOverviewMap'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function pointerEvent(type: string, clientX = 10, clientY = 10): Event {
  const event = new Event(type, { bubbles: true })
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    clientX: { value: clientX },
    clientY: { value: clientY },
  })
  return event
}

function failGlobe(): void {
  vi.spyOn(globeGeography, 'getGlobeGeography').mockImplementation(() => {
    throw new Error('test globe initialization failure')
  })
}

describe('GeographyOverviewMap', () => {
  it('keeps real tiny Countries at source size without task semantics', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => europeSvg })))
    const andorra = countries.find(country => country.id === 'AD')
    const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        countryPopulation: andorra ? [andorra] : [],
        onCountryClick: vi.fn(),
        ariaLabel: 'Europe geography map',
      }))
      await Promise.resolve(); await Promise.resolve()
    })

    expect(mount.querySelector('[data-svg-map-task-target]')).toBeNull()
    expect(mount.querySelector('[data-svg-map-tiny-marker]')).toBeNull()
  })

  it('reports grouped map hover and Country clicks through workflow-neutral callbacks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const onHoverGroup = vi.fn(); const onCountryClick = vi.fn(); const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', onHoverGroup, onCountryClick, ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    const path = mount.querySelector('[data-globe-country="NO"]')
    await act(async () => {
      path?.dispatchEvent(new Event('pointerover', { bubbles: true }))
      path?.dispatchEvent(pointerEvent('pointerdown'))
      mount.querySelector('svg')?.dispatchEvent(pointerEvent('pointerup'))
    })
    expect(onHoverGroup).toHaveBeenLastCalledWith('continent-europe')
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'NO', continent: 'Europe' }))
  })

  it('hides the embedded map credit without adding visible attribution', async () => {
    failGlobe()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><text id="credit-text-svg">Created with mapchart.net</text></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })

    expect((mount.querySelector('#credit-text-svg') as SVGTextElement | null)?.style.display).toBe('none')
    expect(mount.querySelector('a[href="https://www.mapchart.net/"]')).toBeNull()
  })

  it('preserves overview semantics when the globe falls back to SVG', async () => {
    failGlobe()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="France"/><text id="France_label">France</text></g></svg>' })))
    const onHoverGroup = vi.fn(); const onCountryClick = vi.fn(); const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'world',
        countryColorsById: new Map([['NO', '#71717a']]),
        hiddenCountryIds: ['FR'],
        onHoverGroup,
        onCountryClick,
        ariaLabel: 'World map',
      }))
      await Promise.resolve(); await Promise.resolve()
    })

    const norway = mount.querySelector('path#Norway')
    const france = mount.querySelector('path#France')
    expect((norway as SVGPathElement | null)?.style.fill).toBe('#71717a')
    expect((france as SVGPathElement | null)?.style.visibility).toBe('hidden')
    await act(async () => {
      norway?.dispatchEvent(new Event('pointerenter', { bubbles: true }))
      norway?.dispatchEvent(new Event('click', { bubbles: true }))
    })
    expect(onHoverGroup).toHaveBeenLastCalledWith('continent-europe')
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'NO', continent: 'Europe' }))
  })

  it('keeps unselected Subregions clickable while showing the current selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="France"/><text id="France_label">France</text></g></svg>' })))
    const onCountryClick = vi.fn(); const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        selectedSubregionIds: ['northern-europe'],
        onCountryClick,
        ariaLabel: 'Europe map',
      }))
      await Promise.resolve(); await Promise.resolve()
    })

    const path = mount.querySelector('[data-globe-country="FR"]')
    await act(async () => {
      path?.dispatchEvent(pointerEvent('pointerdown'))
      mount.querySelector('svg')?.dispatchEvent(pointerEvent('pointerup'))
    })
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'FR', subregionId: 'western-europe' }))
  })

  it('keeps readiness color separate from geographic selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => europeSvg })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'continent', continent: 'Europe', countryColorsById: new Map([['NO', '#71717a']]), countryAccessibleDescriptionsById: new Map([['NO', 'Learning Readiness: Countries learned.']]), ariaLabel: 'Europe map' })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('[data-globe-country="NO"]') as SVGPathElement | null)?.style.fill).toBe('#71717a')
    expect(mount.textContent).toContain('Learning Readiness')
    expect(mount.textContent).toContain('Countries learned')
  })

  it('prioritizes caller highlights over semantic Country colors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', highlightedCountryIds: ['NO'], countryColorsById: new Map([['NO', '#71717a']]), ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('[data-globe-country="NO"]') as SVGPathElement | null)?.style.fill).toBe('#71717a')
    expect((mount.querySelector('[data-globe-country="NO"]') as SVGPathElement | null)?.style.strokeWidth).toBe('1.8')
  })

  it('exposes non-color descriptions on individual Country maps', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(CountryLearningMap, { continent: 'Europe', scopeCountries: [{ id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' }], countryAccessibleDescriptionsById: new Map([['NO', 'Learning Readiness: Countries learned.']]), ariaLabel: 'Learning map' })); await Promise.resolve(); await Promise.resolve() })
    const map = mount.querySelector('[role="img"]'); const descriptionId = map?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy(); expect(mount.querySelector(`#${descriptionId}`)?.textContent).toContain('Norway: Learning Readiness: Countries learned.')
  })

  it('hides caller-selected Countries and omits their accessible descriptions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', hiddenCountryIds: ['NO'], countryAccessibleDescriptionsById: new Map([['NO', 'Hidden answer']]), ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('[data-globe-country="NO"]') as SVGPathElement | null)?.style.visibility).toBe('hidden')
    expect((mount.querySelector('[data-globe-country="NO"]') as SVGPathElement | null)?.style.pointerEvents).toBe('none')
    expect(mount.textContent).not.toContain('Norway: Hidden answer')
  })

  it('can keep the map mounted as a non-interactive geographic scaffold', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const onHoverGroup = vi.fn(); const onCountryClick = vi.fn(); const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', interactive: false, onHoverGroup, onCountryClick, ariaLabel: 'Active Recite map' })); await Promise.resolve(); await Promise.resolve() })
    const path = mount.querySelector('path#Norway')
    await act(async () => { path?.dispatchEvent(new Event('pointerenter', { bubbles: true })); path?.dispatchEvent(new Event('click', { bubbles: true })) })
    expect(onHoverGroup).not.toHaveBeenCalled()
    expect(onCountryClick).not.toHaveBeenCalled()
  })

  it('reports map readiness transitions to the caller', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const states: string[] = []; const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', onMapStateChange: state => states.push(state), ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    expect(states).toEqual(['loading', 'ready'])
  })
  it('applies a caller-owned Country hover to the mapped SVG path', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(CountryLearningMap, { continent: 'Europe', scopeCountries: [{ id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' }], hoveredCountryId: 'NO', ariaLabel: 'Learning map' })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#0f766e')
  })
})
