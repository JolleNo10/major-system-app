// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { StagedWalkthroughStep } from './StagedWalkthroughStep'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function renderStep(index: number, onMove = vi.fn(), onContinue = vi.fn()): HTMLElement {
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(StagedWalkthroughStep, {
      entries, index, onMove, onContinue, continueLabel: 'Continue to Locate',
    }))
  })
  return mount
}

describe('StagedWalkthroughStep navigation', () => {
  it('disables Previous on the first item and advances with Next', () => {
    const onMove = vi.fn()
    const mount = renderStep(0, onMove)
    const previous = mount.querySelector<HTMLButtonElement>('button:not([data-primary-action])')
    const next = mount.querySelector<HTMLButtonElement>('[data-primary-action]')

    expect(previous?.disabled).toBe(true)
    act(() => next?.click())
    expect(onMove).toHaveBeenCalledWith(1)
  })

  it('uses the final CTA instead of advancing beyond the last item', () => {
    const onMove = vi.fn()
    const onContinue = vi.fn()
    const mount = renderStep(1, onMove, onContinue)
    const previous = mount.querySelector<HTMLButtonElement>('button:not([data-primary-action])')
    const continueButton = mount.querySelector<HTMLButtonElement>('[data-primary-action]')

    expect(previous?.disabled).toBe(false)
    expect(continueButton?.textContent).toBe('Continue to Locate')
    act(() => continueButton?.click())
    expect(onContinue).toHaveBeenCalledOnce()
    expect(onMove).not.toHaveBeenCalled()
  })

  it('supports arrow navigation, preserves boundaries, and leaves editable controls alone', () => {
    const onMove = vi.fn()
    const mount = renderStep(0, onMove)

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })))
    expect(onMove).not.toHaveBeenCalled()
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })))
    expect(onMove).toHaveBeenCalledWith(1)

    onMove.mockClear()
    act(() => root?.render(createElement(StagedWalkthroughStep, {
      entries, index: 1, onMove, onContinue: vi.fn(), continueLabel: 'Continue to Practice',
    })))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })))
    expect(onMove).not.toHaveBeenCalled()

    const input = document.createElement('input')
    mount.append(input)
    input.focus()
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
    expect(onMove).not.toHaveBeenCalled()
  })
})
