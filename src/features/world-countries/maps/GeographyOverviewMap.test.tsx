// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoMap } from '@/features/world-countries/memo/MemoMap'
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
      root.render(createElement(MemoMap, {
        level: 'world',
        memoedCountryIds: new Set<string>(),
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
        countryColorsById: new Map([['NO', '#16a34a']]),
        ariaLabel: 'World progress map',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#16a34a')
  })
})
