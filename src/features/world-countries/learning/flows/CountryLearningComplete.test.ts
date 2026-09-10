// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CountryLearningComplete } from './CountryLearningComplete'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('CountryLearningComplete', () => {
  it('describes durable Country Learning as learned without claiming mastery', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningComplete, {
        subregion: 'balkans',
        countryCount: 5,
        onDone: () => undefined,
        onRestart: () => undefined,
      }))
    })

    expect(mount.textContent).toContain('Countries learned')
    expect(mount.textContent).toContain('Balkans countries learned ✓')
    expect(mount.textContent).toContain('You can now locate and recall all 5 countries')
    expect(mount.textContent).not.toContain('mastery')
  })

  it('explains that a proficiency scope does not change guided region progress', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningComplete, {
        scopeLabel: 'Proficiency scope',
        countryCount: 2,
        onDone: () => undefined,
        onRestart: () => undefined,
      }))
    })

    expect(mount.textContent).toContain('Learning complete')
    expect(mount.textContent).toContain("doesn't change your guided region progress")
    expect(mount.textContent).not.toContain('Countries learned')
  })
})
