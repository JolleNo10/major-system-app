// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import * as globeGeography from './globeGeography'
import { OrthographicGlobe, type OrthographicGlobeProps } from './OrthographicGlobe'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

function pointerEvent(type: string, pointerId: number, clientX: number, clientY: number): Event {
  const event = new Event(type, { bubbles: true })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  })
  return event
}

function props(overrides: Partial<OrthographicGlobeProps> = {}): OrthographicGlobeProps {
  return {
    level: 'world',
    focusCountryIds: ['NO', 'BR'],
    focusKey: 'world',
    visibleCountryIds: ['NO', 'BR'],
    coloredCountryIds: [],
    countryColor: '#16a34a',
    highlightedCountryIds: [],
    hiddenCountryIds: [],
    mutedCountryIds: [],
    hoveredCountryIds: [],
    selectableCountryIds: ['NO', 'BR'],
    interactive: true,
    ariaLabel: 'World globe',
    ...overrides,
  }
}

describe('OrthographicGlobe', () => {
  it('reports readiness and maps caller semantic state to canonical Country paths', async () => {
    const states: string[] = []
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(OrthographicGlobe, props({
        countryColorsById: new Map([['NO', '#71717a']]),
        hiddenCountryIds: ['BR'],
        highlightedCountryIds: ['NO'],
        onStateChange: state => states.push(state),
      })))
      await Promise.resolve(); await Promise.resolve()
      await new Promise(resolve => setTimeout(resolve, 30))
      window.dispatchEvent(new Event('resize'))
      await new Promise(resolve => setTimeout(resolve, 30))
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
    })

    const norway = mount.querySelector('[data-globe-country="NO"]') as SVGPathElement | null
    const brazil = mount.querySelector('[data-globe-country="BR"]') as SVGPathElement | null
    expect(states).toEqual(['loading', 'ready'])
    expect(mount.querySelector('[data-globe-state="ready"]')).not.toBeNull()
    expect(norway).not.toBeNull()
    expect(norway?.style.fill).toBe('#71717a')
    expect(norway?.style.strokeWidth).toBe('1.8')
    expect(brazil?.style.visibility).toBe('hidden')
    expect(brazil?.style.pointerEvents).toBe('none')
  })

  it('dispatches a click without movement but never after a deliberate drag', async () => {
    const onCountryClick = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)
    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(OrthographicGlobe, props({ onCountryClick })))
      await Promise.resolve(); await Promise.resolve()
    })

    const norway = mount.querySelector('[data-globe-country="NO"]')
    const svg = mount.querySelector('svg')
    await act(async () => {
      norway?.dispatchEvent(pointerEvent('pointerdown', 1, 10, 10))
      svg?.dispatchEvent(pointerEvent('pointerup', 1, 10, 10))
      norway?.dispatchEvent(pointerEvent('pointerdown', 2, 10, 10))
      svg?.dispatchEvent(pointerEvent('pointermove', 2, 30, 10))
      svg?.dispatchEvent(pointerEvent('pointerup', 2, 30, 10))
    })

    expect(onCountryClick).toHaveBeenCalledTimes(1)
    expect(onCountryClick).toHaveBeenCalledWith('NO')
  })

  it('signals initialization failure for the overview boundary to select fallback', async () => {
    vi.spyOn(globeGeography, 'getGlobeGeography').mockImplementation(() => {
      throw new Error('broken bundled asset')
    })
    const onStateChange = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(OrthographicGlobe, props({ onStateChange })))
      await Promise.resolve(); await Promise.resolve()
    })

    expect(onStateChange).toHaveBeenLastCalledWith('error')
    expect(mount.querySelector('[data-globe-state="ready"]')).toBeNull()
    expect(countries.length).toBeGreaterThan(0)
  })
})
