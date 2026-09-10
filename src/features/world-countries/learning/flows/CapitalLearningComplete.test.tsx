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
  it('describes durable Capital Learning as established without claiming Master region', () => {
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

    expect(mount.textContent).toContain('Capitals established')
    expect(mount.textContent).toContain('The country-capital layer is established')
    expect(mount.textContent).not.toContain('Master region')
    expect(mount.textContent).toContain('Back to Learn & Practise')
    expect(mount.textContent).toContain('Learn again')
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
    expect(mount.textContent).not.toContain('Capitals established')
  })
})
