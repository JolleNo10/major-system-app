// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDrillSelection } from './drillSelection'
import { DrillSetup } from './DrillSetup'
import { getDrillProgressLegendEntries } from './drillProgressPresentation'
import { resetContinentSubregionOrder, setContinentSubregionOrder } from '@/features/world-countries/geography/continentMetadataStore'
import { resetWorldContinentOrder, setWorldContinentOrder } from '@/features/world-countries/geography/worldMetadataStore'
import { markSubregionCountriesLearned, markSubregionCapitalsLearned } from '@/features/world-countries/learning/subregionLearningStore'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())
const geographyOverviewMapMock = vi.hoisted(() => vi.fn())
const loadRecallProgressMock = vi.hoisted(() => vi.fn(async () => new Map()))

vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: useRailsMock,
}))

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: (props: Record<string, unknown>) => {
    geographyOverviewMapMock(props)
    return createElement('div', { 'data-testid': 'geography-map' })
  },
}))

vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>(),
  loadWorldCountriesRecallProgress: loadRecallProgressMock,
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  resetContinentSubregionOrder('Europe')
  resetWorldContinentOrder()
  useRailsMock.mockReset()
  geographyOverviewMapMock.mockReset()
  loadRecallProgressMock.mockClear()
  localStorage.clear()
})

describe('DrillSetup rail presentation', () => {
  it('shows the state-driven primary action above applicable guided reviews', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onGuidedAction = vi.fn()

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'continent',
        selection: createDrillSelection('Europe', ['northern-europe']),
        mode: 'countries',
        order: 'ordered',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onOrderChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        onGuidedAction,
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    await act(async () => root?.render(railConfig.right))
    expect(mount.textContent).toContain('Learn Countries')
    expect(mount.textContent).toContain('Drill')
    expect(mount.textContent).not.toContain('Review Countries')
    await act(async () => [...mount.querySelectorAll('button')].find(button => button.textContent === 'Learn Countries')?.click())
    expect(onGuidedAction).toHaveBeenCalledWith('learn-countries')

    act(() => root?.unmount())
    root = null
    document.body.replaceChildren()
    markSubregionCountriesLearned('northern-europe', 1)
    markSubregionCapitalsLearned('northern-europe', 2)
    const completedMount = document.createElement('div')
    document.body.append(completedMount)
    await act(async () => {
      root = createRoot(completedMount)
      root.render(createElement(DrillSetup, {
        level: 'continent',
        selection: createDrillSelection('Europe', ['northern-europe']),
        mode: 'countries',
        order: 'ordered',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onOrderChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        onGuidedAction,
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })
    const completedRails = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1][0] as { right: ReactNode }
    await act(async () => root?.render(completedRails.right))
    expect(completedMount.textContent).toContain('Drill Countries + Capitals')
    expect(completedMount.textContent).toContain('Review Countries')
    expect(completedMount.textContent).toContain('Review Capitals')
  })

  it('shows durable recall progress on the setup map', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'continent',
        selection: createDrillSelection('Europe', ['northern-europe']),
        mode: 'countries',
        order: 'ordered',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onOrderChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const lastMapCall = geographyOverviewMapMock.mock.calls[geographyOverviewMapMock.mock.calls.length - 1]
    const mapProps = lastMapCall?.[0] as Record<string, unknown>
    expect(mapProps.countryColorsById).toBeInstanceOf(Map)
    expect(loadRecallProgressMock).toHaveBeenCalled()
    const legend = mount.querySelector('[aria-label="Durable progress legend"]')
    expect(legend?.textContent).toContain('Not memoed')
    expect(legend?.textContent).toContain('Countries memoed')
    expect(legend?.textContent).toContain('Countries + Capitals memoed')
    expect(legend?.textContent).toContain('Progress')
    expect(legend?.textContent).not.toContain('Location → Country progress')
    expect(legend?.textContent).not.toContain('Unpractised')
    expect(legend?.textContent).toContain('Weak')
    expect(legend?.textContent).toContain('Developing')
    expect(legend?.textContent).toContain('Strong')
    expect(legend?.textContent).toContain('Mastered')
    expect(legend?.textContent).toContain('neutral outline is temporary hover or recall focus')
    const legendDetails = legend?.querySelector('details')
    expect(legendDetails?.hasAttribute('open')).toBe(false)
    expect(legendDetails?.querySelector('summary')?.textContent).toContain('How progress works')
    expect(getDrillProgressLegendEntries('countries').map(entry => entry.color)).toEqual([
      '#8a665b',
      '#a79566',
      '#45a66b',
      '#16834f',
    ])
  })

  it('shows read-only Country to Capital status for Capitals practice', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'continent',
        selection: createDrillSelection('Europe', ['northern-europe']),
        mode: 'capitals',
        order: 'ordered',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onOrderChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    const lastMapCall = geographyOverviewMapMock.mock.calls[geographyOverviewMapMock.mock.calls.length - 1]
    const mapProps = lastMapCall?.[0] as Record<string, unknown>
    expect(mapProps.countryColorsById).toBeInstanceOf(Map)
    expect(mount.querySelector('[aria-label="Durable progress legend"]')).not.toBeNull()
  })

  it('publishes geographic scope on the left and drill controls on the right', async () => {
    const onSelectionChange = vi.fn()
    const onOrderChange = vi.fn()
    const onStart = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'continent',
        selection: createDrillSelection('Europe', ['northern-europe']),
        mode: 'countries',
        order: 'ordered',
        onSelectionChange,
        onModeChange: vi.fn(),
        onOrderChange,
        onStart,
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })

    expect(mount.querySelector('[aria-labelledby="world-countries-current-drill-heading"]')).toBeNull()
    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode; right: ReactNode }
    await act(async () => {
      root?.render(createElement('div', null, railConfig.left, railConfig.right))
    })

    const currentDrill = mount.querySelector('[aria-labelledby="world-countries-current-drill-heading"]')
    expect(currentDrill).not.toBeNull()
    expect(currentDrill?.textContent).toContain('Start Drill')
    expect(currentDrill?.textContent).toContain('Learn Countries')
    expect(currentDrill?.textContent).toContain('Drill order')
    const orderToggle = currentDrill?.querySelector('button[role="radio"][aria-checked="true"]') as HTMLButtonElement | null
    expect(orderToggle?.textContent).toBe('In order')
    const randomOrderButton = [...(currentDrill?.querySelectorAll('button[role="radio"]') ?? [])]
      .find(button => button.textContent === 'Random') as HTMLButtonElement | undefined
    await act(async () => randomOrderButton?.click())
    expect(onOrderChange).toHaveBeenCalledWith('random')
    await act(async () => [...(currentDrill?.querySelectorAll('button') ?? [])].find(button => button.textContent === 'Start Drill')?.click())
    expect(onStart).toHaveBeenCalled()
    await act(async () => [...(currentDrill?.querySelectorAll('button') ?? [])].find(button => button.textContent === 'Learn Countries')?.click())
    expect(useRailsMock.mock.calls[0]).toBeDefined()
    expect(mount.textContent).toContain('Entire Continent')
    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).toContain('Recall mode')
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
        order: 'ordered',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onOrderChange: vi.fn(),
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

  it('publishes the user-authored Continent order in the World rail', async () => {
    setWorldContinentOrder(['north-america', 'europe'])
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'world',
        selection: createDrillSelection('Europe'),
        mode: 'countries',
        order: 'ordered',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onOrderChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    await act(async () => root?.render(railConfig.left))

    const continents = [...mount.querySelectorAll('nav[aria-label="Continents"] button')]
      .map(button => button.textContent)
    expect(continents.slice(0, 2)).toEqual(['North America', 'Europe'])
  })

  it('publishes the user-authored Subregion order in the Continent rail', async () => {
    setContinentSubregionOrder('Europe', [
      'northern-europe',
      'western-europe',
      'balkans',
      'central-europe',
      'eastern-europe',
      'southern-europe',
    ])
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'continent',
        selection: createDrillSelection('Europe'),
        mode: 'countries',
        order: 'ordered',
        onSelectionChange: vi.fn(),
        onModeChange: vi.fn(),
        onOrderChange: vi.fn(),
        onStart: vi.fn(),
        onWorld: vi.fn(),
        onSelectContinent: vi.fn(),
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    await act(async () => root?.render(railConfig.left))

    const subregions = [...mount.querySelectorAll('nav[aria-label="Europe Subregions"] button')]
      .map(button => button.textContent)
    expect(subregions).toEqual([
      'Northern Europe',
      'Western Europe',
      'Balkans',
      'Central Europe',
      'Eastern Europe',
      'Southern Europe',
    ])
  })
})
