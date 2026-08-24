// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { createSchedulerLearningSession } from '@/features/world-countries/learning/schedulerLearningSession'
import { SchedulerPracticeStep } from './SchedulerPracticeStep'
import { LearningMapSurface } from './LearningMapSurface'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => createElement('div', { 'data-testid': 'country-learning-map' }),
}))

const country: Country = {
  id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}
const settings = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }
let root: Root | null = null

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('SchedulerPracticeStep', () => {
  it('waits for explicit continuation after a fuzzy spelling answer', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    const onSubmit = vi.fn()
    document.body.append(mount)
    const session = { ...createSchedulerLearningSession([country.id], settings), currentKey: country.id }

    act(() => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, createElement(LearningMapSurface, {
        continent: 'Europe', scopeCountries: [country], presentation: { ariaLabel: 'Practice map' }, presentationKey: 'practice',
        context: createElement('h1', null, 'Practice'),
        children: createElement(SchedulerPracticeStep, {
        continent: 'Europe', entries: [country], session,
        stepLabel: 'Practice', questionLabel: 'Country name',
        questionTitle: 'Name the country', answerLabel: 'Type the country name',
        placeholder: 'Type the country…', showCountryName: false, answerKind: 'country', showMap: false,
        evaluateAnswer: () => ({ correct: true, fuzzyMatch: true, canonicalAnswer: country.country }),
        formatFeedback: evaluation => `Correct. The canonical answer is ${evaluation.canonicalAnswer}.`,
          onSubmit, onBack: vi.fn(), onExit: vi.fn(), surface: true,
        }),
      })))
    })

    const input = mount.querySelector<HTMLInputElement>('input')!
    act(() => typeInto(input, 'Noreway'))
    act(() => mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

    expect(input.disabled).toBe(true)
    expect(mount.textContent).toContain('Spelling: Norway')

    act(() => vi.advanceTimersByTime(1800))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(input.disabled).toBe(true)

    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())
    const miniPractice = mount.querySelector<HTMLElement>('[data-mini-spelling-practice]')!
    expect(miniPractice).not.toBeNull()

    expect(miniPractice.querySelector('[data-mini-spelling-action="return"]')).toBeNull()
    expect(onSubmit).not.toHaveBeenCalled()
    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())
    expect(mount.querySelector('[data-mini-spelling-practice]')).toBeNull()
    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click())
    expect(onSubmit).toHaveBeenCalledWith(true, expect.any(Number))
  })

  it('can render typed Combined practice without a map-location prompt', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const session = createSchedulerLearningSession([country.id], settings)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, createElement(SchedulerPracticeStep, {
        continent: 'Europe', entries: [country], session,
        stepLabel: 'Combined practice', questionLabel: 'Country name',
        questionTitle: 'Name the country', answerLabel: 'Type the country name',
        placeholder: 'Type the country…', showCountryName: false, answerKind: 'country', showMap: false,
        promptText: 'Name the country', evaluateAnswer: () => ({ correct: true, fuzzyMatch: false, canonicalAnswer: country.country }),
        formatFeedback: () => 'Correct.', onSubmit: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
      })))
    })

    expect(mount.textContent).toContain('Name the country')
    expect(mount.textContent).toContain('ANSWER · COUNTRY')
    expect(mount.querySelector('[data-answer-kind]')?.getAttribute('data-answer-kind')).toBe('country')
    expect(mount.querySelector('[data-testid="country-learning-map"]')).toBeNull()
  })

  it('keeps the scoped map mounted for Combined practice when hosted by the map surface', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const session = createSchedulerLearningSession([country.id], settings)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, createElement(LearningMapSurface, {
        continent: 'Europe', scopeCountries: [country], presentation: { ariaLabel: 'Test map' }, presentationKey: 'combined',
        context: createElement('h1', null, 'Combined practice'),
        children: createElement(SchedulerPracticeStep, {
          continent: 'Europe', entries: [country], session,
          stepLabel: 'Combined practice', questionLabel: 'Country name',
          questionTitle: 'Name the country', answerLabel: 'Type the country name',
          placeholder: 'Type the country…', showCountryName: false, answerKind: 'country', showMap: false, surface: true,
          promptText: 'Name the country', evaluateAnswer: () => ({ correct: true, fuzzyMatch: false, canonicalAnswer: country.country }),
          formatFeedback: () => 'Correct.', onSubmit: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
        }),
      })))
    })

    expect(mount.querySelector('[data-testid="country-learning-map"]')).not.toBeNull()
  })
})
