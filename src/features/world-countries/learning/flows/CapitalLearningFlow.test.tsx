// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { CapitalLearningFlow } from './CapitalLearningFlow'

vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: vi.fn(),
}))

vi.mock('./CapitalWalkthroughStep', () => ({
  CapitalWalkthroughStep: ({ onStartRecall }: { onStartRecall: () => void }) => (
    <button type="button" data-testid="start-recall" onClick={onStartRecall}>Start recall</button>
  ),
}))

vi.mock('./CapitalRecallStep', () => ({
  CapitalRecallStep: ({ onSubmit }: { onSubmit: (correct: boolean) => void }) => (
    <button type="button" data-testid="submit-correct" onClick={() => onSubmit(true)}>Correct</button>
  ),
}))

vi.mock('./CapitalLearningComplete', () => ({
  CapitalLearningComplete: ({ onRestart }: { onRestart: () => void }) => (
    <button type="button" data-testid="restart" onClick={onRestart}>Review again</button>
  ),
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

function renderFlow(onPhaseChange: (phase: 'walkthrough' | 'recall' | 'complete') => void, startInRecall = false, countriesLearned = true): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      <CapitalLearningFlow
        continent="Europe"
        subregion="northern-europe"
        entries={entries}
        countriesLearned={countriesLearned}
        fuzzyMatching={false}
        onPhaseChange={onPhaseChange}
        onExit={() => undefined}
        startInRecall={startInRecall}
      />,
    )
  })
  return container
}

describe('CapitalLearningFlow orchestration', () => {
  it('reports phases, persists completion, and resets the reporter on review', () => {
    const phases: Array<'walkthrough' | 'recall' | 'complete'> = []
    const container = renderFlow(phase => phases.push(phase))

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-recall"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    expect(phases).toEqual(['recall', 'complete'])
    expect(getSubregionLearningState('northern-europe')).toMatchObject({ capitalsLearnedAt: expect.any(Number) })

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="restart"]')!.click())
    expect(phases).toEqual(['recall', 'complete', 'walkthrough'])
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-recall"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    expect(phases).toEqual(['recall', 'complete', 'walkthrough', 'recall', 'complete'])
  })

  it('can enter directly into capital recall for practice', () => {
    const phases: Array<'walkthrough' | 'recall' | 'complete'> = []
    const container = renderFlow(phase => phases.push(phase), true)

    expect(container.querySelector('[data-testid="submit-correct"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="start-recall"]')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    expect(phases).toEqual(['complete'])
  })

  it('rejects direct workflow entry before Countries learning is complete', () => {
    const container = renderFlow(vi.fn(), false, false)
    expect(container.textContent).toContain('Complete Countries first.')
    expect(container.querySelector('[data-testid="start-recall"]')).toBeNull()
  })
})
