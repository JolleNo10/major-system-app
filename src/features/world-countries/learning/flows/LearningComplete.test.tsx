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
    expect(mount.querySelectorAll('button')).toHaveLength(2)
    expect(mount.textContent).toContain('Back to Subregion')
    expect(mount.textContent).toContain('Review again')
  })
})
