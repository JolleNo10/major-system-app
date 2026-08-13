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
  it('shows the completed subregion country count', async () => {
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

    expect(mount.textContent).toContain('country #5')
    expect(mount.textContent).not.toContain('country #N')
  })

  it('explains that a proficiency scope does not create a Subregion milestone', async () => {
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

    expect(mount.textContent).toContain('does not count as a learned Subregion')
  })
})
