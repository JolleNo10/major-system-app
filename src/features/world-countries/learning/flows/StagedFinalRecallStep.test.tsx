// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { createOrderedRecallSession } from '@/features/world-countries/learning/orderedRecallSession'
import { StagedFinalRecallStep } from './StagedFinalRecallStep'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => createElement('div', { 'data-testid': 'country-learning-map' }),
}))

const country: Country = {
  id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe',
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
      root.render(createElement(StagedFinalRecallStep, {
        continent: 'Europe', entries: [country],
        ordered: createOrderedRecallSession({ order: [country.id], rewindOnError: 1 }),
        stepLabel: 'Final recall', answerLabel: 'Country → Capital',
        placeholder: 'Type the capital…', showCountryName: true,
        evaluateAnswer: () => ({ correct: true, fuzzyMatch: true, canonicalAnswer: country.capital }),
        formatFeedback: evaluation => `Correct. The canonical answer is ${evaluation.canonicalAnswer}.`,
        onSubmit, onBack: vi.fn(), onExit: vi.fn(), surface: true,
      }))
    })

    const input = mount.querySelector<HTMLInputElement>('input')!
    act(() => typeInto(input, 'Oslos'))
    act(() => mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

    expect(input.disabled).toBe(true)
    expect(mount.textContent).toContain('The canonical answer is Oslo.')

    act(() => vi.advanceTimersByTime(1800))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(input.disabled).toBe(true)

    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())
    const miniPractice = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(miniPractice).not.toBeNull()
    act(() => miniPractice.querySelector<HTMLButtonElement>('[data-mini-spelling-action="return"]')?.click())

    expect(onSubmit).not.toHaveBeenCalled()
    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click())
    expect(onSubmit).toHaveBeenCalledWith(true)
  })
})
