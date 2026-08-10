// @vitest-environment jsdom

import { act, createElement, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { PageLayout } from './PageLayout'
import { PageLayoutProvider, useLayoutHeader, useRails } from './PageLayoutContext'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('PageLayout slot registration', () => {
  it('does not recurse when a publisher recreates a dependency every render', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(StrictMode, null,
        createElement(PageLayoutProvider, null,
          createElement(PageLayout, null,
            createElement(UnstableRailPublisher),
          ),
        ),
      ))
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('unstable rail')
    expect(mount.textContent).toContain('unstable header')
  })
})

function UnstableRailPublisher() {
  const recreatedDependency = () => undefined
  useRails(
    { left: <span>unstable rail</span> },
    [recreatedDependency],
  )
  useLayoutHeader(<span>unstable header</span>, [recreatedDependency])
  return null
}
