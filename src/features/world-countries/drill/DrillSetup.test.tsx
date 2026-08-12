// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
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
  it('does not show guided learning action buttons in the Drill rail', async () => {
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
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    await act(async () => root?.render(railConfig.right))
    const currentDrill = mount.querySelector('[aria-labelledby="world-countries-current-drill-heading"]')
    expect(currentDrill?.textContent).toContain('Drill')
    expect(currentDrill?.textContent).not.toContain('Learn Countries')
    expect(currentDrill?.textContent).not.toContain('Learn Capitals')
    expect(currentDrill?.textContent).not.toContain('Drill Countries + Capitals')
    expect(currentDrill?.textContent).not.toContain('Review Countries')
    expect(mount.textContent).toContain('Learn Countries')

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
        hoveredGroupId: null,
        onHoverGroup: vi.fn(),
      }))
    })
    const completedRails = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1][0] as { right: ReactNode }
    await act(async () => root?.render(completedRails.right))
    const completedCurrentDrill = completedMount.querySelector('[aria-labelledby="world-countries-current-drill-heading"]')
    expect(completedCurrentDrill?.textContent).not.toContain('Learn Countries')
    expect(completedCurrentDrill?.textContent).not.toContain('Learn Capitals')
    expect(completedCurrentDrill?.textContent).not.toContain('Drill Countries + Capitals')
    expect(completedMount.textContent).not.toContain('Secondary')
    expect(completedMount.textContent).not.toContain('Guided review')
    expect(completedMount.textContent).not.toContain('Review Countries')
    expect(completedMount.textContent).not.toContain('Review Capitals')
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

  it('publishes geographic setup on the left and current drill plus practise on the right', async () => {
    const onSelectionChange = vi.fn()
    const onModeChange = vi.fn()
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
        onModeChange,
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

    const modeSection = mount.querySelector('fieldset')
    expect(modeSection?.querySelector('legend')).toBeNull()
    const practicePanel = [...mount.querySelectorAll('section')]
      .find(section => section.querySelector('h2')?.textContent === 'Learn and Practise')
    expect(practicePanel).not.toBeNull()
    const scopePanel = mount.querySelector('[aria-labelledby="world-countries-drill-scope-heading"]')
    expect(scopePanel?.textContent).toContain('Scope')
    expect(scopePanel?.textContent).toContain('1 Subregion selected')
    const groupLabels = [...(modeSection?.querySelectorAll('[role="group"]') ?? [])]
      .map(group => group.getAttribute('aria-labelledby'))
    expect(groupLabels).toHaveLength(1)
    expect(groupLabels.every(id => id && modeSection?.querySelector(`[id="${id}"]`))).toBe(true)
    const modeInputs = [...mount.querySelectorAll('input[type="radio"]')] as HTMLInputElement[]
    expect(modeInputs).toHaveLength(6)
    expect(modeInputs.map(input => input.parentElement?.querySelector('span.min-w-0')?.textContent?.trim())).toEqual([
      'Countries',
      'Countries + Capitals',
      'Countries from Capitals',
      'Learn Countries',
      'Locate Countries',
      'Capitals',
    ])
    expect(modeInputs.filter(input => input.checked)).toHaveLength(1)
    expect(modeSection?.textContent).toContain('Drill')
    expect(practicePanel?.textContent).toContain('Learn and Practise')
    const countriesDescriptionId = modeInputs.find(input => input.value === 'countries')?.getAttribute('aria-describedby')
    expect(countriesDescriptionId).toBeTruthy()
    expect(modeSection?.querySelector(`[id="${countriesDescriptionId}"][role="tooltip"]`)?.textContent).toBe('Identify the highlighted Country location on the map.')
    const practiceInput = practicePanel?.querySelector('input[type="radio"]') as HTMLInputElement | null
    expect(practiceInput?.name).toContain('practice-mode')
    expect(practiceInput?.name).not.toBe(modeInputs.find(input => input.value === 'countries')?.name)
    expect(practicePanel?.textContent).toContain('Locate Countries')
    expect(mount.textContent).not.toContain('Recall mode')
    const capitalsDescriptionId = modeInputs.find(input => input.value === 'capitals')?.getAttribute('aria-describedby')
    expect(practicePanel?.querySelector(`[id="${capitalsDescriptionId}"][role="tooltip"]`)?.textContent).toBe('Practise capitals before Countries + Capitals.')

    const currentDrill = mount.querySelector('[aria-labelledby="world-countries-current-drill-heading"]')
    expect(currentDrill).not.toBeNull()
    expect(currentDrill?.textContent).not.toContain('Scope')
    expect(currentDrill?.textContent).toContain('Start Drill')
    expect(currentDrill?.textContent).not.toContain('Learn Countries')
    expect(currentDrill?.textContent).not.toContain('Learn Capitals')
    expect(currentDrill?.textContent).not.toContain('Drill Countries + Capitals')
    expect(currentDrill?.textContent).toContain('Drill order')
    const orderPanel = currentDrill?.querySelector('[aria-labelledby="world-countries-drill-order-heading"]')
    expect(orderPanel).not.toBeNull()
    expect(orderPanel?.textContent).toContain('Drill order')
    const orderToggle = orderPanel?.querySelector('button[role="radio"][aria-checked="true"]') as HTMLButtonElement | null
    expect(orderToggle?.textContent).toBe('In order')
    const randomOrderButton = [...(orderPanel?.querySelectorAll('button[role="radio"]') ?? [])]
      .find(button => button.textContent === 'Random') as HTMLButtonElement | undefined
    await act(async () => randomOrderButton?.click())
    expect(onOrderChange).toHaveBeenCalledWith('random')
    await act(async () => [...(currentDrill?.querySelectorAll('button') ?? [])].find(button => button.textContent === 'Start Drill')?.click())
    expect(onStart).toHaveBeenCalled()
    expect(useRailsMock.mock.calls[0]).toBeDefined()
    expect(mount.textContent).toContain('Entire Continent')
    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).not.toContain('Recall mode')
    expect(currentDrill?.querySelectorAll('input[type="radio"]')).toHaveLength(3)
    const practiceStartButton = [...(practicePanel?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'Start practise')
    expect(practiceStartButton).not.toBeNull()
    expect((practiceStartButton as HTMLButtonElement | null)?.disabled).toBe(true)
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

  it('shows Subregion and Country counts on World Continent buttons', async () => {
    const entries: Country[] = [
      { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
      { id: 'ES', country: 'Spain', capital: 'Madrid', continent: 'Europe', subregionId: 'southern-europe', subregion: 'Southern Europe' },
      { id: 'JP', country: 'Japan', capital: 'Tokyo', continent: 'Asia', subregionId: 'east-asia', subregion: 'East Asia' },
    ]
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSetup, {
        level: 'world',
        selection: createDrillSelection('Europe'),
        mode: 'countries',
        order: 'ordered',
        entries,
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

    const buttons = [...mount.querySelectorAll('nav[aria-label="Continents"] button')]
    expect(buttons.find(button => button.textContent?.startsWith('Europe'))?.textContent).toContain('2 Subregions · 2 Countries')
    expect(buttons.find(button => button.textContent?.startsWith('Asia'))?.textContent).toContain('1 Subregion · 1 Country')
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
      .map(button => button.querySelector('span > span')?.textContent)
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
