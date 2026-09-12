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

    const message = mount.querySelector('[data-task-dock-message]')
    expect(message?.querySelector('[data-task-dock-message-header]')?.textContent).toContain('Set 1 ready')
    expect(message?.querySelector('[data-task-dock-message-description]')?.textContent).toContain('You can now locate and name the countries in this Set.')
    expect(message?.querySelector('[data-task-dock-message-description]')?.textContent).toContain('Next: meet the countries in Set 2.')
    expect(message?.querySelector('[data-task-dock-message-description]')?.textContent).not.toContain('Next: Continue to Set 2')
    expect(message?.querySelector('[data-task-dock-message-description]')?.textContent).not.toContain('threshold')
    expect(message?.querySelector('[data-task-dock-message-actions]')?.querySelectorAll('button')).toHaveLength(3)
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
    const message = mount.querySelector('[data-task-dock-message]')
    const status = message?.querySelector('[data-task-dock-message-description]')?.textContent
    expect(message?.querySelector('[data-task-dock-message-header]')?.textContent).toContain('Final recall')
    expect(status).toContain("Try the full recall when you're ready.")
    expect(status).toContain('You can start now, or go back for more practice.')
    expect(status).not.toMatch(/region|full-region/i)
    expect(status).not.toMatch(/completion gate|learning flow|effective country order/i)
    expect(status).not.toContain('before starting')
    expect(mount.querySelector('[data-task-dock-message-actions]')?.querySelectorAll('button')).toHaveLength(2)

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
    const message = mount.querySelector('[data-task-dock-message]')
    const status = message?.querySelector('[data-task-dock-message-description]')?.textContent
    expect(message?.querySelector('[data-task-dock-message-header]')?.textContent).toContain('Final recall')
    expect(status).toContain("One last pass through everything you've been learning.")
    expect(status).toContain('Recall the whole Learning order from start to finish.')
    expect(status).not.toMatch(/region|full-region/i)
    expect(status).not.toMatch(/completion gate|learning flow|effective country order/i)
    expect(mount.querySelector('[data-task-dock-message-actions]')?.querySelectorAll('button')).toHaveLength(3)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
