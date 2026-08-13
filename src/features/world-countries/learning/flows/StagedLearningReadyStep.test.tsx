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
        title: 'Set 1 Ready', summary: 'Every Country is ready.', nextLabel: 'Continue to Set 2',
        onNext, onKeepPractising: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
      }))
    })

    expect(mount.querySelector('[role="status"]')?.textContent).toContain('Every Country is ready.')
    expect(document.activeElement?.textContent).toBe('Continue to Set 2')

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('focuses Final recall even when the gate is not Ready', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(FinalRecallGate, {
        ready: false, onStart: vi.fn(), onKeepPractising: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
      }))
    })

    expect(document.activeElement?.textContent).toBe('Final recall')
    expect(mount.querySelector('[role="status"]')?.textContent).toContain('Final recall')
  })
})
