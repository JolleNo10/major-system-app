// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { createOrderedRecallSession, submitOrderedRecall, type OrderedRecallState } from '@/features/world-countries/learning/orderedRecallSession'
import { StagedFinalRecallStep } from './StagedFinalRecallStep'
import { LearningMapSurface } from './LearningMapSurface'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => createElement('div', { 'data-testid': 'country-learning-map' }),
}))

const country: Country = {
  id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}
const secondCountry: Country = {
  id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}
let root: Root | null = null

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

afterEach(() => {
  vi.useRealTimers()
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('StagedFinalRecallStep', () => {
  it('waits for explicit continuation after a fuzzy spelling answer', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    const onSubmit = vi.fn()
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, createElement(LearningMapSurface, {
        continent: 'Europe', scopeCountries: [country], presentation: { ariaLabel: 'Final recall map' }, presentationKey: 'final',
        context: createElement('h1', null, 'Final recall'),
        task: { direction: 'Country → Capital', cue: 'Norway', progress: { label: 'Country', current: 1, total: 1 } },
        children: createElement(StagedFinalRecallStep, {
        continent: 'Europe', entries: [country],
        ordered: createOrderedRecallSession({ order: [country.id], rewindOnError: 1 }),
        stepLabel: 'Final recall', answerLabel: 'Country → Capital', answerKind: 'capital',
        placeholder: 'Type the capital…', showCountryName: true,
        evaluateAnswer: () => ({ correct: true, fuzzyMatch: true, canonicalAnswer: country.capital }),
        formatFeedback: evaluation => `Correct. The canonical answer is ${evaluation.canonicalAnswer}.`,
          onSubmit, onBack: vi.fn(), onExit: vi.fn(), surface: true,
        }),
      })))
    })

    const input = mount.querySelector<HTMLInputElement>('input')!
    act(() => typeInto(input, 'Oslos'))
    act(() => mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

    expect(input.disabled).toBe(true)
    expect(mount.querySelector('[data-world-countries-task-direction]')?.textContent).toBe('Country → Capital')
    expect(mount.textContent).toContain('Spelling: Oslo')

    act(() => vi.advanceTimersByTime(1800))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(input.disabled).toBe(true)

    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())
    const miniPractice = mount.querySelector<HTMLElement>('[data-mini-spelling-practice]')!
    expect(miniPractice).not.toBeNull()
    expect(miniPractice.querySelector('[data-mini-spelling-action="return"]')).toBeNull()
    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())
    expect(mount.querySelector('[data-mini-spelling-practice]')).toBeNull()

    expect(onSubmit).not.toHaveBeenCalled()
    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click())
    expect(onSubmit).toHaveBeenCalledWith(true)
  })

  it('re-asks the rewound first country and advances the ordered session after correction', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    const submitted = vi.fn()
    document.body.append(mount)

    function OrderedRecallHarness() {
      const entries = [country, secondCountry]
      const [ordered, setOrdered] = useState<OrderedRecallState<string>>(() => createOrderedRecallSession({
        order: entries.map(entry => entry.id),
        rewindOnError: 1,
      }))

      return createElement('div', null,
        createElement('output', { 'data-testid': 'ordered-state' }, `${ordered.currentIndex}:${ordered.mode}`),
        createElement(StagedFinalRecallStep, {
          continent: 'Europe',
          entries,
          ordered,
          stepLabel: 'Final recall',
          answerLabel: 'Country → Capital',
          answerKind: 'capital',
          placeholder: 'Type the capital…',
          showCountryName: true,
          evaluateAnswer: (answer, entry) => ({
            correct: answer === entry.capital,
            fuzzyMatch: false,
            canonicalAnswer: entry.capital,
          }),
          formatFeedback: evaluation => evaluation.correct ? 'Correct.' : `The correct capital is ${evaluation.canonicalAnswer}.`,
          onSubmit: correct => {
            submitted(correct)
            setOrdered(current => submitOrderedRecall(current, correct).state)
          },
          onBack: vi.fn(),
          onExit: vi.fn(),
          surface: true,
        }),
      )
    }

    act(() => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, createElement(LearningMapSurface, {
        continent: 'Europe',
        scopeCountries: [country, secondCountry],
        presentation: { ariaLabel: 'Final recall map' },
        presentationKey: 'final',
        context: createElement('h1', null, 'Final recall'),
        task: { direction: 'Country → Capital', cue: 'Norway', progress: { label: 'Country', current: 1, total: 2 } },
        children: createElement(OrderedRecallHarness),
      })))
    })

    expect(mount.querySelector('[data-testid="ordered-state"]')?.textContent).toBe('0:clean')

    let input = mount.querySelector<HTMLInputElement>('input')!
    act(() => typeInto(input, 'Stockholm'))
    act(() => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(input.disabled).toBe(true)

    act(() => vi.advanceTimersByTime(1800))
    expect(submitted).toHaveBeenCalledWith(false)
    expect(mount.querySelector('[data-testid="ordered-state"]')?.textContent).toBe('0:repair')
    input = mount.querySelector<HTMLInputElement>('input')!
    expect(input.value).toBe('')
    expect(input.disabled).toBe(false)

    act(() => typeInto(input, 'Oslo'))
    act(() => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    act(() => vi.advanceTimersByTime(500))

    expect(submitted).toHaveBeenLastCalledWith(true)
    expect(mount.querySelector('[data-testid="ordered-state"]')?.textContent).toBe('1:repair')
  })
})
