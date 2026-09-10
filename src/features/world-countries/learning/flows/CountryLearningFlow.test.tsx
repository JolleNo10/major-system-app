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
  StagedLearningReadyStep: ({ title, summary, nextDescription, nextLabel, onNext }: { title: string; summary: string; nextDescription: string; nextLabel: string; onNext: () => void }) => <><div data-testid="ready-copy">{title} {summary} {nextDescription} {nextLabel}</div><button type="button" data-testid="ready-next" onClick={onNext}>Next</button></>,
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
const setProgressEntries: Country[] = [
  ...fullWalkthroughEntries,
  { id: 'EE', country: 'Estonia', capital: 'Tallinn', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'LV', country: 'Latvia', capital: 'Riga', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'LT', country: 'Lithuania', capital: 'Vilnius', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'GB', country: 'United Kingdom', capital: 'London', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'IE', country: 'Ireland', capital: 'Dublin', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
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
    railRoot?.unmount()
    railRoot = createRoot(mount)
    railRoot.render(createElement('div', null, config?.left))
  })
  return mount
}

function renderFlow(flowEntries: readonly Country[] = entries, countriesEstablished = false, capitalsEstablished = false): HTMLDivElement {
  const container = document.createElement('div')
  document.body.append(container)
  act(() => {
    root = createRoot(container)
    root.render(
      <CountryLearningFlow
        continent="Europe"
        subregion="northern-europe"
        entries={flowEntries}
        countriesEstablished={countriesEstablished}
        capitalsEstablished={capitalsEstablished}
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
  expect(container.textContent).not.toMatch(/Step [23]/)
}

describe('CountryLearningFlow scheduler progress wiring', () => {
  it('reports the actual completed Set outcome and truthful next stage', () => {
    const container = renderFlow(entries)
    expect(container.textContent).not.toContain('Set 1')

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())
    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="location-submit"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="location-submit"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task).toMatchObject({ direction: 'Recall the countries', sessionContext: '1 country' })
    expect(container.textContent).not.toMatch(/Step [23]/)
    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="practice-submit"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="practice-submit"]')!.click())

    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).toContain('Practice complete')
    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).not.toContain('Set 1')
    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).toContain('You recalled all 1 country in this practice.')
    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).toContain('Start final recall')
  })

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

  it('retains Set identity when a Learning plan has multiple Sets', () => {
    const container = renderFlow(fullWalkthroughEntries)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task).toMatchObject({ sessionContext: 'Set 1 · 2 countries' })
  })

  it('seeds Country progress from existing durable state on a fresh flow', () => {
    const container = renderFlow(entries, true)
    const leftRail = renderLeftRail()

    expect(leftRail.textContent).toContain('Meet the countries')
    expect(leftRail.textContent).not.toContain('Learning progress')
    expect(container.querySelector('[data-testid="start-location"]')).not.toBeNull()
  })

  it('keeps full-order map numbering and previous/current/upcoming Set states aligned', () => {
    const container = renderFlow(setProgressEntries)
    const latestTask = () => learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0]

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())
    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="location-submit"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="location-submit"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="practice-submit"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="practice-submit"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())

    const leftRail = renderLeftRail()
    expect(leftRail.querySelectorAll('[data-learning-set="previous"]')).toHaveLength(3)
    expect(leftRail.querySelectorAll('[data-learning-set="current"]')).toHaveLength(3)
    expect(leftRail.querySelectorAll('[data-learning-set="upcoming"]')).toHaveLength(3)
    expect(leftRail.querySelector('[data-learning-set="previous"]')?.textContent).toContain('Iceland')
    expect(leftRail.querySelector('[data-learning-set="current"]')?.textContent).toContain('Finland')
    expect(leftRail.querySelector('[data-learning-set="upcoming"]')?.textContent).toContain('Lithuania')

    const labels = latestTask().presentation.countryLabelsById as ReadonlyMap<string, string>
    expect(labels.get('FI')).toBe('4. Finland')
    expect(labels.get('EE')).toBe('5. Estonia')
    expect(labels.get('LV')).toBe('6. Latvia')
    expect(labels.get('FI')).not.toBe('1. Finland')
  })

  it('keeps Country context truthful through Combined and Final phases', () => {
    const container = renderFlow(fullWalkthroughEntries)
    const finishSet = () => {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-location"]')!.click())
      for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="location-submit"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="location-submit"]')!.click())
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
      for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="practice-submit"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="practice-submit"]')!.click())
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    }

    finishSet()
    finishSet()

    const combinedRail = renderLeftRail()
    expect(combinedRail.textContent).toContain("Mix what you've learned")
    expect(combinedRail.textContent).toContain('4 of 4 Countries introduced')
    expect(combinedRail.querySelectorAll('[data-learning-set="introduced"]')).toHaveLength(4)
    expect(combinedRail.querySelector('[data-learning-current-set]')).toBeNull()

    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="practice-submit"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="practice-submit"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())

    const finalGateRail = renderLeftRail()
    expect(finalGateRail.textContent).toContain('Final recall')
    expect(finalGateRail.textContent).toContain('All 4 Countries')
    expect(finalGateRail.querySelectorAll('[data-learning-set="active-scope"]')).toHaveLength(4)
    expect(finalGateRail.querySelector('[data-learning-current-set]')).toBeNull()
    expect(finalGateRail.querySelector('[data-learning-previous-set]')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-start"]')!.click())
    const finalRecallRail = renderLeftRail()
    expect(finalRecallRail.textContent).toContain('All 4 Countries')
    expect(finalRecallRail.textContent).not.toContain('Upcoming')
  })

  it('keeps location scheduler progress on the center task surface', () => {
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
    expect(locationRail.textContent).not.toContain('Practice progress')
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task.progress).toMatchObject({ label: 'Find', current: 0, total: 1 })
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
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0]).toMatchObject({ task: { answerKind: 'country', direction: 'Find the countries', sessionContext: '1 country' }, cameraIntent: { kind: 'subregion-learning', subregionId: 'northern-europe' } })
    expect(container.textContent).not.toMatch(/Step [23]/)
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
    expect(renderLeftRail().textContent).toContain('Meet the countries')

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
    expect(restartedRail.textContent).toContain('Meet the countries')
    expect(restartedRail.textContent).not.toContain('Learning progress')
  })
})
