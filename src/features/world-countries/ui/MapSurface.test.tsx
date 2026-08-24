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
  it('composes an expanded-only companion beside the primary dock', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(MapSurface, {
            context: createElement('span', null, 'prompt context'),
            expandedContext: createElement('span', { 'data-expanded-context': true }, 'compact context'),
            map: createElement('span', null, 'map content'),
            feedbackOverlay: createElement('span', { 'data-feedback-content': true }, 'feedback'),
            dock: createElement('span', { 'data-primary-dock': true }, 'answer dock'),
            expandedCompanion: createElement('span', { 'data-companion-content': true }, 'session progress'),
          }),
        ),
      ))
      await Promise.resolve()
    })

    const map = mount.querySelector('[data-map-surface-map]')
    const dock = mount.querySelector('[data-primary-dock]')
    expect(mount.querySelector('[data-map-surface-companion]')).toBeNull()
    expect(mount.querySelector('[data-expanded-context]')).toBeNull()
    expect(mount.querySelector('[data-map-surface-map] [data-map-feedback-overlay-host] [data-feedback-content]')).not.toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })

    const row = mount.querySelector('[data-map-surface-dock-row]')
    expect(row?.contains(mount.querySelector('[data-map-surface-dock]'))).toBe(true)
    expect(row?.contains(mount.querySelector('[data-map-surface-companion]'))).toBe(true)
    expect(mount.querySelector('[data-companion-content]')?.textContent).toBe('session progress')
    expect(mount.querySelector('[data-expanded-context]')?.textContent).toBe('compact context')
    expect(mount.querySelector('[data-map-surface-map]')).toBe(map)
    expect(mount.querySelector('[data-primary-dock]')).toBe(dock)

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Collapse map"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-map-surface-companion]')).toBeNull()
    expect(mount.querySelector('[data-map-surface-map]')).toBe(map)
    expect(mount.querySelector('[data-primary-dock]')).toBe(dock)
  })

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
