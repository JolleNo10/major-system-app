// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { MapSurface } from './MapSurface'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('MapSurface expanded presentation', () => {
  it('provides one expand/collapse control while preserving map and dock content', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(MapSurface, {
            context: createElement('span', null, 'prompt context'),
            map: createElement('span', null, 'map content'),
            dock: createElement('span', null, 'answer dock'),
          }),
        ),
      ))
      await Promise.resolve()
    })

    expect(mount.querySelectorAll('[aria-label="Expand map"]')).toHaveLength(1)
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('standard')
    expect(mount.textContent).toContain('map content')
    expect(mount.textContent).toContain('answer dock')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelectorAll('[aria-label="Collapse map"]')).toHaveLength(1)
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('expanded-center')
    expect(mount.querySelector('[data-map-surface]')?.getAttribute('data-map-surface-presentation')).toBe('expanded')
    expect(mount.textContent).toContain('prompt context')
    expect(mount.textContent).toContain('map content')
    expect(mount.textContent).toContain('answer dock')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Collapse map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('standard')
  })

  it('clears the expanded page presentation when the common surface leaves', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(SurfaceMountHarness),
      ))
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('expanded-center')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-remove-surface]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('standard')
  })
})

function SurfaceMountHarness() {
  const [mounted, setMounted] = useState(true)
  return createElement(PageLayout, null,
    createElement('button', { type: 'button', 'data-remove-surface': true, onClick: () => setMounted(false) }, 'Remove'),
    mounted ? createElement(MapSurface, {
      context: createElement('span', null, 'prompt context'),
      map: createElement('span', null, 'map content'),
    }) : createElement('span', null, 'surface removed'),
  )
}
