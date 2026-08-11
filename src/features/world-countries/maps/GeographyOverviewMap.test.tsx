// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrepareMap } from '@/features/world-countries/prepare/PrepareMap'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { countries } from '@/features/world-countries/data/countries'
import { WorldCountriesPopulationProvider } from '@/features/world-countries/worldCountriesPopulation'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe_names.svg?raw'
import { GeographyOverviewMap } from './GeographyOverviewMap'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('GeographyOverviewMap', () => {
  it('reports grouped map hover and Country clicks through its workflow-neutral callbacks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const onHoverGroup = vi.fn()
    const onCountryClick = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'world',
        onHoverGroup,
        onCountryClick,
        ariaLabel: 'World map',
    }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const path = mount.querySelector('path#Norway')
    expect(path).not.toBeNull()
    await act(async () => {
      path?.dispatchEvent(new Event('pointerenter', { bubbles: true }))
      path?.dispatchEvent(new Event('click', { bubbles: true }))
    })

    expect(onHoverGroup).toHaveBeenLastCalledWith('continent-europe')
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({
      id: 'NO',
      continent: 'Europe',
    }))
  })

  it('reports a Country click as its containing Subregion on a Continent map', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const onCountryClick = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        selectedSubregionIds: [],
        onCountryClick,
        ariaLabel: 'Europe map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    mount.querySelector('path#Norway')?.dispatchEvent(new Event('click', { bubbles: true }))
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({
      id: 'NO',
      subregionId: 'northern-europe',
    }))
  })

  it('keeps progress colors visible before any Subregion is selected', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        selectedSubregionIds: [],
        countryColorsById: new Map([['NO', '#16834f']]),
        ariaLabel: 'Europe map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#16834f')
  })

  it('mutes and deactivates Countries outside a hovered Subregion', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
          <g><path id="Germany"/><text id="Germany_label">Germany</text></g>
        </svg>`,
    })))
    const onHoverGroup = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        hoveredGroupId: 'subregion-northern-europe',
        onHoverGroup,
        ariaLabel: 'Europe Memo map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const norway = mount.querySelector('path#Norway') as SVGPathElement | null
    const germany = mount.querySelector('path#Germany') as SVGPathElement | null
    expect(norway?.style.fill).toBe('#0f766e')
    expect(germany?.style.fill).toBe('#303036')

    await act(async () => germany?.dispatchEvent(new Event('pointerenter', { bubbles: true })))
    expect(germany?.style.fill).toBe('#303036')
    expect(onHoverGroup).toHaveBeenLastCalledWith(null)
  })

  it('does not report clicks outside a hovered Subregion as Country selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
          <g><path id="Germany"/><text id="Germany_label">Germany</text></g>
        </svg>`,
    })))
    const onCountryClick = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        hoveredGroupId: 'subregion-northern-europe',
        onCountryClick,
        ariaLabel: 'Europe Memo map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => mount.querySelector('path#Germany')?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(onCountryClick).not.toHaveBeenCalled()

    await act(async () => mount.querySelector('path#Norway')?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'NO' }))
  })

  it('keeps inactive canonical Countries out of active map hover groups', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Greenland"/><text id="Greenland_label">Greenland</text></g>
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const onHoverGroup = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesPopulationProvider, {
        countries: countries.filter(country => country.id !== 'GL'),
        children: createElement(GeographyOverviewMap, {
          level: 'world',
          onHoverGroup,
          ariaLabel: 'World map',
        }),
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const greenland = mount.querySelector('path#Greenland') as SVGPathElement | null
    await act(async () => greenland?.dispatchEvent(new Event('pointerenter', { bubbles: true })))
    expect(onHoverGroup).not.toHaveBeenCalled()
    expect(greenland?.style.fill).toBe('#52525b')
  })

  it('applies the Subregion scope through the Memo Continent wrapper', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => europeSvg,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PrepareMap, {
        level: 'continent',
        continent: 'Europe',
        hoveredGroupId: 'subregion-northern-europe',
        memoReadinessColorsById: new Map([
          ['NO', '#71717a'],
          ['DE', '#a1a1aa'],
        ]),
        memoReadinessByCountryId: new Map(),
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#71717a')
    expect((mount.querySelector('path#Germany') as SVGPathElement | null)?.style.fill).toBe('#303036')
  })

  it('mutes and deactivates map paths outside the Continent scope', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => europeSvg,
    })))
    const onHoverGroup = vi.fn()
    const onCountryClick = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        onHoverGroup,
        onCountryClick,
        ariaLabel: 'Europe map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const germany = mount.querySelector('path#Germany') as SVGPathElement | null
    const turkey = mount.querySelector('path#Türkiye') as SVGPathElement | null
    expect(germany?.style.fill).toBe('#52525b')
    expect(turkey?.style.fill).toBe('#303036')

    await act(async () => turkey?.dispatchEvent(new Event('pointerenter', { bubbles: true })))
    await act(async () => turkey?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(turkey?.style.fill).toBe('#303036')
    expect(onHoverGroup).not.toHaveBeenCalled()
    expect(onCountryClick).not.toHaveBeenCalled()
  })

  it("preserves Memo's interactive treatment for map-only geography", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
          <g><path id="Greenland"/><text id="Greenland_label">Greenland</text></g>
          <g><path id="Western_Sahara"/><text id="Western_Sahara_label">Western Sahara</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PrepareMap, {
        level: 'world',
        memoReadinessColorsById: new Map(),
        memoReadinessByCountryId: new Map(),
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const greenland = mount.querySelector('path#Greenland') as SVGPathElement | null
    expect(greenland).not.toBeNull()
    expect(greenland?.style.fill).toBe('#52525b')

    await act(async () => greenland?.dispatchEvent(new Event('pointerenter', { bubbles: true })))
    expect(greenland?.style.fill).toBe('#0f766e')
  })

  it('renders all three Memo readiness states for Memo maps', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PrepareMap, {
        level: 'world',
        memoReadinessColorsById: new Map([['NO', '#71717a']]),
        memoReadinessByCountryId: new Map([['NO', 'COUNTRIES_MEMOED' as const]]),
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const legend = mount.querySelector('[aria-label="Memo readiness legend"]')
    expect(legend?.querySelectorAll('[data-progress-state]')).toHaveLength(3)
    expect(legend?.textContent).toContain('Not memoed')
    expect(legend?.textContent).toContain('Countries memoed')
    expect(legend?.textContent).toContain('Countries + Capitals memoed')
    expect(legend?.textContent).toContain('neutral outline marks temporary hover or navigation focus')
    expect(mount.textContent).toContain('Norway: Countries memoed')
    const map = mount.querySelector('[role="img"]')
    const descriptionId = map?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(mount.querySelector(`#${descriptionId}`)?.textContent).toContain('Norway: Countries memoed')
  })

  it('preserves a semantic Memo fill and adds a neutral outline on grouped hover', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PrepareMap, {
        level: 'world',
        memoReadinessColorsById: new Map([['NO', '#71717a']]),
        memoReadinessByCountryId: new Map([['NO', 'COUNTRIES_MEMOED' as const]]),
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const norway = mount.querySelector('path#Norway') as SVGPathElement | null
    expect(norway?.style.fill).toBe('#71717a')

    await act(async () => norway?.dispatchEvent(new Event('pointerenter', { bubbles: true })))

    expect(norway?.style.fill).toBe('#71717a')
    expect(norway?.style.stroke).toBe('')
    expect(mount.querySelector('[data-svg-map-group-outline="continent-europe"]')).not.toBeNull()
  })

  it('outlines a hovered geographic group as one boundary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
          <g><path id="Sweden"/><text id="Sweden_label">Sweden</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'world',
        hoveredGroupId: 'continent-europe',
        ariaLabel: 'World progress map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-svg-map-group-outline="continent-europe"]')).not.toBeNull()
    expect(mount.querySelector('[data-svg-map-group-outline="continent-europe"]')?.querySelectorAll('use')).toHaveLength(2)
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.stroke).toBe('')
    expect((mount.querySelector('path#Sweden') as SVGPathElement | null)?.style.stroke).toBe('')
  })

  it('renders caller-provided semantic Country progress colors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'world',
        countryColorsById: new Map([['NO', '#16834f']]),
        ariaLabel: 'World progress map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#16834f')
  })

  it('keeps progress fill separate from Drill geographic selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(GeographyOverviewMap, {
        level: 'continent',
        continent: 'Europe',
        selectedSubregionIds: ['northern-europe'],
        countryColorsById: new Map([['NO', '#16834f']]),
        ariaLabel: 'Europe Drill progress map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#16834f')
  })

  it('exposes non-color descriptions on individual Country maps', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [{
          id: 'NO',
          country: 'Norway',
          capital: 'Oslo',
          continent: 'Europe',
          subregionId: 'northern-europe',
          subregion: 'Northern Europe',
        }],
        countryAccessibleDescriptionsById: new Map([['NO', 'Memo readiness: Countries memoed.']]),
        ariaLabel: 'Drill results map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const map = mount.querySelector('[role="img"]')
    const descriptionId = map?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(mount.querySelector(`#${descriptionId}`)?.textContent).toContain('Norway: Memo readiness: Countries memoed.')
  })
})
