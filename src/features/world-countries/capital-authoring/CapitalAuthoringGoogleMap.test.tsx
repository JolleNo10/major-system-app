// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { CapitalAuthoringGoogleMap, getCapitalAuthoringGoogleMapOptions } from './CapitalAuthoringGoogleMap'
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
})
