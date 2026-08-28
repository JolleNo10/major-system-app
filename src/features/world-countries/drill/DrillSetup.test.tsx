// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { recallTargetIdFor, WORLD_COUNTRIES_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { createDrillSelection } from './drillSelection'
import { DrillSetup } from './DrillSetup'
import { WORLD_METADATA_STORAGE_KEY, setWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const useRailsMock = vi.hoisted(() => vi.fn())
const mapMock = vi.hoisted(() => vi.fn())
const loadRecallProgressMock = vi.hoisted(() => vi.fn(async () => new Map()))
const proficiencyScopeMock = vi.hoisted(() => vi.fn(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] })))
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))
vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({ GeographyOverviewMap: (props: Record<string, unknown>) => { mapMock(props); return createElement('div', { 'data-testid': 'map' }) } }))
vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({ ...await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>(), loadWorldCountriesRecallProgress: loadRecallProgressMock }))
vi.mock('./drillProficiencyScope', async importOriginal => ({ ...await importOriginal<typeof import('./drillProficiencyScope')>(), resolveDrillProficiencyScope: proficiencyScopeMock }))

let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); useRailsMock.mockReset(); mapMock.mockReset(); loadRecallProgressMock.mockClear(); loadRecallProgressMock.mockImplementation(async () => new Map()); proficiencyScopeMock.mockReset(); proficiencyScopeMock.mockImplementation(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] })); localStorage.clear() })

function createSetupProps(overrides: Record<string, unknown> = {}) {
  return { level: 'continent', setupContinent: 'Europe', selection: createDrillSelection(['northern-europe']), selectionMetadata: {}, mode: 'countries', order: 'ordered', purpose: 'drill', learnPracticeMode: 'learn-countries', learningStates: [], onSelectionChange: vi.fn(), onModeChange: vi.fn(), onOrderChange: vi.fn(), onPurposeChange: vi.fn(), onLearnPracticeModeChange: vi.fn(), onStart: vi.fn(), onLearnPracticeStart: vi.fn(), onWorld: vi.fn(), onSelectContinent: vi.fn(), onSelectAllWorld: vi.fn(), onClearWorld: vi.fn(), hoveredGroupId: null, onHoverGroup: vi.fn(), ...overrides } as never
}

function renderSetup(overrides: Record<string, unknown> = {}) {
  const mount = document.createElement('div'); document.body.append(mount)
  act(() => { root = createRoot(mount); root.render(createElement(DrillSetup, createSetupProps(overrides))) })
  return mount
}

describe('DrillSetup activity boundary', () => {
  it('loads Countries + Capitals Drill status for the initial world map', async () => {
    const norway = {
      id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const,
      subregionId: 'northern-europe' as const, subregion: 'Northern Europe',
    }
    loadRecallProgressMock.mockResolvedValue(deriveWorldCountriesRecallProgress({
      countryIds: ['NO'], skills: ['location-to-country', 'country-to-capital'],
    }, [
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 2, ok: false, ms: 500, evidenceKind: 'recall' },
    ]))
    renderSetup({ level: 'world', mode: 'countries-capitals', entries: [norway] })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(loadRecallProgressMock).toHaveBeenCalledWith({ countryIds: ['NO'], skills: [...WORLD_COUNTRIES_RECALL_SKILLS] })
    const latestMapProps = mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0] as { countryAccessibleDescriptionsById: Map<string, string> }
    expect(latestMapProps.countryAccessibleDescriptionsById.get('NO')).toBe('Drill proficiency: Weak.')
  })

  it('shows active World core mastery above the World map', async () => {
    const entries = [
      { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
      { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
      { id: 'DK', country: 'Denmark', capital: 'Copenhagen', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
      { id: 'FI', country: 'Finland', capital: 'Helsinki', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
    ]
    loadRecallProgressMock.mockResolvedValue(deriveWorldCountriesRecallProgress({
      countryIds: entries.map(entry => entry.id),
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, [
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 2, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 3, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 4, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: recallTargetIdFor('SE', 'location-to-country'), at: 5, ok: false, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('DK', 'location-to-country'), at: 6, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('DK', 'country-to-capital'), at: 7, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
    ]))

    const mount = renderSetup({ level: 'world', entries })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mount.querySelector('[aria-labelledby="world-mastery-heading"]')).not.toBeNull()
    expect(mount.textContent).toContain('World mastery')
    expect(mount.textContent).toContain('1 / 4 complete')
    expect(mount.textContent).toContain('25%')
    expect(mount.textContent).toContain('Unpractised 1')
    expect(mount.textContent).toContain('Weak 1')
    expect(mount.textContent).toContain('Developing 1')
    expect(mount.textContent).toContain('Strong 0')
    expect(mount.textContent).toContain('Complete 1')
    expect(mount.textContent).toContain('Complete requires both Location → Country and Country → Capital to be Mastered.')
  })

  it('keeps World mastery neutral while evidence is loading', async () => {
    let resolveLoad: ((progress: Map<string, never>) => void) | undefined
    loadRecallProgressMock.mockImplementation(() => new Promise<Map<string, never>>(resolve => { resolveLoad = resolve }))

    const mount = renderSetup({ level: 'world' })

    expect(mount.textContent).toContain('World mastery')
    expect(mount.textContent).toContain('Loading mastery…')
    expect(mount.textContent).not.toContain('0 / 195 complete')
    await act(async () => {
      resolveLoad?.(new Map<string, never>())
      await Promise.resolve()
    })
  })

  it('shows active Countries with no evidence as Unpractised', async () => {
    const entries = [
      { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
      { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
    ]
    const mount = renderSetup({ level: 'world', entries })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mount.textContent).toContain('0 / 2 complete')
    expect(mount.textContent).toContain('0%')
    expect(mount.textContent).toContain('Unpractised 2')
    expect(mount.textContent).toContain('Complete 0')
  })

  it('keeps the World summary stable across purpose, mode, and Country order changes', async () => {
    const entries = [
      { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
      { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe' as const, subregionId: 'northern-europe' as const, subregion: 'Northern Europe' },
    ]
    loadRecallProgressMock.mockResolvedValue(deriveWorldCountriesRecallProgress({
      countryIds: entries.map(entry => entry.id),
      skills: [...WORLD_COUNTRIES_RECALL_SKILLS],
    }, [
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 1, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('NO', 'location-to-country'), at: 2, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 3, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: recallTargetIdFor('NO', 'country-to-capital'), at: 4, ok: true, ms: 500, evidenceKind: 'recall', localDate: '2026-08-11' },
    ]))
    const mount = renderSetup({ level: 'world', entries, mode: 'countries' })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    const initialSummary = mount.querySelector('[data-testid="world-mastery-summary"]')?.textContent
    const initialLoadCount = loadRecallProgressMock.mock.calls.length

    act(() => {
      root?.render(createElement(DrillSetup, createSetupProps({
        level: 'world',
        entries: [...entries].reverse(),
        mode: 'countries-from-capitals',
        purpose: 'learn-practise',
        learnPracticeMode: 'capitals',
      })))
    })

    expect(mount.querySelector('[data-testid="world-mastery-summary"]')?.textContent).toBe(initialSummary)
    expect(loadRecallProgressMock).toHaveBeenCalledTimes(initialLoadCount)
  })

  it('shows an explicit empty-population state without reporting completion', async () => {
    const mount = renderSetup({ level: 'world', entries: [] })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mount.textContent).toContain('0 Countries active')
    expect(mount.textContent).toContain('0 / 0 complete')
    expect(mount.textContent).toContain('0%')
    expect(mount.textContent).toContain('Complete 0')
  })

  it('does not show World mastery in Continent setup', async () => {
    const mount = renderSetup({ level: 'continent' })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mount.querySelector('[aria-labelledby="world-mastery-heading"]')).toBeNull()
    expect(mount.textContent).not.toContain('World mastery')
  })

  it('exposes four Drill modes and keeps geography authoring in the rail', () => {
    const mount = renderSetup()
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode; right: ReactNode }
    act(() => root?.render(createElement('div', null, config.left, config.right)))
    expect(mount.textContent).toContain('Countries + Capitals')
    expect(mount.textContent).toContain('Countries from Capitals')
    expect(mount.textContent).toContain('Country for Shape')
    expect(mount.textContent).not.toContain('Learn Countries')
    expect(mount.querySelectorAll('input[type="radio"]')).toHaveLength(6)
    expect(mount.textContent).toContain('Edit order')
    expect(mount.textContent).toContain('Start Drill')
  })

  it('shows Learning and Practice as distinct categories under Learn & Practise', () => {
    const onStart = vi.fn()
    const mount = renderSetup({ purpose: 'learn-practise', learnPracticeMode: 'learn-capitals', onLearnPracticeStart: onStart })
    const config = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    act(() => root?.render(config.right))
    expect(mount.textContent).toContain('Learn Countries')
    expect(mount.textContent).toContain('Learn Capitals')
    expect(mount.textContent).toContain('Locate Countries')
    expect(mount.textContent).toContain('Locate Capitals')
    expect(mount.textContent).toContain('Capitals')
    expect(mount.textContent).toContain('non-recording')
    expect(mount.textContent).not.toContain('Drill order')
    expect(mount.textContent).toContain('Recommendation: Learn Countries first')
    const start = [...mount.querySelectorAll('button')].find(button => button.textContent === 'Start Learning')
    act(() => start?.click())
    expect(onStart).toHaveBeenCalledWith('learn-capitals')
  })

  it('keeps Learning start enabled for a matching proficiency scope', async () => {
    proficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 0 }, countryIds: ['albania'], countries: [{}] } as never)
    const onStart = vi.fn()
    const mount = renderSetup({ purpose: 'learn-practise', proficiencySelection: ['weak'], onLearnPracticeStart: onStart })
    await act(async () => { await Promise.resolve() })
    const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1][0] as { right: ReactNode }
    act(() => root?.render(config.right))

    const start = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Start Learning')
    expect(start?.disabled).toBe(false)
    expect(mount.textContent).toContain('does not mark a Subregion learned')
    act(() => start?.click())
    expect(onStart).toHaveBeenCalledWith('learn-countries')
  })

  it('explains that a Continent needs a Subregion before Drill can start', () => {
    const mount = renderSetup({ selection: createDrillSelection([]) })
    const config = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    act(() => root?.render(config.right))

    expect(mount.textContent).toContain('Choose at least one Subregion')
    expect(mount.textContent).not.toContain('Choose a Continent first')
  })

  it('uses Learning Readiness instead of Drill status for Learn & Practise maps', () => {
    const mount = renderSetup({ purpose: 'learn-practise' })
    expect(mapMock.mock.calls[mapMock.mock.calls.length - 1]?.[0].countryColorsById).toBeInstanceOf(Map)
    expect(mount.textContent).toContain('Learning Readiness')
    const config = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    act(() => root?.render(config.right))
    expect(mount.textContent).toContain('Practice')
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

  it('keeps proficiency filters independent and clears them when Geography is selected', () => {
    const onSelectionChange = vi.fn()
    const onProficiencySelectionChange = vi.fn()
    const mount = renderSetup({
      selection: createDrillSelection([]),
      proficiencySelection: ['weak'],
      onSelectionChange,
      onProficiencySelectionChange,
    })
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    act(() => root?.render(config.left))

    const checkboxes = [...mount.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0].checked).toBe(true)
    act(() => checkboxes[1].click())
    expect(onProficiencySelectionChange).toHaveBeenLastCalledWith(['weak', 'developing'])

    const subregion = [...mount.querySelectorAll('button')].find(button => button.textContent?.includes('Northern Europe'))
    act(() => subregion?.click())
    expect(onProficiencySelectionChange).toHaveBeenLastCalledWith([])
    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.objectContaining({ subregionIds: ['northern-europe'] }))
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
    const config = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    act(() => root?.render(config.right))

    const start = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Start Drill')
    expect(start?.disabled).toBe(false)
  })

})
