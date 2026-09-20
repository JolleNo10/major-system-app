// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { recallTargetIdFor, WORLD_COUNTRIES_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { createDrillSelection, selectAllDrillSubregions } from './drillSelection'
import { DrillSetup } from './DrillSetup'
import { WORLD_METADATA_STORAGE_KEY, setWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const useRailsMock = vi.hoisted(() => vi.fn())
const mapMock = vi.hoisted(() => vi.fn())
const loadRecallProgressMock = vi.hoisted(() => vi.fn(async () => new Map()))
const proficiencyScopeMock = vi.hoisted(() => vi.fn(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] })))
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock, usePageLayoutPresentation: vi.fn() }))
vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({ GeographyOverviewMap: (props: Record<string, unknown>) => { mapMock(props); return createElement('div', { 'data-testid': 'map' }) } }))
vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({ ...await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>(), loadWorldCountriesRecallProgress: loadRecallProgressMock }))
vi.mock('./drillProficiencyScope', async importOriginal => ({ ...await importOriginal<typeof import('./drillProficiencyScope')>(), resolveDrillProficiencyScope: proficiencyScopeMock }))

let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); useRailsMock.mockReset(); mapMock.mockReset(); loadRecallProgressMock.mockClear(); loadRecallProgressMock.mockImplementation(async () => new Map()); proficiencyScopeMock.mockReset(); proficiencyScopeMock.mockImplementation(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] })); localStorage.clear() })

function createSetupProps(overrides: Record<string, unknown> = {}) {
  return { level: 'continent', setupContinent: 'Europe', selection: createDrillSelection(['northern-europe']), selectionMetadata: {}, mode: 'countries', order: 'ordered', activity: { kind: 'drill' }, learningStates: [], onSelectionChange: vi.fn(), onModeChange: vi.fn(), onOrderChange: vi.fn(), onStart: vi.fn(), onWorld: vi.fn(), onSelectContinent: vi.fn(), onToggleWorld: vi.fn(), hoveredGroupId: null, onHoverGroup: vi.fn(), ...overrides } as never
}

function renderSetup(overrides: Record<string, unknown> = {}) {
  const mount = document.createElement('div'); document.body.append(mount)
  act(() => { root = createRoot(mount); root.render(createElement(DrillSetup, createSetupProps(overrides))) })
  return mount
}

const scopeEntries = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
  { id: 'FR', country: 'France', capital: 'Paris', continent: 'Europe' as const, subregionId: 'western-europe' as const, subregion: 'Western Europe' },
  { id: 'IT', country: 'Italy', capital: 'Rome', continent: 'Europe' as const, subregionId: 'southern-europe' as const, subregion: 'Southern Europe' },
  { id: 'IN', country: 'India', capital: 'New Delhi', continent: 'Asia' as const, subregionId: 'south-asia' as const, subregion: 'South Asia' },
] as const

function renderLatestRight() {
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { right: ReactNode }
  act(() => root?.render(config.right))
}

function renderLatestLeft() {
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left: ReactNode }
  act(() => root?.render(config.left))
}

/** The scope confirmation and the primary action live in the centre dock. */
function dockDescription(node: HTMLElement) {
  return node.querySelector('[data-task-dock-message-description]')?.textContent
}

function startButton(node: HTMLElement) {
  return node.querySelector<HTMLButtonElement>('[data-task-dock] [data-primary-action]')
}

describe('DrillSetup activity boundary', () => {
  it('uses one shared World toggle action for empty and complete scopes', () => {
    const onToggleWorld = vi.fn()
    const emptySelection = createDrillSelection([], scopeEntries)
    const mount = renderSetup({ level: 'world', setupContinent: null, entries: scopeEntries, selection: emptySelection, onToggleWorld })
    renderLatestLeft()

    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select world"]')).not.toBeNull()
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Select world"]')?.click())
    expect(onToggleWorld).toHaveBeenCalledTimes(1)

    act(() => root?.render(createElement(DrillSetup, createSetupProps({
      level: 'world',
      setupContinent: null,
      entries: scopeEntries,
      selection: createDrillSelection(selectAllDrillSubregions(scopeEntries).subregionIds, scopeEntries),
      onToggleWorld,
    }))))
    renderLatestLeft()

    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Clear world"]')).not.toBeNull()
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Clear world"]')?.click())
    expect(onToggleWorld).toHaveBeenCalledTimes(2)
  })

  it('composes the centre as one map surface, like the Today map', () => {
    const mount = renderSetup({ level: 'world', setupContinent: null })

    const surface = mount.querySelector('[data-map-surface]')
    expect(surface).not.toBeNull()
    expect(mount.querySelectorAll('[data-map-surface]')).toHaveLength(1)
    // The legend belongs above the map with the title, not stacked after it.
    expect(surface?.querySelector('[data-map-surface-context] [data-testid="world-countries-map-legend"]')).not.toBeNull()
    expect(mount.querySelector('h1')?.textContent).toBe('World')
    // The layout header already says this; the centre must not repeat it.
    expect(mount.textContent).not.toContain('World Countries')
  })

  it('states the whole configured run in the dock, not only its geography', () => {
    const mount = renderSetup({ entries: scopeEntries, selection: createDrillSelection(['northern-europe'], scopeEntries), mode: 'countries-capitals', order: 'random' })

    expect(mount.querySelector('[data-task-dock-message-header]')?.textContent).toBe('Ready to drill')
    expect(dockDescription(mount)).toContain('Northern Europe · 2 Countries')
    expect(mount.querySelector('[data-drill-setup-run]')?.textContent).toBe('Location → Country, then Country → Capital · Random order')
  })

  it('paints the setup map with the shared Country and Capital recall status', async () => {
    const norway = {
      id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const,
      subregionId: 'northern-europe' as const, subregion: 'Northern Europe',
    }
    loadRecallProgressMock.mockResolvedValue(deriveWorldCountriesRecallProgress({
      countryIds: ['NO'], skills: ['location-to-country', 'country-to-capital'],
    }, [
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', attemptType: 'drill' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 2, ok: false, ms: 500, evidenceKind: 'recall', attemptType: 'drill' },
    ]))
    renderSetup({
      level: 'world',
      mode: 'countries-capitals',
      entries: [norway],
      learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }],
    })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(loadRecallProgressMock).toHaveBeenCalledWith({ countryIds: ['NO'], skills: [...WORLD_COUNTRIES_RECALL_SKILLS] })
    const latestMapProps = mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0] as {
      countryAccessibleDescriptionsById: Map<string, string>
      countryColorsById: Map<string, string>
      countryInnerGlowsById: Map<string, { color: string }>
    }
    expect(latestMapProps.countryAccessibleDescriptionsById.get('NO')).toBe('Country recall: Developing. Capital recall: Weak.')
    expect(latestMapProps.countryColorsById.get('NO')).toBe('#B5A678')
    expect(latestMapProps.countryInnerGlowsById.get('NO')?.color).toBe('#BC9C7B')
  })

  it('does not report recall health for a Country that has not finished Learning', async () => {
    const norway = {
      id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const,
      subregionId: 'northern-europe' as const, subregion: 'Northern Europe',
    }
    renderSetup({ level: 'world', mode: 'countries-capitals', entries: [norway] })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    const latestMapProps = mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0] as {
      countryAccessibleDescriptionsById: Map<string, string>
      countryColorsById: Map<string, string>
      countryInnerGlowsById: Map<string, unknown>
    }
    expect(latestMapProps.countryAccessibleDescriptionsById.get('NO')).toBe('Learning: Not learned.')
    expect(latestMapProps.countryColorsById.get('NO')).toBeUndefined()
    expect(latestMapProps.countryInnerGlowsById.get('NO')).toBeUndefined()
  })

  it('does not reload evidence when only the mode or Country order changes', async () => {
    const entries = [
      { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
      { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
    ]
    renderSetup({ level: 'world', entries, mode: 'countries' })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    const initialLoadCount = loadRecallProgressMock.mock.calls.length

    act(() => {
      root?.render(createElement(DrillSetup, createSetupProps({
        level: 'world',
        entries: [...entries].reverse(),
        mode: 'capitals',
        activity: { kind: 'drill' },
      })))
    })

    expect(loadRecallProgressMock).toHaveBeenCalledTimes(initialLoadCount)
  })

  it('offers Countries + Capitals as the main Drill mode with two single-skill sub modes', () => {
    const mount = renderSetup()
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode; right: ReactNode }
    act(() => root?.render(createElement('div', null, config.left, config.right)))
    expect(mount.textContent).toContain('Countries + Capitals')
    expect(mount.textContent).toContain('One skill at a time')
    expect(mount.textContent).not.toContain('Countries from Capitals')
    expect(mount.textContent).not.toContain('Country for Shape')
    const modeInputs = [...mount.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(input => !input.dataset.scopeSource)
    expect(modeInputs).toHaveLength(3)
    expect(modeInputs.map(input => input.value)).toEqual(['countries-capitals', 'countries', 'capitals'])
    expect(mount.textContent).toContain('Edit order')
    // The action lives in the centre dock, not the settings rail.
    expect(mount.textContent).not.toContain('Start Drill')
  })

  it.each([
    ['drill', { kind: 'drill' }],
    ['practice', { kind: 'practice', mode: 'locate-countries' }],
  ] as const)('reads the same shared map legend in %s setup', async (_name, activity) => {
    const mount = renderSetup({ activity })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    const legend = mount.querySelector('[data-testid="world-countries-map-legend"]')

    expect(legend).not.toBeNull()
    expect(legend?.querySelector('[data-learning-state="COUNTRIES_LEARNED"]')).not.toBeNull()
    expect(legend?.querySelector('[data-progress-state="weak"]')).not.toBeNull()
    expect(legend?.querySelector('[data-progress-state="mastered"]')).not.toBeNull()
    expect(legend?.querySelector('[data-map-status-cue]')?.textContent).toBe('Country = fill · Capital = inner edge')
  })

  it('confirms a single effective Subregion and keeps Start Drill enabled', () => {
    const onStart = vi.fn()
    const mount = renderSetup({ entries: scopeEntries, selection: createDrillSelection(['northern-europe'], scopeEntries), onStart })

    expect(dockDescription(mount)).toContain('Northern Europe · 2 Countries')
    const start = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Start Drill')
    expect(start?.disabled).toBe(false)
    act(() => start?.click())
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('confirms multiple geographic Subregions with an aggregate count', () => {
    const mount = renderSetup({ entries: scopeEntries, selection: createDrillSelection(['northern-europe', 'western-europe'], scopeEntries) })

    expect(dockDescription(mount)).toContain('2 Subregions · 3 Countries')
  })

  it('uses a Continent label when the entire effective Continent is selected', () => {
    const mount = renderSetup({ entries: scopeEntries, selection: createDrillSelection(['northern-europe', 'western-europe', 'southern-europe'], scopeEntries) })

    expect(dockDescription(mount)).toContain('Europe · 4 Countries')
  })

  it('confirms World-level geographic scope with a compact aggregate', () => {
    const mount = renderSetup({ level: 'world', setupContinent: null, entries: scopeEntries, selection: createDrillSelection(['northern-europe', 'south-asia'], scopeEntries) })

    expect(dockDescription(mount)).toContain('2 Subregions · 3 Countries')
  })

  it('confirms a resolved Weak proficiency scope without changing launch eligibility', async () => {
    proficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 0 }, countryIds: ['NO'], countries: [scopeEntries[0]] } as never)
    const onStart = vi.fn()
    const mount = renderSetup({ entries: scopeEntries, selection: createDrillSelection([], scopeEntries), scopeSource: 'proficiency', proficiencySelection: ['weak'], onStart })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(dockDescription(mount)).toContain('Weak · 1 Country')
    const start = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Start Drill')
    expect(start?.disabled).toBe(false)
    act(() => start?.click())
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('confirms combined Weak and Developing proficiency using the resolved count', async () => {
    proficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 2 }, countryIds: ['NO', 'FR', 'IN'], countries: [scopeEntries[0], scopeEntries[2], scopeEntries[4]] } as never)
    const mount = renderSetup({ entries: scopeEntries, selection: createDrillSelection([], scopeEntries), scopeSource: 'proficiency', proficiencySelection: ['weak', 'developing'] })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(dockDescription(mount)).toContain('Weak + Developing · 3 Countries')
  })

  it('does not present a proficiency scope while loading', async () => {
    let resolveLoad: ((progress: Map<string, never>) => void) | undefined
    loadRecallProgressMock.mockImplementation(() => new Promise<Map<string, never>>(resolve => { resolveLoad = resolve }))
    const loadingMount = renderSetup({ entries: scopeEntries, selection: createDrillSelection([], scopeEntries), scopeSource: 'proficiency', proficiencySelection: ['weak'] })
    expect(dockDescription(loadingMount)).toContain('Loading proficiency…')
    expect(startButton(loadingMount)?.disabled).toBe(true)
    expect(loadingMount.textContent).not.toContain('Choose at least one Subregion')
    await act(async () => { resolveLoad?.(new Map<string, never>()); await Promise.resolve() })
  })

  it('does not present a proficiency scope when no Countries match', async () => {
    loadRecallProgressMock.mockResolvedValue(new Map())
    proficiencyScopeMock.mockReturnValue({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] } as never)
    const noMatchMount = renderSetup({ entries: scopeEntries, selection: createDrillSelection([], scopeEntries), scopeSource: 'proficiency', proficiencySelection: ['weak'] })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(noMatchMount.textContent).toContain('No Countries currently match the selected proficiency.')
    expect(startButton(noMatchMount)?.disabled).toBe(true)
    expect(noMatchMount.textContent).not.toContain('Choose at least one Subregion')
  })

  it('updates the scope confirmation when geographic selection changes', async () => {
    const mount = renderSetup({ entries: scopeEntries, selection: createDrillSelection(['northern-europe'], scopeEntries) })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(dockDescription(mount)).toContain('Northern Europe · 2 Countries')

    act(() => root?.render(createElement(DrillSetup, createSetupProps({ entries: scopeEntries, selection: createDrillSelection(['northern-europe', 'western-europe'], scopeEntries) }))))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(dockDescription(mount)).toContain('2 Subregions · 3 Countries')
  })

  it('shows a fixed Practice activity without alternate setup choices', () => {
    const onStart = vi.fn()
    const mount = renderSetup({ activity: { kind: 'practice', mode: 'capitals' }, onStart })
    const start = startButton(mount)
    expect(start?.textContent).toBe('Start Capital Practice')
    act(() => start?.click())
    expect(onStart).toHaveBeenCalledTimes(1)

    renderLatestRight()
    expect(mount.textContent).toContain('Capital Practice')
    expect(mount.textContent).toContain('non-recording')
    expect(mount.textContent).not.toContain('Drill order')
    expect(mount.textContent).not.toContain('Learn Countries')
    expect(mount.textContent).not.toContain('Learn Capitals')
    expect(mount.textContent).not.toContain('Locate Countries')
    expect(mount.textContent).not.toContain('Locate Capitals')
    // The Country scope choice is the only radio group a fixed Practice offers.
    expect([...mount.querySelectorAll<HTMLInputElement>('input[type="radio"]')].every(input => input.dataset.scopeSource)).toBe(true)
  })

  it('keeps fixed Practice start enabled for a matching proficiency scope', async () => {
    proficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 0 }, countryIds: ['albania'], countries: [{}] } as never)
    const onStart = vi.fn()
    const mount = renderSetup({ activity: { kind: 'practice', mode: 'locate-countries' }, scopeSource: 'proficiency', proficiencySelection: ['weak'], onStart })
    await act(async () => { await Promise.resolve() })

    const start = startButton(mount)
    expect(start?.textContent).toBe('Start Locate Countries')
    expect(start?.disabled).toBe(false)
    act(() => start?.click())
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('explains that a Continent needs a Subregion before Drill can start', () => {
    const mount = renderSetup({ selection: createDrillSelection([]) })

    expect(dockDescription(mount)).toContain('Choose at least one Subregion')
    expect(startButton(mount)?.disabled).toBe(true)
    expect(mount.textContent).not.toContain('Choose a Continent first')
  })

  it('keeps the Practice setup map on the same shared status as Drill', () => {
    const mount = renderSetup({ activity: { kind: 'practice', mode: 'locate-countries' } })
    expect(mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0].countryColorsById).toBeInstanceOf(Map)
    expect(mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0].countryInnerGlowsById).toBeInstanceOf(Map)
    const config = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    act(() => root?.render(config.right))
    expect(mount.textContent).toContain('Practice')
    expect(mount.textContent).not.toContain('Drill mode')
  })

  it('offers the typed and map answer options only for Countries from Capitals Practice', () => {
    const onPracticeInteractionChange = vi.fn()
    const mount = renderSetup({ activity: { kind: 'practice', mode: 'countries-from-capitals' }, practiceInteraction: 'location-click', onPracticeInteractionChange })
    renderLatestRight()

    const options = mount.querySelector('[role="radiogroup"][aria-label="Answer with"]')
    expect(options).not.toBeNull()
    expect([...options!.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Click the map', 'Type the answer'])
    act(() => [...options!.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Type the answer')?.click())
    expect(onPracticeInteractionChange).toHaveBeenCalledWith('recall')

    act(() => root?.render(createElement(DrillSetup, createSetupProps({ activity: { kind: 'practice', mode: 'locate-countries' }, onPracticeInteractionChange }))))
    renderLatestRight()
    expect(mount.querySelector('[role="radiogroup"][aria-label="Answer with"]')).toBeNull()
  })

  it('uses the shared Learning patterns for readiness fallback maps', async () => {
    renderSetup({ learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1 }] })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    const mapProps = mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0] as { countryColorsById: Map<string, string>; countryPatternsById: Map<string, { kind: string; baseColor: string; lineColor: string }> }
    expect(mapProps.countryColorsById.get('NO')).toBeUndefined()
    expect(mapProps.countryPatternsById.get('NO')).toMatchObject({ kind: 'diagonal', baseColor: '#5A5E66', lineColor: '#3E3719', lineOpacity: 0.46 })

    act(() => root?.render(createElement(DrillSetup, createSetupProps({ learningStates: [{ subregionId: 'northern-europe', countriesLearnedAt: 1, capitalsLearnedAt: 2 }] }))))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    const completeMapProps = mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0] as { countryColorsById: Map<string, string>; countryPatternsById: Map<string, { kind: string }> }
    expect(completeMapProps.countryPatternsById.get('NO')).toBeUndefined()
    expect(completeMapProps.countryColorsById.get('NO')).toBe('#90796F')
  })

  it('shows the Country count on each Subregion button', () => {
    const mount = renderSetup({ selection: createDrillSelection([]) })
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    act(() => root?.render(config.left))
    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).toMatch(/Northern Europe[\s\S]*\d+ Countries/)
  })

  it('refreshes the mounted setup order after an external geography restore', async () => {
    localStorage.setItem(WORLD_METADATA_STORAGE_KEY, JSON.stringify({ continentOrder: ['europe', 'asia'], updatedAt: 9 }))
    const mount = renderSetup({ level: 'world' })
    const display = document.createElement('div')
    document.body.append(display)
    const displayRoot = createRoot(display)
    const initialConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    act(() => displayRoot.render(createElement('div', null, initialConfig.left)))
    const initialEurope = display.textContent?.indexOf('Europe') ?? -1
    const initialAsia = display.textContent?.indexOf('Asia') ?? -1

    await act(async () => {
      setWorldMetadata({ continentOrder: ['asia', 'europe'], updatedAt: 10 })
      await Promise.resolve()
    })
    const latestConfig = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1][0] as { left: ReactNode }
    act(() => displayRoot.render(createElement('div', null, latestConfig.left)))

    expect(display.textContent?.indexOf('Asia')).toBeLessThan(display.textContent?.indexOf('Europe'))
    expect(initialEurope).toBeLessThan(initialAsia)
    act(() => displayRoot.unmount())
  })

  it('chooses the Country scope beside the other Drill settings, not in the geography rail', () => {
    const onProficiencySelectionChange = vi.fn()
    const onScopeSourceChange = vi.fn()
    const mount = renderSetup({
      selection: createDrillSelection([]),
      scopeSource: 'proficiency', proficiencySelection: ['weak'],
      onProficiencySelectionChange,
      onScopeSourceChange,
    })
    renderLatestRight()

    // The scope choice lives with Drill mode and Drill order.
    expect(mount.textContent).toContain('Countries')
    expect(mount.querySelector('[data-scope-source="proficiency"]')).not.toBeNull()
    const checkboxes = [...mount.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0].checked).toBe(true)
    act(() => checkboxes[1].click())
    expect(onProficiencySelectionChange).toHaveBeenLastCalledWith(['weak', 'developing'])

    act(() => mount.querySelector<HTMLInputElement>('[data-scope-source="geography"]')?.click())
    expect(onScopeSourceChange).toHaveBeenLastCalledWith('geography')
    // Switching source never discards the other source's selection.
    expect(onProficiencySelectionChange).toHaveBeenLastCalledWith(['weak', 'developing'])
  })

  it('keeps the geography rail and its navigation while Needs work is the active source', () => {
    const onSelectionChange = vi.fn()
    const mount = renderSetup({
      selection: createDrillSelection([]),
      scopeSource: 'proficiency', proficiencySelection: ['weak'],
      onSelectionChange,
    })
    renderLatestLeft()

    expect(mount.querySelector('[aria-labelledby="world-countries-drill-scope-heading"]')).not.toBeNull()
    expect(mount.querySelector('[data-scope-source="proficiency"]')).toBeNull()
    const subregion = [...mount.querySelectorAll('button')].find(button => button.textContent?.includes('Northern Europe'))
    act(() => subregion?.click())
    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.objectContaining({ subregionIds: ['northern-europe'] }))
  })

  it('offers the same Country scope choice in Practice setup', () => {
    const mount = renderSetup({ activity: { kind: 'practice', mode: 'locate-countries' }, scopeSource: 'proficiency', proficiencySelection: ['weak'] })
    renderLatestRight()

    expect(mount.querySelector('[data-scope-source="geography"]')).not.toBeNull()
    expect(mount.querySelector('[data-scope-source="proficiency"]')).not.toBeNull()
    expect(mount.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)
  })

  it('keeps the proficiency panel at Continent setup only', () => {
    const mount = renderSetup({ level: 'world' })
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    act(() => root?.render(config.left))
    expect(mount.textContent).not.toContain('Proficiency')
  })

  it('keeps multi-Continent selection separate from navigation and exposes mixed state accessibly', () => {
    const entries = [
      { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
      { id: 'FR', country: 'France', capital: 'Paris', continent: 'Europe' as const, subregionId: 'western-europe' as const, subregion: 'Western Europe' },
      { id: 'IN', country: 'India', capital: 'New Delhi', continent: 'Asia' as const, subregionId: 'south-asia' as const, subregion: 'South Asia' },
    ]
    const selection = createDrillSelection(['northern-europe', 'south-asia'], entries)
    const onSelectionChange = vi.fn()
    const onSelectContinent = vi.fn()
    const mount = renderSetup({ level: 'world', setupContinent: null, entries, selection, onSelectionChange, onSelectContinent })
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    act(() => root?.render(config.left))

    const europeCheckbox = mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')
    const asiaCheckbox = mount.querySelector<HTMLButtonElement>('[aria-label="Select Asia"]')
    expect(europeCheckbox?.getAttribute('aria-checked')).toBe('mixed')
    expect(asiaCheckbox?.getAttribute('aria-checked')).toBe('true')
    expect(mount.textContent).toContain('2 Continents')
    expect(mount.textContent).toContain('2 Subregions')

    act(() => europeCheckbox?.click())
    expect(onSelectionChange).toHaveBeenLastCalledWith({ subregionIds: ['northern-europe', 'western-europe', 'south-asia'] })
    expect(onSelectContinent).not.toHaveBeenCalled()

    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Open Europe setup"]')?.click())
    expect(onSelectContinent).toHaveBeenCalledWith('Europe')
  })

  it('enables World-level Start for a non-empty geographic selection', () => {
    const mount = renderSetup({ level: 'world', setupContinent: null, selection: createDrillSelection(['northern-europe']) })

    const start = startButton(mount)
    expect(start?.textContent).toBe('Start Drill')
    expect(start?.disabled).toBe(false)
  })

})
