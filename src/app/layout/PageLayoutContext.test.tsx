// @vitest-environment jsdom

import { act, createElement, StrictMode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { PageLayout } from './PageLayout'
import {
  PageLayoutProvider,
  useLayoutHeader,
  usePageLayoutPresentation,
  useRails,
} from './PageLayoutContext'

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

  it('suppresses rail presentation while expanded and restores it after collapse', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PresentationHarness),
      ))
      await Promise.resolve()
    })

    const stats = [...mount.querySelectorAll('button')].find(button => button.textContent?.includes('Stats'))
    expect(stats).not.toBeUndefined()
    await act(async () => {
      stats?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[role="dialog"]')).not.toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-presentation-toggle]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('expanded-center')
    expect(mount.querySelector('[role="dialog"]')).toBeNull()
    expect([...mount.querySelectorAll('button')].some(button => button.textContent?.includes('Stats'))).toBe(false)
    expect(mount.textContent).toContain('center content')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-presentation-toggle]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('standard')
    expect([...mount.querySelectorAll('button')].some(button => button.textContent?.includes('Stats'))).toBe(true)
    expect(mount.querySelector('[role="dialog"]')).toBeNull()
  })

  it('clears expanded presentation when its publisher unmounts', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(CleanupHarness),
      ))
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('expanded-center')
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-remove-publisher]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('standard')
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

function PresentationHarness() {
  const [expanded, setExpanded] = useState(false)
  usePageLayoutPresentation(expanded ? 'expanded-center' : 'standard', [expanded])
  useRails({ left: <span>left rail</span>, right: <span>right rail</span> }, [])
  return createElement('div', null,
    createElement('button', { type: 'button', 'data-presentation-toggle': true, onClick: () => setExpanded(value => !value) }, expanded ? 'Collapse' : 'Expand'),
    createElement(PageLayout, null, createElement('span', null, 'center content')),
  )
}

function CleanupHarness() {
  const [published, setPublished] = useState(true)
  return createElement('div', null,
    createElement('button', { type: 'button', 'data-remove-publisher': true, onClick: () => setPublished(false) }, 'Remove publisher'),
    published ? createElement(PresentationPublisher) : null,
    createElement(PageLayout, null, createElement('span', null, 'center content')),
  )
}

function PresentationPublisher() {
  usePageLayoutPresentation('expanded-center', [])
  return null
}
