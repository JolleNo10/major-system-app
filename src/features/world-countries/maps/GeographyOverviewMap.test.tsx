// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe.svg?raw'
import { GeographyOverviewMap } from './GeographyOverviewMap'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); vi.unstubAllGlobals() })

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
    const path = mount.querySelector('path#Norway')
    await act(async () => { path?.dispatchEvent(new Event('pointerenter', { bubbles: true })); path?.dispatchEvent(new Event('click', { bubbles: true })) })
    expect(onHoverGroup).toHaveBeenLastCalledWith('continent-europe')
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'NO', continent: 'Europe' }))
  })

  it('hides the embedded map credit without adding visible attribution', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><text id="credit-text-svg">Created with mapchart.net</text></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })

    expect((mount.querySelector('#credit-text-svg') as SVGTextElement | null)?.style.display).toBe('none')
    expect(mount.querySelector('a[href="https://www.mapchart.net/"]')).toBeNull()
  })

  it('keeps unselected Subregions clickable while showing the current selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="France"/><text id="France_label">France</text></g></svg>' })))
    const onHoverGroup = vi.fn(); const onCountryClick = vi.fn(); const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        selectedSubregionIds: ['northern-europe'],
        onHoverGroup,
        onCountryClick,
        ariaLabel: 'Europe map',
      }))
      await Promise.resolve(); await Promise.resolve()
    })

    await act(async () => { mount.querySelector('path#France')?.dispatchEvent(new Event('pointerenter', { bubbles: true })) })
    expect(onHoverGroup).toHaveBeenLastCalledWith('subregion-western-europe')
    expect(mount.querySelector('[data-svg-map-group-outline="subregion-western-europe"]')).not.toBeNull()
    await act(async () => { mount.querySelector('path#France')?.dispatchEvent(new Event('pointerleave', { bubbles: true })) })
    expect(onHoverGroup).toHaveBeenLastCalledWith(null)

    await act(async () => { mount.querySelector('path#France')?.dispatchEvent(new Event('click', { bubbles: true })) })
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'FR', subregionId: 'western-europe' }))
  })

  it('keeps a selected Subregion outline after hover ends', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="France"/><text id="France_label">France</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        selectedSubregionIds: ['northern-europe'],
        ariaLabel: 'Europe map',
      }))
      await Promise.resolve(); await Promise.resolve()
    })

    const selectedOutline = () => mount.querySelector('[data-svg-map-group-outline="subregion-northern-europe"]')
    expect(selectedOutline()).not.toBeNull()
    expect(mount.querySelector('feFlood')?.getAttribute('flood-color')).toBe('#22d3ee')

    const norway = mount.querySelector('path#Norway')
    await act(async () => { norway?.dispatchEvent(new Event('pointerenter', { bubbles: true })) })
    expect(selectedOutline()).not.toBeNull()
    await act(async () => { norway?.dispatchEvent(new Event('pointerleave', { bubbles: true })) })
    expect(selectedOutline()).not.toBeNull()
  })

  it('reveals member Country names for one selected Subregion only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="Sweden"/><text id="Sweden_label">Sweden</text></g><g><path id="France"/><text id="France_label">France</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'continent', continent: 'Europe', selectedSubregionIds: ['northern-europe'], ariaLabel: 'Europe map' })); await Promise.resolve(); await Promise.resolve() })

    expect((mount.querySelector('text#Norway_label') as SVGTextElement | null)?.style.display).toBe('inline')
    expect((mount.querySelector('text#Sweden_label') as SVGTextElement | null)?.style.display).toBe('inline')
    expect((mount.querySelector('text#France_label') as SVGTextElement | null)?.style.display).toBe('none')
  })

  it('does not auto-reveal all selected Country names for zero or multiple Subregions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="France"/><text id="France_label">France</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'continent', continent: 'Europe', selectedSubregionIds: [], ariaLabel: 'Europe map' })); await Promise.resolve(); await Promise.resolve() })

    const norway = mount.querySelector('text#Norway_label') as SVGTextElement | null
    const france = mount.querySelector('text#France_label') as SVGTextElement | null
    expect(norway?.style.display).toBe('none')
    expect(france?.style.display).toBe('none')

    await act(async () => { root?.render(createElement(GeographyOverviewMap, { level: 'continent', continent: 'Europe', selectedSubregionIds: ['northern-europe', 'western-europe'], ariaLabel: 'Europe map' })) })
    expect(norway?.style.display).toBe('none')
    expect(france?.style.display).toBe('none')
    expect(mount.querySelector('[data-svg-map-group-outline="subregion-northern-europe"]')).not.toBeNull()
    expect(mount.querySelector('[data-svg-map-group-outline="subregion-western-europe"]')).not.toBeNull()
  })

  it('preserves explicit Country names alongside and after automatic names', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="France"/><text id="France_label">France</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'continent', continent: 'Europe', selectedSubregionIds: ['northern-europe'], namedCountryIds: ['FR'], ariaLabel: 'Europe map' })); await Promise.resolve(); await Promise.resolve() })

    const norway = mount.querySelector('text#Norway_label') as SVGTextElement | null
    const france = mount.querySelector('text#France_label') as SVGTextElement | null
    expect(norway?.style.display).toBe('inline')
    expect(france?.style.display).toBe('inline')

    await act(async () => { root?.render(createElement(GeographyOverviewMap, { level: 'continent', continent: 'Europe', selectedSubregionIds: [], namedCountryIds: ['FR'], ariaLabel: 'Europe map' })) })
    expect(norway?.style.display).toBe('none')
    expect(france?.style.display).toBe('inline')
  })

  it('keeps readiness color separate from geographic selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => europeSvg })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'continent', continent: 'Europe', selectedSubregionIds: ['northern-europe'], countryColorsById: new Map([['NO', '#71717a']]), countryAccessibleDescriptionsById: new Map([['NO', 'Learning Readiness: Countries learned.']]), ariaLabel: 'Europe map' })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#71717a')
    expect(mount.textContent).toContain('Learning Readiness')
    expect(mount.textContent).toContain('Countries learned')
  })

  it('prioritizes caller highlights over semantic Country colors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', highlightedCountryIds: ['NO'], countryColorsById: new Map([['NO', '#71717a']]), ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#0891b2')
  })

  it('applies a caller-owned highlight fill without changing semantic Country colors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', highlightedCountryIds: ['NO'], highlightFill: '#8b5cf6', countryColorsById: new Map([['NO', '#71717a']]), ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#8b5cf6')
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
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.visibility).toBe('hidden')
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.pointerEvents).toBe('none')
    expect(mount.textContent).not.toContain('Norway: Hidden answer')
  })

  it('hides discovered geometry outside an explicitly restricted Country population', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="France"/><text id="France_label">France</text></g><g><path id="MapOnly_Territory"/><text id="MapOnly_Territory_label">Map-only territory</text></g></svg>' })))
    const norway = countries.find(country => country.id === 'NO')!
    const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'world',
        countryPopulation: [norway],
        hideCountriesOutsidePopulation: true,
        interactive: false,
        ariaLabel: 'World map',
      }))
      await Promise.resolve(); await Promise.resolve()
    })

    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.visibility).toBe('')
    for (const id of ['France', 'MapOnly_Territory']) {
      expect((mount.querySelector(`path#${id}`) as SVGPathElement | null)?.style.visibility).toBe('hidden')
      expect((mount.querySelector(`path#${id}`) as SVGPathElement | null)?.style.pointerEvents).toBe('none')
    }
  })

  it('fits an explicit Country zoom set even when a member Country is hidden', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="Sweden"/><text id="Sweden_label">Sweden</text></g></svg>' })))
    const svgElementPrototype = SVGElement.prototype as typeof SVGElement.prototype & { getBBox?: () => { x: number; y: number; width: number; height: number } }
    const previousGetBBox = svgElementPrototype.getBBox
    Object.defineProperty(svgElementPrototype, 'getBBox', {
      configurable: true,
      value(this: SVGElement) {
        return this.id === 'Norway'
          ? { x: 10, y: 20, width: 10, height: 10 }
          : { x: 100, y: 20, width: 10, height: 10 }
      },
    })
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', countryPopulation: [countries.find(country => country.id === 'NO')!, countries.find(country => country.id === 'SE')!], hiddenCountryIds: ['SE'], zoomCountryIds: ['NO', 'SE'], ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('-30 -20 180 90')
    expect((mount.querySelector('path#Sweden') as SVGPathElement | null)?.style.visibility).toBe('hidden')
    Object.defineProperty(svgElementPrototype, 'getBBox', { configurable: true, value: previousGetBBox })
  })

  it('translates a Country-identity neighbourhood intent into a target-centric map camera', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g><g><path id="Sweden"/><text id="Sweden_label">Sweden</text></g></svg>' })))
    const svgElementPrototype = SVGElement.prototype as typeof SVGElement.prototype & { getBBox?: () => { x: number; y: number; width: number; height: number } }
    const previousGetBBox = svgElementPrototype.getBBox
    Object.defineProperty(svgElementPrototype, 'getBBox', {
      configurable: true,
      value(this: SVGElement) {
        return this.id === 'Norway'
          ? { x: 80, y: 40, width: 8, height: 8 }
          : { x: -300, y: -100, width: 900, height: 500 }
      },
    })
    const norway = countries.find(country => country.id === 'NO')!
    const sweden = countries.find(country => country.id === 'SE')!
    const mount = document.createElement('div'); document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'world',
        countryPopulation: [norway, sweden],
        neighbourhoodZoom: { targetCountryId: norway.id, contextCountryIds: [sweden.id] },
        ariaLabel: 'World map',
      }))
      await Promise.resolve(); await Promise.resolve()
    })

    const viewBox = mount.querySelector('svg')?.getAttribute('viewBox')?.split(' ').map(Number) ?? []
    expect(viewBox[2]).toBeLessThan(200)
    expect(viewBox[0]).toBeLessThanOrEqual(80)
    expect((mount.querySelector('path#Sweden') as SVGPathElement | null)?.style.visibility).toBe('')
    Object.defineProperty(svgElementPrototype, 'getBBox', { configurable: true, value: previousGetBBox })
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
