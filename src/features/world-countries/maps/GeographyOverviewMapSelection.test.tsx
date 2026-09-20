// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { GeographyOverviewMap } from './GeographyOverviewMap'

/**
 * Country selection is only observable through the presentation the map hands
 * the view, and jsdom never completes real SVG discovery, so this file stubs
 * the view. It lives apart from `GeographyOverviewMap.test.tsx`, which needs
 * the real one to assert rendered geometry.
 */
const viewProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
vi.mock('./SvgMapView', () => ({
  SvgMapView: (props: Record<string, unknown>) => {
    viewProps.current = props
    return createElement('div')
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); viewProps.current = null })

const nordics = countries.filter(country => country.id === 'NO' || country.id === 'SE')

async function renderMap(props: Record<string, unknown>) {
  const mount = document.createElement('div')
  document.body.append(mount)
  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(GeographyOverviewMap, { ariaLabel: 'map', countryPopulation: nordics, ...props } as never))
    await Promise.resolve()
  })
  const onCountriesLoaded = viewProps.current?.onCountriesLoaded as ((loaded: readonly { id: string }[]) => void) | undefined
  await act(async () => onCountriesLoaded?.([{ id: 'Norway' }, { id: 'Sweden' }]))
  return viewProps.current
}

describe('GeographyOverviewMap Country selection', () => {
  it.each([
    ['a Continent map', { level: 'continent', continent: 'Europe' }],
    ['the World map', { level: 'world' }],
  ])('emphasises the selected Countries on %s', async (_name, levelProps) => {
    const props = await renderMap({ ...levelProps, selectedCountryIds: ['NO'] })

    // Everything outside the selection is muted; the selection itself is not.
    expect(props?.mutedIds).toEqual(['Sweden'])
  })

  it('mutes nothing when no Country selection is supplied', async () => {
    const props = await renderMap({ level: 'world' })

    expect(props?.mutedIds).toEqual([])
  })
})
