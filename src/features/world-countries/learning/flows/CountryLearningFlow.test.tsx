// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { CountryLearningFlow } from './CountryLearningFlow'

const useRailsMock = vi.hoisted(() => vi.fn())
const learningMapSurfaceMock = vi.hoisted(() => vi.fn())
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))
vi.mock('./LearningMapSurface', () => ({ LearningMapSurface: (props: { context: ReactNode; mapMeta?: ReactNode; children: ReactNode }) => { learningMapSurfaceMock(props); return createElement('div', null, props.mapMeta, props.context, props.children) } }))
vi.mock('./StagedWalkthroughStep', () => ({
  StagedWalkthroughStep: ({ onMove, onContinue }: { onMove: (offset: -1 | 1) => void; onContinue: () => void }) => <>
    <button type="button" data-testid="walkthrough-previous" onClick={() => onMove(-1)}>Previous</button>
    <button type="button" data-testid="walkthrough-next" onClick={() => onMove(1)}>Next</button>
    <button type="button" data-testid="start-location" onClick={onContinue}>Start location</button>
  </>,
}))
vi.mock('./SchedulerLocationPracticeStep', () => ({
  SchedulerLocationPracticeStep: ({ onSelect, onBack }: { onSelect: (correct: boolean, latencyMs: number) => void; onBack: () => void }) => <>
    <button type="button" data-testid="location-submit" onClick={() => onSelect(true, 100)}>Correct location</button>
    <button type="button" data-testid="location-back" onClick={onBack}>Back to Meet countries</button>
  </>,
}))
vi.mock('./SchedulerPracticeStep', () => ({
  SchedulerPracticeStep: ({ onSubmit }: { onSubmit: (correct: boolean, latencyMs: number) => void }) => <button type="button" data-testid="practice-submit" onClick={() => onSubmit(true, 100)}>Correct Country</button>,
}))
vi.mock('./StagedLearningReadyStep', () => ({
  StagedLearningReadyStep: ({ onNext }: { onNext: () => void }) => <button type="button" data-testid="ready-next" onClick={onNext}>Next</button>,
  FinalRecallGate: ({ onStart }: { onStart: () => void }) => <button type="button" data-testid="final-start" onClick={onStart}>Final recall</button>,
}))
vi.mock('./StagedFinalRecallStep', () => ({ StagedFinalRecallStep: ({ onSubmit }: { onSubmit: (correct: boolean) => void }) => <button type="button" data-testid="final-submit" onClick={() => onSubmit(true)}>Correct final</button> }))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicView', () => ({ GeographyMnemonicView: () => null }))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicEditor', () => ({ GeographyMnemonicEditor: () => null }))
vi.mock('@/features/world-countries/mnemonics/CountryCapitalMnemonicPanel', () => ({ CountryCapitalMnemonicPanel: () => null }))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

const walkthroughEntries: Country[] = [
  { id: 'IS', country: 'Iceland', capital: 'Reykjavík', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  ...entries,
]
const fullWalkthroughEntries: Country[] = [
  ...walkthroughEntries,
  { id: 'DK', country: 'Denmark', capital: 'Copenhagen', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'FI', country: 'Finland', capital: 'Helsinki', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

let root: Root | null = null
let railRoot: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  act(() => railRoot?.unmount())
  root = null
  railRoot = null
  document.body.replaceChildren()
  localStorage.clear()
  useRailsMock.mockReset()
  learningMapSurfaceMock.mockReset()
})

function renderRail() {
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { right?: ReactNode; left?: ReactNode } | undefined
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    railRoot = createRoot(mount)
    railRoot.render(createElement('div', null, config?.right))
  })
  return mount
}

function renderLeftRail() {
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left?: ReactNode } | undefined
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    railRoot = createRoot(mount)
    railRoot.render(createElement('div', null, config?.left))
  })
  return mount
}

function renderFlow(flowEntries: readonly Country[] = entries): HTMLDivElement {
  const container = document.createElement('div')
  document.body.append(container)
  act(() => {
    root = createRoot(container)
    root.render(
      <CountryLearningFlow
        continent="Europe"
        subregion="northern-europe"
        entries={flowEntries}
        newItemsPerSet={3}
        schedulerSettings={{ masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }}
        fuzzyMatching={false}
        onPhaseChange={() => undefined}
        onExit={() => undefined}
      />,
    )
  })
  return container
}

function expectCountryWalkthrough(container: HTMLDivElement, task: unknown, country: Country) {
  expect(container.textContent).toContain(country.country)
  expect(container.textContent).not.toContain(country.capital)
  expect(container.textContent).not.toContain('Country ↔ Capital')
  expect(task).toMatchObject({ direction: 'Meet the countries', cue: country.country })
  expect(task).not.toHaveProperty('answerKind')
}

describe('CountryLearningFlow scheduler progress wiring', () => {
  it('keeps the Country walkthrough focused on Country identity while moving between Countries', () => {
    const container = renderFlow(fullWalkthroughEntries)
    const latestTask = () => learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task

    expectCountryWalkthrough(container, latestTask(), fullWalkthroughEntries[0]!)
    expect(container.querySelector('[data-learning-active-scope]')?.textContent).toBe('Current Set · 2 Countries')
    expect(container.querySelector('[data-learning-full-scope]')?.textContent).toBe('Northern Europe · 4 Countries total')

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="walkthrough-next"]')!.click())
    expectCountryWalkthrough(container, latestTask(), fullWalkthroughEntries[1]!)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="walkthrough-previous"]')!.click())
    expectCountryWalkthrough(container, latestTask(), fullWalkthroughEntries[0]!)
  })

  it('shows location scheduler progress only after Location Practice starts', () => {
    const container = document.createElement('div')
    document.body.append(container)
    act(() => {
      root = createRoot(container)
      root.render(
        <CountryLearningFlow
          continent="Europe"
          subregion="northern-europe"
          entries={entries}
          newItemsPerSet={3}
          schedulerSettings={{ masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }}
          fuzzyMatching={false}
          onPhaseChange={() => undefined}
          onExit={() => undefined}
        />,
      )
    })

    expect(renderRail().querySelector('[role="progressbar"]')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())

    const locationRail = renderRail()
    expect(locationRail.textContent).toContain('Practice progress')
    expect(locationRail.textContent).toContain('0%')
    expect(locationRail.textContent).toContain('0 / 1 at target')
  })

  it('passes Country answer semantics to the shared map surface for active location practice', () => {
    const container = document.createElement('div')
    document.body.append(container)
    act(() => {
      root = createRoot(container)
      root.render(
        <CountryLearningFlow
          continent="Europe"
          subregion="northern-europe"
          entries={entries}
          newItemsPerSet={3}
          schedulerSettings={{ masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }}
          fuzzyMatching={false}
          onPhaseChange={() => undefined}
          onExit={() => undefined}
        />,
      )
    })

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0]).toMatchObject({ task: { answerKind: 'country' }, cameraIntent: { kind: 'subregion-learning', subregionId: 'northern-europe' } })
  })

  it('returns from Location Practice to Meet the countries with journey-consistent wording', () => {
    const container = renderFlow()
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())

    expect(renderRail().textContent).toContain('Back to Meet countries')
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="location-back"]')!.click())

    expect(container.querySelector('[data-testid="start-location"]')).not.toBeNull()
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task).toMatchObject({ direction: 'Meet the countries', cue: 'Norway' })
  })

  it('keeps established Country progress after completing and restarting Learning', () => {
    const container = renderFlow()
    expect(renderLeftRail().textContent).toContain('Countries not established yet')

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="location-submit"]')!.click())
    }
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="practice-submit"]')!.click())
    }
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-start"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-submit"]')!.click())

    expect(getSubregionLearningState('northern-europe')).toMatchObject({ countriesLearnedAt: expect.any(Number) })
    act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Learn again')?.click())

    expect(container.querySelector('[data-testid="start-location"]')).not.toBeNull()
    const restartedRail = renderLeftRail()
    expect(restartedRail.textContent).toContain('Countries established')
    expect(restartedRail.textContent).not.toContain('Countries not established yet')
  })
})
