// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
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
  SchedulerLocationPracticeStep: () => <div>Location practice</div>,
}))
vi.mock('./SchedulerPracticeStep', () => ({
  SchedulerPracticeStep: () => <div>Country practice</div>,
}))
vi.mock('./StagedLearningReadyStep', () => ({
  StagedLearningReadyStep: () => <div>Ready</div>,
  FinalRecallGate: () => <div>Final recall gate</div>,
}))
vi.mock('./StagedFinalRecallStep', () => ({ StagedFinalRecallStep: () => <div>Final recall</div> }))
vi.mock('./CountryLearningComplete', () => ({ CountryLearningComplete: () => <div>Complete</div> }))
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
  useRailsMock.mockReset()
  learningMapSurfaceMock.mockReset()
})

function renderRail() {
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { right?: ReactNode } | undefined
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    railRoot = createRoot(mount)
    railRoot.render(createElement('div', null, config?.right))
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
})
