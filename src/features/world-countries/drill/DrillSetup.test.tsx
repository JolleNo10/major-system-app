// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDrillSelection } from './drillSelection'
import { DrillSetup } from './DrillSetup'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: useRailsMock,
}))

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: () => createElement('div', { 'data-testid': 'geography-map' }),
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

describe('DrillSetup rail presentation', () => {
  it('publishes geographic scope on the left and drill controls on the right', async () => {
    const onSelectionChange = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'continent',
        selection: createDrillSelection('Europe', ['northern-europe']),
        mode: 'countries',
        onSelectionChange,
        onModeChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })

    expect(mount.querySelector('[aria-label="Drill setup summary"]')).not.toBeNull()
    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode; right: ReactNode }
    await act(async () => {
      root?.render(createElement('div', null, railConfig.left, railConfig.right))
    })

    expect(mount.textContent).toContain('Entire Continent')
    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).toContain('Recall mode')
    expect(mount.textContent).toContain('Start Drill')

    const entireContinentButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Entire Continent'))
    await act(async () => entireContinentButton?.click())
    expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({
      continent: 'Europe',
      subregionIds: expect.arrayContaining(['northern-europe', 'western-europe']),
    }))
  })

  it('publishes World Continent navigation in the geography rail', async () => {
    const onSelectContinent = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'world',
        selection: createDrillSelection('Europe'),
        mode: 'countries',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent,
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    await act(async () => root?.render(railConfig.left))
    const europeButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Europe'))
    await act(async () => europeButton?.click())
    expect(onSelectContinent).toHaveBeenCalledWith('Europe')
  })
})
