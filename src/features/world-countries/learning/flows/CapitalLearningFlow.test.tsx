// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { CapitalLearningFlow } from './CapitalLearningFlow'

const useRailsMock = vi.hoisted(() => vi.fn())
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))
vi.mock('./LearningMapSurface', () => ({ LearningMapSurface: ({ context, children }: { context: ReactNode; children: ReactNode }) => createElement('div', null, context, children) }))
vi.mock('./StagedCapitalWalkthroughStep', () => ({
  StagedCapitalWalkthroughStep: ({ onContinue }: { onContinue: () => void }) => <button type="button" data-testid="start-practice" onClick={onContinue}>Start practice</button>,
}))
vi.mock('./SchedulerPracticeStep', () => ({
  SchedulerPracticeStep: ({ onSubmit }: { onSubmit: (correct: boolean, latencyMs: number) => void }) => <button type="button" data-testid="submit-correct" onClick={() => onSubmit(true, 100)}>Correct</button>,
}))
vi.mock('./StagedLearningReadyStep', () => ({
  StagedLearningReadyStep: ({ onNext, onKeepPractising }: { onNext: () => void; onKeepPractising?: () => void }) => <><button type="button" data-testid="ready-next" onClick={onNext}>Next</button>{onKeepPractising && <button type="button" data-testid="ready-keep" onClick={onKeepPractising}>Keep practising</button>}</>,
  FinalRecallGate: ({ onStart }: { onStart: () => void }) => <button type="button" data-testid="final-start" onClick={onStart}>Final recall</button>,
}))
vi.mock('./StagedFinalRecallStep', () => ({
  StagedFinalRecallStep: ({ onSubmit }: { onSubmit: (correct: boolean) => void }) => <button type="button" data-testid="final-submit" onClick={() => onSubmit(true)}>Correct final</button>,
}))
vi.mock('./CapitalLearningComplete', () => ({
  CapitalLearningComplete: ({ onRestart }: { onRestart: () => void }) => <button type="button" data-testid="restart" onClick={onRestart}>Review again</button>,
}))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicView', () => ({ GeographyMnemonicView: () => null }))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicEditor', () => ({ GeographyMnemonicEditor: () => null }))
vi.mock('@/features/world-countries/mnemonics/CountryCapitalMnemonicPanel', () => ({ CountryCapitalMnemonicPanel: () => null }))

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

let root: Root | null = null
let railRoot: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  act(() => railRoot?.unmount())
  root = null
  railRoot = null
  localStorage.clear()
  useRailsMock.mockReset()
})

function renderFlow(onPhaseChange: (phase: string) => void): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      <CapitalLearningFlow
        continent="Europe"
        subregion="northern-europe"
        entries={entries}
        newItemsPerSet={3}
        schedulerSettings={{ masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }}
        countriesLearned={false}
        fuzzyMatching={false}
        onPhaseChange={onPhaseChange}
        onExit={() => undefined}
      />,
    )
  })
  return container
}

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

describe('CapitalLearningFlow orchestration', () => {
  it('reports staged phases and persists completion only after Final recall', () => {
    const phases: string[] = []
    const container = renderFlow(phase => phases.push(phase))

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    }
    expect(container.querySelector('[data-testid="ready-next"]')).not.toBeNull()
    expect(getSubregionLearningState('northern-europe')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-start"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-submit"]')!.click())

    expect(phases).toEqual(['practice', 'set-ready', 'final-gate', 'final-recall', 'complete'])
    expect(getSubregionLearningState('northern-europe')).toMatchObject({ capitalsLearnedAt: expect.any(Number) })

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="restart"]')!.click())
    expect(phases).toEqual(['practice', 'set-ready', 'final-gate', 'final-recall', 'complete', 'walkthrough'])
  })

  it('shows scheduler progress during Capital Set Practice', () => {
    const container = renderFlow(() => undefined)

    expect(renderRail().querySelector('[role="progressbar"]')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())

    const practiceRail = renderRail()
    expect(practiceRail.textContent).toContain('Practice progress')
    expect(practiceRail.textContent).toContain('0%')
    expect(practiceRail.textContent).toContain('0 / 1 at target')
  })

  it('hides progress at Ready and resumes retained progress when practising continues', () => {
    const container = renderFlow(() => undefined)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    }

    expect(renderRail().querySelector('[role="progressbar"]')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-keep"]')!.click())

    const resumedRail = renderRail()
    expect(resumedRail.textContent).toContain('100%')
    expect(resumedRail.textContent).toContain('1 / 1 at target')
  })
})
