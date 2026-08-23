// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import {
  buildCapitalAuthoringStaticMapUrl,
  CapitalAuthoringGoogleMap,
  getCapitalAuthoringGoogleMapOptions,
} from './CapitalAuthoringGoogleMap'
import { countries } from '@/features/world-countries/data/countries'

const osloReference = {
  countryId: 'NO',
  capital: { lat: 59.91273, lon: 10.74609 },
} as const

let root: Root | null = null
let mount: HTMLDivElement | null = null

beforeEach(() => {
  mount = document.createElement('div')
  document.body.append(mount)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  mount?.remove()
  mount = null
  vi.unstubAllEnvs()
  Reflect.deleteProperty(window, 'google')
})

describe('capital authoring Google reference map', () => {
  it('centers and pins the map with the checked-in capital coordinates', () => {
    const options = getCapitalAuthoringGoogleMapOptions(osloReference)

    expect(options.center).toEqual({ lat: 59.91273, lng: 10.74609 })
    expect(options.zoom).toBe(5)
    expect(options.zoomControl).toBe(true)
  })

  it('keeps the reference presentation focused on geography rather than map clutter', () => {
    const options = getCapitalAuthoringGoogleMapOptions(osloReference)
    const styles = JSON.stringify(options.styles)

    expect(options.mapTypeControl).toBe(false)
    expect(options.streetViewControl).toBe(false)
    expect(options.fullscreenControl).toBe(false)
    expect(styles).toContain('poi')
    expect(styles).toContain('transit')
    expect(styles).toContain('administrative.locality')
  })

  it('passes the current capital coordinates to the Google map and marker', async () => {
    const norway = countries.find(country => country.id === 'NO')!
    const mapOptions: Record<string, unknown>[] = []
    const markerOptions: Record<string, unknown>[] = []
    const fakeMap = vi.fn((_element: HTMLElement, options: Record<string, unknown>) => {
      mapOptions.push(options)
      return { setCenter: vi.fn(), setZoom: vi.fn() }
    })
    const fakeMarker = vi.fn((options: Record<string, unknown>) => {
      markerOptions.push(options)
      return { setMap: vi.fn(), setPosition: vi.fn(), setTitle: vi.fn() }
    })
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: { maps: { Map: fakeMap, Marker: fakeMarker } },
    })
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key')

    await act(async () => {
      root = createRoot(mount as HTMLDivElement)
      root.render(createElement(CapitalAuthoringGoogleMap, {
        country: norway,
        reference: osloReference,
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mapOptions[0]?.center).toEqual({ lat: 59.91273, lng: 10.74609 })
    expect(markerOptions[0]?.position).toEqual({ lat: 59.91273, lng: 10.74609 })
    expect(markerOptions[0]?.title).toBe('Oslo, Norway')
  })

  it('uses the static-key fallback without creating a JavaScript API script', async () => {
    const norway = countries.find(country => country.id === 'NO')!
    vi.stubEnv('VITE_GOOGLE_MAPS_STATIC_API_KEY', 'static-key')

    await act(async () => {
      root = createRoot(mount as HTMLDivElement)
      root.render(createElement(CapitalAuthoringGoogleMap, {
        country: norway,
        reference: osloReference,
      }))
      await Promise.resolve()
    })

    const image = mount?.querySelector<HTMLImageElement>('[data-capital-authoring-reference-static-map]')
    expect(image).not.toBeNull()
    expect(image?.src).toContain('key=static-key')
    expect(document.querySelector('script[data-capital-authoring-google-maps]')).toBeNull()
    expect(mount?.querySelector('[aria-label="Zoom in reference map"]')).not.toBeNull()
    expect(mount?.querySelector('[aria-label="Zoom out reference map"]')).not.toBeNull()

    const beforeZoom = image?.src
    await act(async () => {
      mount?.querySelector<HTMLButtonElement>('[aria-label="Zoom in reference map"]')?.click()
    })
    expect(image?.src).not.toBe(beforeZoom)
    expect(image?.src).toContain('zoom=6')
  })

  it('uses only the JavaScript key for the interactive loader when both keys exist', async () => {
    const norway = countries.find(country => country.id === 'NO')!
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'javascript-key')
    vi.stubEnv('VITE_GOOGLE_MAPS_STATIC_API_KEY', 'static-key')

    await act(async () => {
      root = createRoot(mount as HTMLDivElement)
      root.render(createElement(CapitalAuthoringGoogleMap, {
        country: norway,
        reference: osloReference,
      }))
      await Promise.resolve()
    })
    const script = document.querySelector<HTMLScriptElement>('script[data-capital-authoring-google-maps]')
    expect(script?.src).toContain('key=javascript-key')
    expect(script?.src).not.toContain('static-key')
    await act(async () => {
      script?.dispatchEvent(new Event('error'))
      await Promise.resolve()
    })
  })

  it('keeps the interactive map as the preferred mode when both keys exist', async () => {
    const norway = countries.find(country => country.id === 'NO')!
    const fakeMap = vi.fn(() => ({ setCenter: vi.fn(), setZoom: vi.fn() }))
    const fakeMarker = vi.fn(() => ({ setMap: vi.fn(), setPosition: vi.fn(), setTitle: vi.fn() }))
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: { maps: { Map: fakeMap, Marker: fakeMarker } },
    })
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'javascript-key')
    vi.stubEnv('VITE_GOOGLE_MAPS_STATIC_API_KEY', 'static-key')

    await act(async () => {
      root = createRoot(mount as HTMLDivElement)
      root.render(createElement(CapitalAuthoringGoogleMap, {
        country: norway,
        reference: osloReference,
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fakeMap).toHaveBeenCalled()
    expect(mount?.querySelector('[data-capital-authoring-reference-static-map]')).toBeNull()
  })

  it('shows the missing configuration instead of a misleading generic failure', async () => {
    const norway = countries.find(country => country.id === 'NO')!
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '')
    vi.stubEnv('VITE_GOOGLE_MAPS_STATIC_API_KEY', '')

    await act(async () => {
      root = createRoot(mount as HTMLDivElement)
      root.render(createElement(CapitalAuthoringGoogleMap, {
        country: norway,
        reference: osloReference,
      }))
      await Promise.resolve()
    })

    expect(mount?.textContent).toContain('VITE_GOOGLE_MAPS_API_KEY')
    expect(mount?.textContent).toContain('VITE_GOOGLE_MAPS_STATIC_API_KEY')
  })

  it('removes a failed JavaScript loader script so a later mount can retry', async () => {
    const norway = countries.find(country => country.id === 'NO')!
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'javascript-key')

    await act(async () => {
      root = createRoot(mount as HTMLDivElement)
      root.render(createElement(CapitalAuthoringGoogleMap, {
        country: norway,
        reference: osloReference,
      }))
      await Promise.resolve()
    })
    const failedScript = document.querySelector<HTMLScriptElement>('script[data-capital-authoring-google-maps]')
    expect(failedScript?.src).toContain('key=javascript-key')

    await act(async () => {
      failedScript?.dispatchEvent(new Event('error'))
      await Promise.resolve()
    })
    expect(document.querySelector('script[data-capital-authoring-google-maps]')).toBeNull()

    const fakeMap = vi.fn(() => ({ setCenter: vi.fn(), setZoom: vi.fn() }))
    const fakeMarker = vi.fn(() => ({ setMap: vi.fn(), setPosition: vi.fn(), setTitle: vi.fn() }))
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: { maps: { Map: fakeMap, Marker: fakeMarker } },
    })
    await act(async () => {
      root?.unmount()
      root = createRoot(mount as HTMLDivElement)
      root.render(createElement(CapitalAuthoringGoogleMap, {
        country: norway,
        reference: osloReference,
      }))
      await Promise.resolve()
    })
    expect(fakeMap).toHaveBeenCalled()
  })

  it('builds the static reference from the same capital coordinate and marker', () => {
    const url = buildCapitalAuthoringStaticMapUrl(osloReference, 'static-key', 5)

    expect(url).toContain('center=59.91273%2C10.74609')
    expect(url).toContain('markers=color%3Ared%7Clabel%3AC%7C59.91273%2C10.74609')
    expect(url).toContain('style=feature%3Apoi%7Cvisibility%3Aoff')
  })
})
