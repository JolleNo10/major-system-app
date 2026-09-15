// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Country } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { WORLD_COUNTRIES_CORE_RECALL_SKILLS, recallTargetIdFor } from '@/features/world-countries/learning/recallTargets'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { CapitalLearningFlow } from './CapitalLearningFlow'

const useRailsMock = vi.hoisted(() => vi.fn())
const learningMapSurfaceMock = vi.hoisted(() => vi.fn())
const recordAttemptMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>()),
  recordWorldCountriesAttempt: recordAttemptMock,
}))
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))
vi.mock('./LearningMapSurface', () => ({ LearningMapSurface: (props: { context: ReactNode; mapMeta?: ReactNode; children: ReactNode }) => { learningMapSurfaceMock(props); return createElement('div', null, props.mapMeta, props.context, props.children) } }))
vi.mock('./StagedWalkthroughStep', () => ({
  StagedWalkthroughStep: ({ onContinue }: { onContinue: () => void }) => <button type="button" data-testid="start-practice" onClick={onContinue}>Start practice</button>,
}))
vi.mock('./SchedulerPracticeStep', () => ({
  SchedulerPracticeStep: ({ onSubmit }: { onSubmit: (correct: boolean, latencyMs: number) => void }) => <button type="button" data-testid="submit-correct" onClick={() => onSubmit(true, 100)}>Correct</button>,
}))
vi.mock('./StagedLearningReadyStep', () => ({
  StagedLearningReadyStep: ({ title, summary, nextDescription, nextLabel, onNext, onKeepPractising, celebration }: { title: string; summary: string; nextDescription: string; nextLabel: string; onNext: () => void; onKeepPractising?: () => void; celebration?: string }) => <><div data-testid="ready-copy">{title} {summary} {nextDescription} {nextLabel}</div>{celebration && <span data-celebration-level={celebration} />}<button type="button" data-testid="ready-next" onClick={onNext}>Next</button>{onKeepPractising && <button type="button" data-testid="ready-keep" onClick={onKeepPractising}>Keep practising</button>}</>,
  FinalRecallGate: ({ onStart }: { onStart: () => void }) => <button type="button" data-testid="final-start" onClick={onStart}>Final recall</button>,
}))
vi.mock('./StagedFinalRecallStep', () => ({
  StagedFinalRecallStep: ({ entries: finalEntries, onSubmit, onRecordAnswer }: { entries: readonly Country[]; onSubmit: (correct: boolean) => void; onRecordAnswer?: (country: Country, correct: boolean, latencyMs: number) => void }) => <button type="button" data-testid="final-submit" onClick={() => { onRecordAnswer?.(finalEntries[0], true, 1234); onSubmit(true) }}>Correct final</button>,
}))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicView', () => ({ GeographyMnemonicView: () => null }))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicEditor', () => ({ GeographyMnemonicEditor: () => null }))
vi.mock('@/features/world-countries/mnemonics/CountryCapitalMnemonicPanel', () => ({ CountryCapitalMnemonicPanel: () => null }))

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]
const fullEntries: Country[] = [
  ...entries,
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'DK', country: 'Denmark', capital: 'Copenhagen', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'FI', country: 'Finland', capital: 'Helsinki', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]
const setProgressEntries: Country[] = [
  ...fullEntries,
  { id: 'EE', country: 'Estonia', capital: 'Tallinn', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'LV', country: 'Latvia', capital: 'Riga', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
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
  learningMapSurfaceMock.mockReset()
  recordAttemptMock.mockClear()
})

function renderFlow(onPhaseChange: (phase: string) => void, flowEntries: readonly Country[] = entries, countriesEstablished = false, capitalsEstablished = false, recallProgress?: RecallProgress, recordCompletion = true): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      <CapitalLearningFlow
        continent="Europe"
        subregion="northern-europe"
        entries={flowEntries}
        newItemsPerSet={3}
        schedulerSettings={{ masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }}
        countriesEstablished={countriesEstablished}
        capitalsEstablished={capitalsEstablished}
        recallProgress={recallProgress}
        recordCompletion={recordCompletion}
        fuzzyMatching={false}
        onPhaseChange={onPhaseChange}
        onExit={() => undefined}
      />,
    )
  })
  return container
}

function reachCapitalFinalGate(container: HTMLDivElement): HTMLDivElement {
  act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
  for (let attempt = 0; attempt < 3; attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
  act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())

  const finalRecallRail = renderRail()
  expect(finalRecallRail.textContent).not.toContain('Skip final recall')
  act(() => [...finalRecallRail.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Back to Final recall')?.click())
  return renderRail()
}

function strongRecallProgress(): RecallProgress {
  return deriveWorldCountriesRecallProgress({ countryIds: ['NO'], skills: [...WORLD_COUNTRIES_CORE_RECALL_SKILLS] }, WORLD_COUNTRIES_CORE_RECALL_SKILLS.flatMap((skill, index) => [
    { itemId: recallTargetIdFor('NO', skill), at: index * 2 + 1, ok: true, ms: 500, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
    { itemId: recallTargetIdFor('NO', skill), at: index * 2 + 2, ok: true, ms: 500, evidenceKind: 'recall' as const, localDate: '2026-08-10' },
  ]))
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

describe('CapitalLearningFlow orchestration', () => {
  it('reports the actual completed Capital Set outcome', () => {
    const container = renderFlow(() => undefined)
    expect(container.textContent).not.toContain('Set 1')

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0]).toMatchObject({ task: { direction: 'Recall the capitals', sessionContext: '1 country–capital pair' } })
    expect(container.textContent).not.toMatch(/Step [23]/)
    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="submit-correct"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())

    expect(container.querySelector('[data-celebration-level]')?.getAttribute('data-celebration-level')).toBe('set')
    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).toContain('Practice complete')
    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).not.toContain('Set 1')
    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).toContain('You recalled all 1 country–capital pair in this practice.')
    expect(container.querySelector('[data-testid="ready-copy"]')?.textContent).toContain('Start final recall')
  })

  it('shows derived Country readiness when Capital Learning follows mastered Country recall', () => {
    const container = renderFlow(() => undefined, entries, true)
    const leftRail = renderLeftRail()

    expect(container.textContent).toContain('Norway')
    expect(leftRail.textContent).toContain('Meet the capitals')
    expect(leftRail.textContent).not.toContain('Learning progress')
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.highlightedCountryId).toBe('NO')
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.countryPatternsById?.has('NO')).toBe(false)
  })

  it('seeds established Country and Capital progress on a fresh flow', () => {
    const container = renderFlow(() => undefined, entries, true, true, strongRecallProgress())
    const leftRail = renderLeftRail()

    expect(container.textContent).toContain('Norway')
    expect(leftRail.textContent).toContain('Meet the capitals')
    expect(leftRail.textContent).not.toContain('Learning progress')
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.countryPatternsById).toBeUndefined()
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.countryColorsById?.get('NO')).toBe('#769A70')
  })

  it('keeps Country ↔ Capital presentation in the Capital walkthrough', () => {
    const container = renderFlow(() => undefined)
    const task = learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task

    expect(container.textContent).toContain('Norway ↔ Oslo')
    expect(task).toMatchObject({ direction: 'Meet the capitals', cue: 'Norway ↔ Oslo' })
    expect(container.textContent).not.toMatch(/Step [23]/)
  })

  it('retains Set identity when a Capital plan has multiple Sets', () => {
    const container = renderFlow(() => undefined, fullEntries)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task).toMatchObject({ sessionContext: 'Set 1 · 2 country–capital pairs' })
  })

  it('identifies the current Capital Set within the full Subregion', () => {
    const container = renderFlow(() => undefined, fullEntries)

    expect(container.querySelector('[data-learning-active-scope]')?.textContent).toBe('Current Set · 2 Countries')
    expect(container.querySelector('[data-learning-full-scope]')?.textContent).toBe('Northern Europe · 4 Countries total')
  })

  it('keeps Capital walkthrough map numbering aligned with the full Learning Order', () => {
    const container = renderFlow(() => undefined, setProgressEntries)
    const latestSurface = () => learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0]

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="submit-correct"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())

    const labels = latestSurface().presentation.countryLabelsById as ReadonlyMap<string, string>
    expect(labels.get('FI')).toBe('4. Finland')
    expect(labels.get('EE')).toBe('5. Estonia')
    expect(labels.get('LV')).toBe('6. Latvia')
    expect(labels.get('FI')).not.toBe('1. Finland')

    const leftRail = renderLeftRail()
    expect(leftRail.querySelectorAll('[data-learning-set="previous"]')).toHaveLength(3)
    expect(leftRail.querySelectorAll('[data-learning-set="current"]')).toHaveLength(3)
  })

  it('keeps Capital context truthful through Combined and Final phases', () => {
    const container = renderFlow(() => undefined, fullEntries)
    const finishSet = () => {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
      for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="submit-correct"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    }

    finishSet()
    finishSet()

    const combinedRail = renderLeftRail()
    expect(combinedRail.textContent).toContain("Mix what you've learned")
    expect(combinedRail.textContent).toContain('4 of 4 Countries introduced')
    expect(combinedRail.querySelectorAll('[data-learning-set="introduced"]')).toHaveLength(4)
    expect(combinedRail.querySelector('[data-learning-current-set]')).toBeNull()

    for (let attempt = 0; attempt < 20 && container.querySelector('[data-testid="submit-correct"]'); attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    expect(container.querySelector('[data-celebration-level]')).toBeNull()
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())

    const finalRecallRail = renderLeftRail()
    expect(finalRecallRail.textContent).toContain('Final recall')
    expect(finalRecallRail.textContent).toContain('All 4 Countries')
    expect(finalRecallRail.querySelectorAll('[data-learning-set="active-scope"]')).toHaveLength(4)
    expect(finalRecallRail.querySelector('[data-learning-current-set]')).toBeNull()
    expect(finalRecallRail.querySelector('[data-learning-previous-set]')).toBeNull()
    expect(finalRecallRail.textContent).toContain('All 4 Countries')
    expect(finalRecallRail.textContent).not.toContain('Upcoming')
  })

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
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-submit"]')!.click())

    expect(phases).toEqual(['practice', 'set-ready', 'final-recall', 'complete'])
    expect(getSubregionLearningState('northern-europe')).toMatchObject({ capitalsLearnedAt: expect.any(Number) })
    expect(getSubregionLearningState('northern-europe')).not.toHaveProperty('countriesLearnedAt')

    act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Learn again')?.click())
    expect(phases).toEqual(['practice', 'set-ready', 'final-recall', 'complete', 'walkthrough'])
    expect(renderLeftRail().textContent).toContain('Meet the capitals')
    expect(renderLeftRail().textContent).not.toContain('Learning progress')
  })

  it('records Final recall as Country → Capital recall evidence', () => {
    const container = renderFlow(() => undefined)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    }
    expect(recordAttemptMock).not.toHaveBeenCalled()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-submit"]')!.click())

    expect(recordAttemptMock).toHaveBeenCalledTimes(1)
    expect(recordAttemptMock).toHaveBeenCalledWith('NO', 'country-to-capital', expect.objectContaining({
      ok: true,
      ms: 1234,
      evidenceKind: 'recall',
    }))
  })

  it('writes no Final recall evidence for a non-durable Relearn run', () => {
    const container = renderFlow(() => undefined, entries, true, true, new Map(), false)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    }
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-submit"]')!.click())

    expect(recordAttemptMock).not.toHaveBeenCalled()
    expect(getSubregionLearningState('northern-europe')).toBeNull()
  })

  it('keeps Countries established when Capital Learning completes after Country Learning', () => {
    const container = renderFlow(() => undefined, entries, true, false, new Map())

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    }
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-submit"]')!.click())

    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.countryPatternsById).toBeUndefined()
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.countryColorsById?.get('NO')).toBe('#90796F')

    act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Learn again')?.click())

    expect(renderLeftRail().textContent).toContain('Meet the capitals')
    expect(renderLeftRail().textContent).not.toContain('Learning progress')
  })

  it('keeps the Countries-learned pattern for non-durable Capital completion', () => {
    const container = renderFlow(() => undefined, entries, true, false, new Map(), false)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-submit"]')!.click())

    const presentation = learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation
    expect(presentation.countryPatternsById?.get('NO')).toMatchObject({ kind: 'diagonal' })
    expect(presentation.countryColorsById).toBeUndefined()
  })

  it('confirms skipping Final recall before completing Capital Learning', () => {
    const phases: string[] = []
    const container = renderFlow(phase => phases.push(phase))
    const finalGateRail = reachCapitalFinalGate(container)
    const actionButtons = [...finalGateRail.querySelectorAll<HTMLButtonElement>('button')]

    expect(actionButtons.slice(0, 3).map(button => button.textContent)).toEqual(['Skip final recall', 'Back', 'Exit'])
    act(() => actionButtons[0]!.click())

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.textContent).toContain('Northern Europe · Capitals')
    expect(dialog.textContent).toContain('does not create recall or mastery evidence')
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(phases).not.toContain('complete')

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-recall-skip-confirm"]')!.click())

    expect(phases).toContain('complete')
    expect(getSubregionLearningState('northern-europe')).toMatchObject({ capitalsLearnedAt: expect.any(Number) })
    expect(container.textContent).toContain('Capitals learned')
  })

  it('completes a temporary Capital run when Final recall is skipped without writing a milestone', () => {
    const container = renderFlow(() => undefined, entries, false, false, undefined, false)
    const finalGateRail = reachCapitalFinalGate(container)

    act(() => [...finalGateRail.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Skip final recall')?.click())
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('temporary Capitals run')
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="final-recall-skip-confirm"]')!.click())

    expect(container.textContent).toContain("doesn't change your guided region progress")
    expect(getSubregionLearningState('northern-europe')).toBeNull()
  })

  it('keeps Capital scheduler progress on the center task surface', () => {
    const container = renderFlow(() => undefined)

    expect(renderRail().querySelector('[role="progressbar"]')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())

    const practiceRail = renderRail()
    expect(practiceRail.textContent).not.toContain('Practice progress')
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task.progress).toMatchObject({ label: 'Recall', current: 0, total: 1 })
  })

  it('passes Capital answer semantics to the shared map surface during practice and Final recall', () => {
    const container = renderFlow(() => undefined, entries, true)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0]).toMatchObject({ task: { answerKind: 'capital' }, cameraIntent: { kind: 'subregion-learning', subregionId: 'northern-europe' } })
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.highlightedCountryId).toBe('NO')
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation.countryPatternsById?.has('NO')).toBe(false)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    }
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-next"]')!.click())

    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0]).toMatchObject({ task: { answerKind: 'capital' }, cameraIntent: { kind: 'subregion-learning', subregionId: 'northern-europe' } })
    const finalRecallPresentation = learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].presentation
    expect(finalRecallPresentation.highlightedCountryId).toBe('NO')
    expect(finalRecallPresentation.countryPatternsById?.has('NO')).toBe(false)
  })

  it('hides progress at Ready and resumes retained progress on the center task surface', () => {
    const container = renderFlow(() => undefined)

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="start-practice"]')!.click())
    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => container.querySelector<HTMLButtonElement>('[data-testid="submit-correct"]')!.click())
    }

    expect(renderRail().querySelector('[role="progressbar"]')).toBeNull()

    act(() => container.querySelector<HTMLButtonElement>('[data-testid="ready-keep"]')!.click())

    const resumedRail = renderRail()
    expect(resumedRail.textContent).not.toContain('Practice progress')
    expect(learningMapSurfaceMock.mock.calls[learningMapSurfaceMock.mock.calls.length - 1]?.[0].task.progress).toMatchObject({ label: 'Recall', current: 1, total: 1, percent: 100 })
  })
})
