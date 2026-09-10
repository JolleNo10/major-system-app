// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinalRecallGate, StagedLearningReadyStep } from './StagedLearningReadyStep'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('Learning Ready task dock behavior', () => {
  it('announces readiness, focuses the primary action, and lets Enter continue', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onNext = vi.fn()
    act(() => {
      root = createRoot(mount)
      root.render(createElement(StagedLearningReadyStep, {
        title: 'Set 1 ready', summary: 'You can now locate and name the countries in this Set.', nextDescription: 'Next: meet the countries in Set 2.', nextLabel: 'Continue to Set 2',
        onNext, onKeepPractising: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
      }))
    })

    expect(mount.querySelector('[role="status"]')?.textContent).toContain('You can now locate and name the countries in this Set.')
    expect(mount.querySelector('[role="status"]')?.textContent).toContain('Next: meet the countries in Set 2.')
    expect(mount.querySelector('[role="status"]')?.textContent).not.toContain('Next: Continue to Set 2')
    expect(mount.querySelector('[role="status"]')?.textContent).not.toContain('threshold')
    expect(document.activeElement?.textContent).toContain('Continue to Set 2')

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('focuses Final recall even when the gate is not Ready', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onStart = vi.fn()
    act(() => {
      root = createRoot(mount)
      root.render(createElement(FinalRecallGate, {
        ready: false, onStart, onKeepPractising: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
      }))
    })

    expect(document.activeElement?.textContent).toContain('Start final recall')
    const status = mount.querySelector('[role="status"]')?.textContent
    expect(status).toContain('Final recall')
    expect(status).toContain("Try the full recall when you're ready.")
    expect(status).toContain('You can start now, or go back for more practice.')
    expect(status).not.toMatch(/region|full-region/i)
    expect(status).not.toMatch(/completion gate|learning flow|effective country order/i)
    expect(status).not.toContain('before starting')

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('uses learner-facing copy for a ready Final recall gate', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onStart = vi.fn()
    act(() => {
      root = createRoot(mount)
      root.render(createElement(FinalRecallGate, {
        ready: true, onStart, onKeepPractising: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
      }))
    })

    expect(document.activeElement?.textContent).toContain('Start final recall')
    const status = mount.querySelector('[role="status"]')?.textContent
    expect(status).toContain('Final recall')
    expect(status).toContain("One last pass through everything you've been learning.")
    expect(status).toContain('Recall the whole Learning order from start to finish.')
    expect(status).not.toMatch(/region|full-region/i)
    expect(status).not.toMatch(/completion gate|learning flow|effective country order/i)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
