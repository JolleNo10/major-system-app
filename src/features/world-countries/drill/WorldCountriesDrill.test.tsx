// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { WorldCountriesDrill } from './WorldCountriesDrill'

const capitalFlowProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
const loadRecallProgressMock = vi.hoisted(() => vi.fn(async () => new Map()))
const resolveProficiencyScopeMock = vi.hoisted(() => vi.fn(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] })))

vi.mock('./DrillSetup', () => ({
  DrillSetup: ({ onLearnPracticeStart, onProficiencySelectionChange }: { onLearnPracticeStart: (mode: string) => void; onProficiencySelectionChange: (selection: readonly string[]) => void }) => createElement(
    'div',
    null,
    createElement('button', { type: 'button', 'data-testid': 'select-proficiency', onClick: () => onProficiencySelectionChange(['weak']) }, 'Select weak'),
    createElement('button', { type: 'button', 'data-testid': 'start-capital-learning', onClick: () => onLearnPracticeStart('learn-capitals') }, 'Start capital learning'),
  ),
}))

vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({ ...await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>(), loadWorldCountriesRecallProgress: loadRecallProgressMock }))
vi.mock('./drillProficiencyScope', async importOriginal => ({ ...await importOriginal<typeof import('./drillProficiencyScope')>(), resolveDrillProficiencyScope: resolveProficiencyScopeMock }))

vi.mock('@/features/world-countries/learning/flows/CapitalLearningFlow', () => ({
  CapitalLearningFlow: (props: Record<string, unknown>) => {
    capitalFlowProps.current = props
    return createElement('div', { 'data-testid': 'capital-learning' })
  },
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  capitalFlowProps.current = null
  document.body.replaceChildren()
  loadRecallProgressMock.mockClear()
  resolveProficiencyScopeMock.mockReset()
  resolveProficiencyScopeMock.mockImplementation(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] }))
  localStorage.clear()
})

describe('WorldCountriesDrill learning integration', () => {
  it('passes durable Country readiness into Capital Learning', () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered',
    }))
    markSubregionCountriesLearned('northern-europe', 123)

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="start-capital-learning"]')!.click())

    expect(mount.querySelector('[data-testid="capital-learning"]')).not.toBeNull()
    expect(capitalFlowProps.current?.countriesLearned).toBe(true)
  })

  it('starts proficiency Learning as a temporary Country scope', async () => {
    resolveProficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 0 }, countryIds: ['AL'], countries: [{}] } as never)
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: [], mode: 'countries', order: 'ordered',
    }))

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="select-proficiency"]')!.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="start-capital-learning"]')!.click()
      await Promise.resolve()
    })

    expect(capitalFlowProps.current?.scopeLabel).toBe('Proficiency scope')
    expect(capitalFlowProps.current?.recordCompletion).toBe(false)
    expect((capitalFlowProps.current?.entries as readonly { id: string }[]).map(entry => entry.id)).toEqual(['AL'])
  })
})
