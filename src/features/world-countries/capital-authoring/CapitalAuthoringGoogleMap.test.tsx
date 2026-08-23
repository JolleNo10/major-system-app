// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CapitalAuthoringGoogleMap, buildCapitalAuthoringGoogleMapUrl } from './CapitalAuthoringGoogleMap'
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
})

async function renderMap(reference = osloReference) {
  const norway = countries.find(country => country.id === 'NO')!

  await act(async () => {
    root = createRoot(mount as HTMLDivElement)
    root.render(createElement(CapitalAuthoringGoogleMap, {
      country: norway,
      reference,
    }))
    await Promise.resolve()
  })
}

describe('capital authoring Google reference map', () => {
  it('builds a no-key embedded map URL from the exact capital coordinates', () => {
    const url = buildCapitalAuthoringGoogleMapUrl(osloReference)
    const parsed = new URL(url)

    expect(parsed.origin).toBe('https://www.google.com')
    expect(parsed.pathname).toBe('/maps')
    expect(parsed.searchParams.get('q')).toBe('59.91273,10.74609')
    expect(parsed.searchParams.get('z')).toBe('5')
    expect(parsed.searchParams.get('output')).toBe('embed')
    expect(url).not.toContain('key=')
    expect(url).not.toContain('staticmap')
  })

  it('renders an interactive iframe without Google API configuration or injected scripts', async () => {
    await renderMap()

    const iframe = mount?.querySelector<HTMLIFrameElement>('[data-capital-authoring-reference-iframe]')
    expect(iframe).not.toBeNull()
    expect(iframe?.src).toBe(buildCapitalAuthoringGoogleMapUrl(osloReference))
    expect(iframe?.title).toBe('Google reference map for Norway and Oslo')
    expect(iframe?.getAttribute('loading')).toBe('lazy')
    expect(iframe?.getAttribute('allowfullscreen')).toBe('')
    expect(mount?.querySelector('script')).toBeNull()
    expect(mount?.querySelector('[data-capital-authoring-reference-static-map]')).toBeNull()
    expect(mount?.querySelector('[aria-label="Zoom in reference map"]')).toBeNull()
    expect(mount?.querySelector('[aria-label="Zoom out reference map"]')).toBeNull()
  })

  it('updates the iframe location when the current capital changes', async () => {
    const sweden = countries.find(country => country.id === 'SE')!
    await renderMap()

    const swedenReference = {
      countryId: 'SE',
      capital: { lat: 59.32938, lon: 18.06871 },
    } as const
    await act(async () => {
      root?.render(createElement(CapitalAuthoringGoogleMap, {
        country: sweden,
        reference: swedenReference,
      }))
      await Promise.resolve()
    })

    const iframe = mount?.querySelector<HTMLIFrameElement>('[data-capital-authoring-reference-iframe]')
    expect(iframe?.src).toBe(buildCapitalAuthoringGoogleMapUrl(swedenReference))
    expect(iframe?.title).toBe('Google reference map for Sweden and Stockholm')
  })

  it('shows only a concise generic message when the iframe fails', async () => {
    await renderMap()
    const iframe = mount?.querySelector<HTMLIFrameElement>('[data-capital-authoring-reference-iframe]')

    await act(async () => {
      iframe?.dispatchEvent(new Event('error'))
      await Promise.resolve()
    })

    expect(mount?.querySelector('[data-capital-authoring-reference-unavailable]')?.textContent).toBe('Google reference map could not be loaded.')
    expect(mount?.textContent).not.toContain('API key')
  })
})
