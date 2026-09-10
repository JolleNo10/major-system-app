// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CapitalLearningComplete } from './CapitalLearningComplete'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('CapitalLearningComplete', () => {
  it('describes durable Capital Learning as capitals added without claiming Master region', () => {
    const onDone = vi.fn()
    const onRestart = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CapitalLearningComplete, {
        subregion: 'balkans',
        onDone,
        onRestart,
      }))
    })

    expect(mount.textContent).toContain('Capitals added')
    expect(mount.textContent).not.toContain('Capitals established')
    expect(mount.textContent).toContain("You've added the country–capital associations")
    expect(mount.textContent).not.toContain('Master region')
    expect(mount.textContent).toContain('Back to Learn & Practise')
    expect(mount.textContent).toContain('Learn again')

    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Back to Learn & Practise'))?.click())
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Learn again')?.click())
    expect(onDone).toHaveBeenCalledOnce()
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('forwards a supplied guided handoff without changing the completion actions', () => {
    const onDone = vi.fn()
    const onContinue = vi.fn()
    const onRestart = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CapitalLearningComplete, {
        subregion: 'balkans',
        onDone,
        onRestart,
        completionHandoff: {
          description: 'Next: continue with the guided plan.',
          label: 'Continue with the plan',
          onContinue,
        },
      }))
    })

    expect(mount.textContent).toContain('Next: continue with the guided plan.')
    expect(mount.textContent).toContain('Continue with the plan')
    act(() => mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click())
    expect(onContinue).toHaveBeenCalledOnce()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('keeps temporary proficiency completion explicitly non-milestone', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CapitalLearningComplete, {
        scopeLabel: 'Proficiency scope',
        onDone: () => undefined,
        onRestart: () => undefined,
      }))
    })

    expect(mount.textContent).toContain('Learning complete')
    expect(mount.textContent).toContain('does not establish a Subregion Learning milestone')
    expect(mount.textContent).not.toContain('Countries established')
    expect(mount.textContent).not.toContain('Capitals established')
    expect(mount.textContent).not.toContain('Capitals added')
  })
})
