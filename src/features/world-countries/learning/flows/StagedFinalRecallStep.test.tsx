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
  it('keeps fuzzy spelling feedback visible while allowing the next answer', () => {
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

    act(() => vi.advanceTimersByTime(500))

    expect(onSubmit).toHaveBeenCalledWith(true)
    expect(input.disabled).toBe(false)
    expect(mount.textContent).toContain('The canonical answer is Oslo.')
    act(() => typeInto(input, 'Stockholm'))
    expect(input.value).toBe('Stockholm')

    act(() => vi.advanceTimersByTime(1299))
    expect(mount.textContent).toContain('The canonical answer is Oslo.')
    act(() => vi.advanceTimersByTime(1))
    expect(mount.textContent).not.toContain('The canonical answer is Oslo.')
  })
})
