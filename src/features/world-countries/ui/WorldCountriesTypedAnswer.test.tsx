// @vitest-environment jsdom

import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerEvaluation,
  type WorldCountriesTypedAnswerRenderState,
} from './WorldCountriesTypedAnswer'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.useRealTimers()
})

function evaluationFor(answer: string): WorldCountriesTypedAnswerEvaluation {
  if (answer === 'fuzzy') return { outcome: 'fuzzy', canonicalAnswer: 'Norway', answerKind: 'country', message: 'Correct. The canonical answer is Norway.' }
  if (answer === 'Norway') return { outcome: 'exact', canonicalAnswer: 'Norway', answerKind: 'country', message: 'Correct.' }
  return { outcome: 'incorrect', canonicalAnswer: 'Norway', answerKind: 'country', message: 'The correct country is Norway.' }
}

function typeInto(input: HTMLInputElement, value: string): void {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function renderAnswer(
  mount: HTMLElement,
  props: Partial<Omit<ComponentProps<typeof WorldCountriesTypedAnswer>, 'children'>> = {},
  onAnswer = vi.fn(),
  onTransition = vi.fn(),
) {
  root = createRoot(mount)
  act(() => root?.render(createElement(WorldCountriesTypedAnswer, {
      promptKey: 'NO-country',
      answerLabel: 'Type the country name',
      placeholder: 'Type the country…',
      correctAnswer: 'Norway',
      evaluate: evaluationFor,
      onAnswer,
      onTransition,
      ...props,
      children: (state: WorldCountriesTypedAnswerRenderState): ReactNode => createElement('div', null,
      state.feedback,
      state.input,
      state.fuzzyControls,
      state.isAnswerable && createElement('button', { type: 'button', onClick: state.reveal, 'data-testid': 'reveal' }, 'Reveal'),
      ),
    })))
  return { onAnswer, onTransition }
}

describe('WorldCountriesTypedAnswer', () => {
  it('submits through the native form once and auto-transitions after exact feedback', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    document.body.append(mount)
    const { onAnswer, onTransition } = renderAnswer(mount)
    const input = mount.querySelector<HTMLInputElement>('input')!

    expect(input.getAttribute('aria-label')).toBe('Type the country name')
    typeInto(input, 'Norway')
    const submit = () => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    act(() => {
      submit()
      submit()
    })

    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(input.disabled).toBe(true)
    act(() => vi.advanceTimersByTime(499))
    expect(onTransition).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onTransition).toHaveBeenCalledTimes(1)
    expect(onTransition).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'exact' }))
  })

  it('holds incorrect feedback for the correction dwell before transition', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    document.body.append(mount)
    const { onTransition } = renderAnswer(mount)
    const input = mount.querySelector<HTMLInputElement>('input')!

    typeInto(input, 'Sweden')
    act(() => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(input.disabled).toBe(true)
    expect(mount.textContent).toContain('The correct country is Norway.')
    act(() => vi.advanceTimersByTime(1799))
    expect(onTransition).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onTransition).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'incorrect' }))
  })

  it('keeps fuzzy remediation active until its explicit continuation', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    document.body.append(mount)
    const { onTransition } = renderAnswer(mount)
    const input = mount.querySelector<HTMLInputElement>('input')!

    typeInto(input, 'fuzzy')
    act(() => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    act(() => vi.advanceTimersByTime(1800))
    expect(onTransition).not.toHaveBeenCalled()
    expect(mount.querySelector('[data-fuzzy-spelling-action="continue"]')).not.toBeNull()
    act(() => {
      mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click()
      mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click()
    })
    expect(onTransition).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'fuzzy' }))
    expect(onTransition).toHaveBeenCalledTimes(1)
  })

  it('resets and refocuses the same prompt after an incorrect retry dwell', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    document.body.append(mount)
    renderAnswer(mount, { retryOnIncorrect: true })
    const input = mount.querySelector<HTMLInputElement>('input')!

    typeInto(input, 'Sweden')
    act(() => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    act(() => vi.advanceTimersByTime(1800))
    const retryInput = mount.querySelector<HTMLInputElement>('input')!
    expect(retryInput.value).toBe('')
    expect(retryInput.disabled).toBe(false)
    expect(document.activeElement).toBe(retryInput)
  })

  it('clears answer state when the owner changes the prompt key', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    renderAnswer(mount)
    const input = mount.querySelector<HTMLInputElement>('input')!
    typeInto(input, 'Sweden')

    act(() => root?.render(createElement(WorldCountriesTypedAnswer, {
        promptKey: 'SE-country',
        answerLabel: 'Type the country name',
        placeholder: 'Type the country…',
        correctAnswer: 'Sweden',
        evaluate: evaluationFor,
        onAnswer: vi.fn(),
        onTransition: vi.fn(),
        children: (state: WorldCountriesTypedAnswerRenderState) => createElement('div', null, state.input),
      })))

    expect(mount.querySelector<HTMLInputElement>('input')?.value).toBe('')
  })

  it('supports reveal as an automatic revealed-feedback transition', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    document.body.append(mount)
    const { onTransition } = renderAnswer(mount, {
      reveal: { canonicalAnswer: 'Norway', answerKind: 'country', message: 'Answer: Norway' },
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="reveal"]')?.click())
    expect(mount.textContent).toContain('Answer: Norway')
    act(() => vi.advanceTimersByTime(1799))
    expect(onTransition).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onTransition).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'revealed' }))
  })

  it('cancels a pending automatic transition when the seam unmounts', () => {
    vi.useFakeTimers()
    const mount = document.createElement('div')
    document.body.append(mount)
    const { onTransition } = renderAnswer(mount)
    const input = mount.querySelector<HTMLInputElement>('input')!

    typeInto(input, 'Norway')
    act(() => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    act(() => root?.unmount())
    act(() => vi.advanceTimersByTime(500))

    expect(onTransition).not.toHaveBeenCalled()
  })
})
