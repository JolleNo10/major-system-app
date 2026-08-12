// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { getContinentHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { ContinentOverviewRails, WorldOverviewRails } from './WorldCountriesPrepareRails'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: useRailsMock,
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

describe('World Countries Prepare hierarchy rails', () => {
  it('synchronizes mouse and keyboard hover without using aria-current', async () => {
    const onHoverGroup = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldOverviewRails, {
        continents: ['Europe'],
        learningStates: [],
        hoveredGroupId: null,
        onSelectContinent: vi.fn(),
        onHoverGroup,
        onEditOrder: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    await act(async () => root?.render(railConfig.left))
    expect(mount.textContent).not.toContain('World Prepare progress')
    const button = [...mount.querySelectorAll('button')].find(candidate => candidate.textContent?.includes('Europe'))
    expect(button?.hasAttribute('aria-current')).toBe(false)
    await act(async () => button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    expect(onHoverGroup).toHaveBeenLastCalledWith(getContinentHoverGroupId('Europe'))
  })

  it('publishes subregion navigation and order controls for a Continent', async () => {
    const entry: Country = {
      id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe',
      subregionId: 'northern-europe', subregion: 'Northern Europe',
    }
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(ContinentOverviewRails, {
        continent: 'Europe',
        subregions: [{ id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' }],
        activeCountries: [entry],
        learningStates: [],
        hoveredGroupId: null,
        onWorld: vi.fn(),
        onSelectSubregion: vi.fn(),
        onHoverGroup: vi.fn(),
        onEditOrder: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    await act(async () => root?.render(railConfig.left))
    expect(mount.textContent).not.toContain('Continent Prepare progress')
    expect(mount.textContent).toContain('Edit order')
    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).not.toContain('Countries prepared')
    expect(mount.textContent).not.toContain('Countries + Capitals prepared')
    expect(mount.textContent).not.toContain('Not memoed')
  })
})
