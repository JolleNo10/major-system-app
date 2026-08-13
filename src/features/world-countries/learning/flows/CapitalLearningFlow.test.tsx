// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { CapitalLearningFlow } from './CapitalLearningFlow'

vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: vi.fn() }))
vi.mock('./LearningMapSurface', () => ({ LearningMapSurface: ({ context, children }: { context: ReactNode; children: ReactNode }) => createElement('div', null, context, children) }))
vi.mock('./StagedCapitalWalkthroughStep', () => ({
  StagedCapitalWalkthroughStep: ({ onContinue }: { onContinue: () => void }) => <button type="button" data-testid="start-practice" onClick={onContinue}>Start practice</button>,
}))
vi.mock('./SchedulerPracticeStep', () => ({
  SchedulerPracticeStep: ({ onSubmit }: { onSubmit: (correct: boolean, latencyMs: number) => void }) => <button type="button" data-testid="submit-correct" onClick={() => onSubmit(true, 100)}>Correct</button>,
}))
vi.mock('./StagedLearningReadyStep', () => ({
  StagedLearningReadyStep: ({ onNext }: { onNext: () => void }) => <button type="button" data-testid="ready-next" onClick={onNext}>Next</button>,
  FinalRecallGate: ({ onStart }: { onStart: () => void }) => <button type="button" data-testid="final-start" onClick={onStart}>Final recall</button>,
}))
vi.mock('./StagedFinalRecallStep', () => ({
  StagedFinalRecallStep: ({ onSubmit }: { onSubmit: (correct: boolean) => void }) => <button type="button" data-testid="final-submit" onClick={() => onSubmit(true)}>Correct final</button>,
}))
vi.mock('./CapitalLearningComplete', () => ({
  CapitalLearningComplete: ({ onRestart }: { onRestart: () => void }) => <button type="button" data-testid="restart" onClick={onRestart}>Review again</button>,
}))

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  localStorage.clear()
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
})
