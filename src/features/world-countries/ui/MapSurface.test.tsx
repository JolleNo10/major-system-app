// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { Overlay } from '@/app/layout/Overlay'
import { MapSurface, TaskDock } from './MapSurface'
import { TaskDockMessage } from './TaskDockMessage'
import { SvgMapView } from '@/features/world-countries/maps/SvgMapView'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('MapSurface expanded presentation', () => {
  it('keeps one SVG viewport mounted while its surface presentation changes', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const svg = createElement('svg', { 'data-map-svg': true, viewBox: '0 0 100 50' })

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(MapSurface, {
            context: createElement('span', null, 'prompt context'),
            map: createElement('div', { className: 'world-map-svg' }, svg),
          }),
        ),
      ))
      await Promise.resolve()
    })

    const map = mount.querySelector('[data-map-surface-map]')
    const renderedSvg = map?.querySelector('[data-map-svg]')
    expect(renderedSvg).not.toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-map-surface]')?.getAttribute('data-map-surface-presentation')).toBe('expanded')
    expect(map?.querySelector('[data-map-svg]')).toBe(renderedSvg)

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Collapse map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-map-surface]')?.getAttribute('data-map-surface-presentation')).toBe('standard')
    expect(map?.querySelector('[data-map-svg]')).toBe(renderedSvg)
  })

  it('keeps the nested SvgMapView layout seam and transient states available', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><g><path id="Alpha" d="M 10 10 h 10 v 10 h -10 z"/><text id="Alpha_label">ALPHA</text></g></svg>',
    } as Response)
    const mapAdapter = createElement('div', { 'data-map-adapter': true },
      createElement(SvgMapView, { svgUrl: '/map.svg', ariaLabel: 'Test map' }),
    )

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(MapSurface, {
            context: createElement('span', null, 'prompt context'),
            map: mapAdapter,
            dockPlacement: 'stacked',
            dock: createElement('span', { 'data-journey-dock': true }, 'Journey dock'),
          }),
        ),
      ))
      await Promise.resolve()
      await Promise.resolve()
    })

    const map = mount.querySelector('[data-map-surface-map]')
    const renderedSvg = map?.querySelector('.world-map-svg svg')
    const mapViewport = map?.querySelector('.world-map-svg')
    expect(map?.querySelector('[data-svg-map-view]')).toBeNull()
    expect(mapViewport?.parentElement).toBe(map?.querySelector('[data-map-adapter]'))
    expect(renderedSvg).not.toBeNull()
    expect(map?.querySelector('[role="status"]')).toBeNull()
    expect(map?.querySelector('[role="alert"]')).toBeNull()
    const dock = mount.querySelector('[data-journey-dock]')
    // The dock sits directly in the surface body. A wrapper between the two
    // once let an expanded-only growth rule apply to it, which starved the map
    // of height and ballooned the dock to fill the rest of the screen.
    expect(dock?.closest('[data-map-surface-dock]')?.parentElement)
      .toBe(mount.querySelector('[data-map-surface-body]'))
    expect(dock?.closest('.world-map-svg')).toBeNull()
    expect(mapViewport).not.toBeNull()
    expect((mapViewport as HTMLElement | null)?.style.aspectRatio).toBe('')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    expect(map?.querySelector('[data-svg-map-view]')).toBeNull()
    expect(map?.querySelector('.world-map-svg svg')).toBe(renderedSvg)
    expect(renderedSvg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
    // The expanded box hugs the live camera instead of framing empty bars.
    expect((mapViewport as HTMLElement | null)?.style.aspectRatio).toBe('100 / 50')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Collapse map"]')?.click()
      await Promise.resolve()
    })
    expect(map?.querySelector('[data-svg-map-view]')).toBeNull()
    expect(map?.querySelector('.world-map-svg svg')).toBe(renderedSvg)
    expect(renderedSvg?.getAttribute('preserveAspectRatio')).toBeNull()
    expect((mapViewport as HTMLElement | null)?.style.aspectRatio).toBe('')
  })

  it('keeps the nested SvgMapView loading state available', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(MapSurface, {
            context: createElement('span', null, 'prompt context'),
            map: createElement('div', { 'data-map-adapter': true },
              createElement(SvgMapView, { svgUrl: '/map.svg', ariaLabel: 'Test map' }),
            ),
          }),
        ),
      ))
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-svg-map-view]')).toBeNull()
    expect(mount.textContent).toContain('Loading map…')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.textContent).toContain('Loading map…')
  })

  it('keeps the nested SvgMapView error state available', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('test map failure'))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(MapSurface, {
            context: createElement('span', null, 'prompt context'),
            map: createElement('div', { 'data-map-adapter': true },
              createElement(SvgMapView, { svgUrl: '/map.svg', ariaLabel: 'Test map' }),
            ),
          }),
        ),
      ))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-svg-map-view]')).toBeNull()
    expect(mount.querySelector('[role="alert"]')?.textContent).toBe('The map could not be loaded.')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[role="alert"]')?.textContent).toBe('The map could not be loaded.')
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
  it('keeps message content and actions in distinct composition regions', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(TaskDockMessage, {
        header: createElement('span', null, 'Ready'),
        description: createElement('span', null, 'Next step'),
        actions: createElement('button', { type: 'button' }, 'Continue'),
      }))
    })

    expect(mount.querySelector('[data-task-dock-message-header]')?.textContent).toBe('Ready')
    expect(mount.querySelector('[data-task-dock-message-description]')?.textContent).toBe('Next step')
    expect(mount.querySelector('[data-task-dock-message-actions] button')?.textContent).toBe('Continue')
    expect(mount.querySelector('[data-task-dock-message-description]')?.closest('[data-task-dock-message-actions]')).toBeNull()
    expect(mount.querySelector('[data-task-dock-message-actions]')?.previousElementSibling?.hasAttribute('data-task-dock-message-content')).toBe(true)
  })

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

  it.each([
    ['country', 'border-cyan-500/45'],
    ['capital', 'border-violet-500/45'],
  ] as const)('uses the %s answer accent for a form dock', (answerKind, borderClass) => {
    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(TaskDock, {
        variant: 'form',
        answerKind,
        children: createElement('span', null, 'answer input'),
      }))
    })

    expect(mount.querySelector('[data-task-dock]')?.className).toContain(borderClass)
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
