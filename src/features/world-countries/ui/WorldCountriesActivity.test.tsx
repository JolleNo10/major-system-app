// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { WorldCountriesMapActivitySurface } from './WorldCountriesActivity'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('World Countries active map-task presentation', () => {
  it('uses one semantic task input for standard and expanded composition', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(WorldCountriesMapActivitySurface, {
            task: {
              direction: 'Country → Capital',
              cue: 'Capital of Norway',
              answerKind: 'capital',
              sessionContext: 'Europe · Practice',
              reviewReason: 'Spaced review',
              progress: { label: 'Country', current: 2, total: 5, percent: 40 },
            },
            map: createElement('span', { 'data-map-content': true }, 'map'),
            dock: createElement('span', { 'data-dock-content': true }, 'answer'),
          }),
        ),
      ))
      await Promise.resolve()
    })

    const map = mount.querySelector('[data-map-surface-map]')
    const task = mount.querySelector('[data-world-countries-task]')
    expect(task?.textContent).toBe('Country → CapitalCapital of Norway')
    expect(mount.querySelector('[data-world-countries-task-context]')).toBeNull()
    expect(mount.querySelector('[data-world-countries-task-progress]')).toBeNull()
    expect(mount.querySelectorAll('[data-world-countries-task-cue]')).toHaveLength(1)

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-world-countries-task]')).toBe(task)
    expect(mount.querySelector('[data-world-countries-task-context]')?.textContent).toBe('Europe · Practice')
    expect(mount.querySelector('[data-world-countries-task-reason]')?.textContent).toContain('Why now')
    expect(mount.querySelector('[data-world-countries-task-reason]')?.textContent).toContain('Spaced review')
    expect(mount.querySelector('[data-world-countries-task-progress]')?.textContent).toContain('Country 2 / 5')
    expect(mount.querySelector('[data-world-countries-task-progress]')?.textContent).toContain('40%')
    expect(mount.querySelector('[data-map-surface-map]')).toBe(map)
    expect(mount.querySelectorAll('[data-world-countries-task-cue]')).toHaveLength(1)

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Collapse map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-world-countries-task-context]')).toBeNull()
    expect(mount.querySelector('[data-world-countries-task-progress]')).toBeNull()
    expect(mount.querySelector('[data-map-surface-map]')).toBe(map)
  })

  it('omits a progress card when the workflow supplies no meaningful progress', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(WorldCountriesMapActivitySurface, {
            task: { direction: 'Location → Country', cue: 'Find the Country' },
            map: createElement('span', null, 'map'),
          }),
        ),
      ))
      await Promise.resolve()
    })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-world-countries-task-progress]')).toBeNull()
  })
})
