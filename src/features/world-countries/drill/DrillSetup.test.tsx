// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDrillSelection } from './drillSelection'
import { DrillSetup } from './DrillSetup'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const useRailsMock = vi.hoisted(() => vi.fn())
const mapMock = vi.hoisted(() => vi.fn())
const loadRecallProgressMock = vi.hoisted(() => vi.fn(async () => new Map()))
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))
vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({ GeographyOverviewMap: (props: Record<string, unknown>) => { mapMock(props); return createElement('div', { 'data-testid': 'map' }) } }))
vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({ ...await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>(), loadWorldCountriesRecallProgress: loadRecallProgressMock }))

let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); useRailsMock.mockReset(); mapMock.mockReset(); loadRecallProgressMock.mockClear(); localStorage.clear() })

function renderSetup(overrides: Record<string, unknown> = {}) {
  const mount = document.createElement('div'); document.body.append(mount)
  act(() => { root = createRoot(mount); root.render(createElement(DrillSetup, { level: 'continent', selection: createDrillSelection('Europe', ['northern-europe']), mode: 'countries', order: 'ordered', purpose: 'drill', learnPracticeMode: 'learn-countries', learningStates: [], onSelectionChange: vi.fn(), onModeChange: vi.fn(), onOrderChange: vi.fn(), onPurposeChange: vi.fn(), onLearnPracticeModeChange: vi.fn(), onStart: vi.fn(), onLearnPracticeStart: vi.fn(), onWorld: vi.fn(), onSelectContinent: vi.fn(), hoveredGroupId: null, onHoverGroup: vi.fn(), ...overrides } as never)) })
  return mount
}

describe('DrillSetup activity boundary', () => {
  it('exposes exactly three Drill modes and keeps geography authoring in the rail', () => {
    const mount = renderSetup()
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode; right: ReactNode }
    act(() => root?.render(createElement('div', null, config.left, config.right)))
    expect(mount.textContent).toContain('Countries + Capitals')
    expect(mount.textContent).toContain('Countries from Capitals')
    expect(mount.textContent).not.toContain('Learn Countries')
    expect(mount.querySelectorAll('input[type="radio"]')).toHaveLength(5)
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
    expect(mount.textContent).toContain('Capitals')
    expect(mount.textContent).toContain('non-recording')
    expect(mount.textContent).not.toContain('Drill order')
    expect(mount.textContent).toContain('Recommendation: Learn Countries first')
    const start = [...mount.querySelectorAll('button')].find(button => button.textContent === 'Start Learning')
    act(() => start?.click())
    expect(onStart).toHaveBeenCalledWith('learn-capitals')
  })

  it('explains that a Continent needs a Subregion before Drill can start', () => {
    const mount = renderSetup({ selection: createDrillSelection('Europe', []) })
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
    const mount = renderSetup({ selection: createDrillSelection('Europe', []) })
    const config = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    act(() => root?.render(config.left))
    expect(mount.textContent).toContain('Northern Europe')
    expect(mount.textContent).toMatch(/Northern Europe[\s\S]*\d+ Countries/)
  })

})
