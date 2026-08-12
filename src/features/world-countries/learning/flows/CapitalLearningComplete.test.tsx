// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CapitalLearningComplete } from './CapitalLearningComplete'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('CapitalLearningComplete', () => {
  it('keeps Capital-specific completion wording while using shared actions', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(CapitalLearningComplete, {
        subregion: 'balkans',
        onDone: () => undefined,
        onRestart: () => undefined,
      }))
    })

    expect(mount.textContent).toContain('Capitals learned')
    expect(mount.textContent).toContain('capitals complete')
    expect(mount.textContent).toContain('clean shuffled round')
    expect(mount.textContent).toContain('Back to Learn & Practise')
    expect(mount.textContent).toContain('Learn again')
  })
})
