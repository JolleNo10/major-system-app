// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { Overlay } from '@/app/layout/Overlay'
import { MapSurface, TaskDock } from './MapSurface'

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

  it('collapses on Escape while preserving the mounted map and dock content', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(MapSurface, {
            context: createElement('span', null, 'prompt context'),
            map: createElement('span', null, 'map content'),
            dock: createElement('span', { 'data-primary-dock': true }, 'answer dock'),
          }),
        ),
      ))
      await Promise.resolve()
    })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })

    const map = mount.querySelector('[data-map-surface-map]')
    const dock = mount.querySelector('[data-primary-dock]')
    expect(mount.querySelector('[data-map-surface]')?.getAttribute('data-map-surface-presentation')).toBe('expanded')
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('expanded-center')

    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    await act(async () => {
      window.dispatchEvent(escape)
      await Promise.resolve()
    })

    expect(escape.defaultPrevented).toBe(true)
    expect(mount.querySelector('[data-map-surface]')?.getAttribute('data-map-surface-presentation')).toBe('standard')
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('standard')
    expect(mount.querySelector('[data-map-surface-map]')).toBe(map)
    expect(mount.querySelector('[data-primary-dock]')).toBe(dock)
    expect(mount.textContent).toContain('map content')
    expect(mount.textContent).toContain('answer dock')
  })

  it('lets an active overlay own Escape without collapsing the expanded map', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(OverlayPriorityHarness),
        ),
      ))
      await Promise.resolve()
    })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    const map = mount.querySelector('[data-map-surface-map]')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-open-overlay]')?.click()
      await Promise.resolve()
    })
    const dialog = mount.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog).not.toBeNull()

    await act(async () => {
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })

    expect(mount.querySelector('[role="dialog"]')).toBeNull()
    expect(mount.querySelector('[data-map-surface]')?.getAttribute('data-map-surface-presentation')).toBe('expanded')
    expect(mount.querySelector('[data-page-layout]')?.getAttribute('data-page-layout-presentation')).toBe('expanded-center')
    expect(mount.querySelector('[data-map-surface-map]')).toBe(map)
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

describe('TaskDock content sizing', () => {
  it('allows complex checkpoint content to shrink inside its parent', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(TaskDock, {
        variant: 'checkpoint',
        contentSizing: 'contained',
        children: createElement('div', { 'data-complex-checkpoint': true }, 'checkpoint content'),
      }))
    })

    const content = mount.querySelector('[data-task-dock] > div > div')
    expect(content?.className).toContain('min-w-0')
    expect(content?.className).toContain('max-w-full')
    expect(content?.className).not.toContain('shrink-0')
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

function OverlayPriorityHarness() {
  const [open, setOpen] = useState(false)
  return createElement('div', null,
    createElement(MapSurface, {
      context: createElement('span', null, 'prompt context'),
      map: createElement('span', null, 'map content'),
      dock: createElement('span', null, 'answer dock'),
    }),
    createElement('button', { type: 'button', 'data-open-overlay': true, onClick: () => setOpen(true) }, 'Open overlay'),
    open ? createElement(Overlay, {
      onClose: () => setOpen(false),
      ariaLabel: 'Priority overlay',
      header: createElement('span', null, 'Overlay'),
      children: createElement('span', null, 'Overlay content'),
    }) : null,
  )
}
