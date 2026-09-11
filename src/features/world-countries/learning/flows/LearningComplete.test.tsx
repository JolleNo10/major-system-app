// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LearningComplete } from './LearningComplete'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('LearningComplete', () => {
  it('publishes completion copy and the two workflow actions', () => {
    const onDone = vi.fn()
    const onRestart = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(LearningComplete, {
        eyebrow: 'Countries learned',
        title: 'Northern Europe complete ✓',
        summary: 'Country completion summary',
        onDone,
        onRestart,
      }))
    })

    expect(mount.querySelector('h1')?.textContent).toBe('Northern Europe complete ✓')
    expect(mount.textContent).toContain('Country completion summary')
    expect(mount.textContent).not.toContain('map remains available')
    expect(mount.querySelectorAll('button')).toHaveLength(2)
    expect(mount.textContent).toContain('Back to Learn & Practise')
    expect(mount.textContent).toContain('Learn again')
  })

  it('uses a supplied guided handoff for the primary action while keeping restart secondary', () => {
    const onDone = vi.fn()
    const onContinue = vi.fn()
    const onRestart = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(LearningComplete, {
        eyebrow: 'Countries learned',
        title: 'Northern Europe countries learned ✓',
        summary: 'Country completion summary',
        onDone,
        onRestart,
        completionHandoff: {
          description: 'Next: add the capitals to these countries.',
          label: 'Add the capitals',
          onContinue,
        },
      }))
    })

    expect(mount.textContent).toContain('Next: add the capitals to these countries.')
    expect(mount.textContent).toContain('Add the capitals')
    act(() => mount.querySelector('[data-primary-action]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onContinue).toHaveBeenCalledOnce()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('supports a caller-supplied stopping action beside a guided handoff', () => {
    const onStop = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(LearningComplete, {
        eyebrow: 'Region learned',
        title: 'Northern Europe ✓',
        summary: 'Region completion summary',
        onDone: vi.fn(),
        onRestart: vi.fn(),
        completionHandoff: {
          description: 'Next region: Western Europe',
          label: 'Start Western Europe',
          onContinue: vi.fn(),
          stopLabel: 'Back to Europe',
          onStop,
        },
      }))
    })

    expect(mount.querySelectorAll('button')).toHaveLength(3)
    expect(mount.textContent).toContain('Back to Europe')
    expect(mount.textContent).toContain('Learn again')
    act(() => mount.querySelector<HTMLButtonElement>('[data-completion-stop]')?.click())
    expect(onStop).toHaveBeenCalledOnce()
  })

  it('replaces restart with the completed-region action for a learned region', () => {
    const onAction = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(LearningComplete, {
        eyebrow: 'Capitals learned',
        title: 'Eastern Europe capitals learned',
        summary: 'Capital completion summary',
        onDone: vi.fn(),
        onRestart: vi.fn(),
        completionHandoff: {
          description: 'Next region: Northern Europe',
          label: 'Start Northern Europe',
          onContinue: vi.fn(),
          stopLabel: 'Back to Europe',
          onStop: vi.fn(),
        },
        regionCompletion: { masteryStatus: 'building' },
        regionLabel: 'Eastern Europe',
        completedRegionAction: { label: 'Drill Eastern Europe', onAction },
      }))
    })

    expect(mount.textContent).not.toContain('Learn again')
    expect(mount.textContent).toContain('Start Northern Europe')
    expect(mount.textContent).toContain('Back to Europe')
    expect(mount.textContent).toContain('Drill Eastern Europe')
    expect(mount.querySelectorAll('button')).toHaveLength(3)

    act(() => mount.querySelector<HTMLButtonElement>('[data-completion-region-action]')?.click())
    expect(onAction).toHaveBeenCalledOnce()
  })
})
